import os
import base64
import pytest
from fastapi.testclient import TestClient
import numpy as np

from main import app
import services.face_service

client = TestClient(app)

def get_base64_image(file_name: str) -> str:
    path = os.path.join(os.path.dirname(__file__), "fixtures", file_name)
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def test_embed_1_face():
    """1. Foto valid 1 wajah jelas -> 200, embedding list of float, liveness is bool, confidence is float"""
    b64 = get_base64_image("1_face.jpg")
    response = client.post("/internal/embed", json={"foto": b64})
    assert response.status_code == 200
    data = response.json()
    assert "embedding" in data
    assert isinstance(data["embedding"], list)
    assert len(data["embedding"]) > 0
    assert isinstance(data["embedding"][0], float)
    
    assert "liveness" in data
    assert isinstance(data["liveness"]["isLive"], bool)
    assert isinstance(data["liveness"]["confidence"], float)

def test_embed_no_face():
    """2. Foto tanpa wajah -> 422 WAJAH_TIDAK_TERDETEKSI"""
    b64 = get_base64_image("no_face.jpg")
    response = client.post("/internal/embed", json={"foto": b64})
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "WAJAH_TIDAK_TERDETEKSI"

def test_embed_multiple_faces():
    """3. Foto dengan 2+ wajah -> tetap 200 (diambil yang terbesar)"""
    b64 = get_base64_image("multi_face.jpg")
    response = client.post("/internal/embed", json={"foto": b64})
    assert response.status_code == 200
    data = response.json()
    assert "embedding" in data
    assert len(data["embedding"]) > 0

def test_embed_invalid_base64():
    """4. Base64 corrupt/tidak bisa didecode -> 400 FORMAT_FOTO_TIDAK_VALID"""
    response = client.post("/internal/embed", json={"foto": "not_a_base64_string!@#"})
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "FORMAT_FOTO_TIDAK_VALID"

def test_embed_invalid_request_body():
    """5. Request body invalid (field foto hilang atau bukan string) -> 422 VALIDATION_ERROR"""
    # field hilang
    response1 = client.post("/internal/embed", json={})
    assert response1.status_code == 422
    assert response1.json()["error"]["code"] == "VALIDATION_ERROR"
    
    # bukan string
    response2 = client.post("/internal/embed", json={"foto": 12345})
    assert response2.status_code == 422
    assert response2.json()["error"]["code"] == "VALIDATION_ERROR"

def test_embed_liveness_threshold(monkeypatch):
    """6. Liveness threshold teruji secara terisolasi dengan mock antispoof_score dan env override."""
    # Monkeypatch env var
    monkeypatch.setenv("LIVENESS_CONFIDENCE_THRESHOLD", "0.8")
    
    # Karena face_service di-load saat import, kita patch variabel module-nya
    monkeypatch.setattr(services.face_service, "LIVENESS_CONFIDENCE_THRESHOLD", 0.8)
    
    def mock_extract_faces_low(*args, **kwargs):
        # Kembalikan dummy face info dengan score di bawah threshold
        return [{"face": np.zeros((10,10,3)), "facial_area": {"x":0,"y":0,"w":10,"h":10}, "antispoof_score": 0.7}]
        
    def mock_extract_faces_high(*args, **kwargs):
        # Kembalikan dummy face info dengan score di atas threshold
        return [{"face": np.zeros((10,10,3)), "facial_area": {"x":0,"y":0,"w":10,"h":10}, "antispoof_score": 0.9}]
    
    # Patch represent agar tidak error dan mengembalikan embedding dummy
    monkeypatch.setattr(services.face_service.DeepFace, "represent", lambda *args, **kwargs: [{"embedding": [0.1, 0.2]}])
    
    # Test Liveness Gagal (Score 0.7 < Threshold 0.8)
    monkeypatch.setattr(services.face_service.DeepFace, "extract_faces", mock_extract_faces_low)
    b64 = get_base64_image("1_face.jpg") # Gambar dummy karena udah di-mock
    res_low = client.post("/internal/embed", json={"foto": b64})
    assert res_low.status_code == 200
    assert res_low.json()["liveness"]["isLive"] == False
    assert res_low.json()["liveness"]["confidence"] == 0.7
    
    # Test Liveness Sukses (Score 0.9 >= Threshold 0.8)
    monkeypatch.setattr(services.face_service.DeepFace, "extract_faces", mock_extract_faces_high)
    res_high = client.post("/internal/embed", json={"foto": b64})
    assert res_high.status_code == 200
    assert res_high.json()["liveness"]["isLive"] == True
    assert res_high.json()["liveness"]["confidence"] == 0.9
