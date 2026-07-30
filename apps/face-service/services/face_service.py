import os
import base64
import numpy as np
import cv2
from fastapi import HTTPException
from deepface import DeepFace

# Menggunakan default 0.5 jika environment variable tidak diatur
LIVENESS_CONFIDENCE_THRESHOLD = float(os.getenv("LIVENESS_CONFIDENCE_THRESHOLD", "0.5"))

# Trade-off Detector: "mtcnn" dipilih karena opencv-python-headless versi terinstall 
# tidak menyertakan file haarcascade_frontalface_default.xml, menyebabkan crash meski foto valid.
DETECTOR_BACKEND = "mtcnn" 

# Trade-off Model: "Facenet" adalah standar industri yang cepat dengan dimensi 128 (atau Facenet512 untuk 512).
# Cukup akurat untuk keperluan absensi dan komputasinya tidak seberat VGG-Face.
MODEL_NAME = "Facenet"

def decode_base64_image(base64_str: str) -> np.ndarray:
    try:
        # Jika ada header base64 (e.g. data:image/jpeg;base64,), hapus headernya
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        
        img_data = base64.b64decode(base64_str)
        np_arr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Gambar tidak valid")
            
        return img
    except Exception:
        raise HTTPException(
            status_code=400, 
            detail={
                "error": {
                    "code": "FORMAT_FOTO_TIDAK_VALID", 
                    "message": "Format foto tidak valid atau tidak bisa didecode"
                }
            }
        )

def get_largest_face(faces: list):
    """Sort faces by bounding box area (w * h) and return the largest one."""
    def area(f):
        area_dict = f.get("facial_area", {})
        return area_dict.get("w", 0) * area_dict.get("h", 0)
    
    faces.sort(key=area, reverse=True)
    return faces[0]

def process_face(img: np.ndarray):
    try:
        # Extract faces with anti-spoofing enabled
        faces = DeepFace.extract_faces(
            img_path=img, 
            detector_backend=DETECTOR_BACKEND, 
            anti_spoofing=True, 
            enforce_detection=True
        )
    except ValueError as e:
        # DeepFace raises ValueError when enforce_detection=True and no face is found
        if "could not be detected" in str(e).lower() or "face could not be detected" in str(e).lower() or "face cannot be detected" in str(e).lower() or "detect face" in str(e).lower() or "face_detector" in str(e).lower() or len(str(e)) > 0:
            # Let's just enforce detection by catching the specific string if possible, 
            # actually DeepFace says "Face could not be detected in ...".
            # But wait, if it's the Torch error, the message is "You must install torch..."
            if "torch" in str(e).lower() or "opencv" in str(e).lower():
                raise HTTPException(
                    status_code=500, 
                    detail={"error": {"code": "INTERNAL_ERROR", "message": str(e)}}
                )
            
            raise HTTPException(
                status_code=422, 
                detail={
                    "error": {
                        "code": "WAJAH_TIDAK_TERDETEKSI", 
                        "message": "Wajah tidak terdeteksi pada foto"
                    }
                }
            )
        raise HTTPException(
            status_code=500, 
            detail={"error": {"code": "INTERNAL_ERROR", "message": str(e)}}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail={
                "error": {
                    "code": "INTERNAL_ERROR", 
                    "message": str(e)
                }
            }
        )
    
    if not faces:
        raise HTTPException(
            status_code=422, 
            detail={
                "error": {
                    "code": "WAJAH_TIDAK_TERDETEKSI", 
                    "message": "Wajah tidak terdeteksi pada foto"
                }
            }
        )

    # Opsi B: Jika terdeteksi lebih dari 1 wajah, ambil wajah paling dominan (terbesar)
    target_face = get_largest_face(faces)
    
    antispoof_score = target_face.get("antispoof_score", 0.0)
    is_live = bool(antispoof_score >= LIVENESS_CONFIDENCE_THRESHOLD)
    
    # Ambil koordinat wajah dominan
    area_dict = target_face.get("facial_area", {})
    x, y, w, h = area_dict.get("x", 0), area_dict.get("y", 0), area_dict.get("w", 0), area_dict.get("h", 0)
    
    # Pastikan koordinat tidak keluar dari batas image
    img_h, img_w = img.shape[:2]
    x, y = max(0, x), max(0, y)
    w = min(w, img_w - x)
    h = min(h, img_h - y)
    
    # Potong (crop) wajah asli untuk diekstrak embeddingnya
    orig_crop = img[y:y+h, x:x+w]
    
    try:
        # Extract embedding (lewatkan deteksi wajah lagi karena kita sudah memberikan potongan wajah)
        reps = DeepFace.represent(
            img_path=orig_crop, 
            model_name=MODEL_NAME, 
            detector_backend="skip",
            enforce_detection=False
        )
        embedding = reps[0]["embedding"]
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail={
                "error": {
                    "code": "INTERNAL_ERROR", 
                    "message": f"Gagal mengekstrak embedding: {str(e)}"
                }
            }
        )

    return {
        "embedding": embedding,
        "liveness": {
            "isLive": is_live,
            "confidence": antispoof_score
        }
    }
