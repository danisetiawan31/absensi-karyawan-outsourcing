import os
from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import numpy as np
from deepface import DeepFace
from services.face_service import process_face, decode_base64_image, DETECTOR_BACKEND

# Pydantic Model untuk request body
class EmbedRequest(BaseModel):
    foto: str = Field(..., description="Base64 encoded image string")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Memuat model DeepFace ke memory saat startup...")
    # Pre-load detector, FaceNet, dan model Anti-Spoofing dengan gambar dummy (hitam)
    # Ini menjamin model sudah ter-cache di memory (tidak lazy load pada request pertama)
    dummy_img = np.zeros((224, 224, 3), dtype=np.uint8)
    try:
        DeepFace.extract_faces(
            img_path=dummy_img, 
            detector_backend=DETECTOR_BACKEND, 
            anti_spoofing=True, 
            enforce_detection=False
        )
        DeepFace.represent(
            img_path=dummy_img, 
            model_name="Facenet", 
            detector_backend="skip", 
            enforce_detection=False
        )
        print("SUCCESS Model DeepFace berhasil dimuat ke memory.")
    except Exception as e:
        print(f"ERROR saat pre-load model: {e}")
        raise e
    
    yield
    print("Shutting down...")

app = FastAPI(title="Face Verification Service", lifespan=lifespan)

# Global Exception Handler untuk HTTPException
# Mengekstrak format `detail` custom kita supaya respon pas dengan API Contract tanpa properti "detail" terluar
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Seluruh HTTPException di aplikasi ini sudah distandarisasi ke format dict {"error": ...}
    return JSONResponse(status_code=exc.status_code, content=exc.detail)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    msg = ", ".join([f"{'.'.join(str(loc) for loc in err.get('loc', []))}: {err.get('msg', '')}" for err in errors])
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"Validasi request gagal: {msg}"
            }
        }
    )

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/internal/embed")
def embed_face(req: EmbedRequest):
    img = decode_base64_image(req.foto)
    return process_face(img)
