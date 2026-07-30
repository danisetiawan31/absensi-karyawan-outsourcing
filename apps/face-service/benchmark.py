import time
import cv2
from deepface import DeepFace

img = cv2.imread('tests/fixtures/1_face.jpg')
times = []

# Pemanasan / warmup supaya model diload ke memory (seperti di lifespan)
print("Warming up...")
DeepFace.extract_faces(img, detector_backend='mtcnn', anti_spoofing=True)

print("Mulai pengukuran...")
for i in range(5):
    t0 = time.time()
    DeepFace.extract_faces(img, detector_backend='mtcnn', anti_spoofing=True)
    elapsed = time.time() - t0
    times.append(elapsed)
    print(f"Run {i+1}: {elapsed:.3f}s")

print(f"Average: {sum(times)/len(times):.3f}s")
