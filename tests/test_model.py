import cv2
import numpy as np
from ultralytics import YOLO
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.ergonomics import evaluate_ergonomics

def test_pipeline():
    print("Testing pipeline...")
    
    # 1. Initialize dummy image
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    print("Dummy image created.")
    
    # 2. Try loading YOLO model
    # Note: Using yolov8n-pose.pt
    try:
        model = YOLO("yolov8n-pose.pt")
        print("YOLOv8-Pose model loaded successfully.")
    except Exception as e:
        print(f"Error loading YOLO model: {e}")
        return False
        
    # 3. Inference on dummy image
    try:
        results = model(img, verbose=False)
        print("Inference on dummy image completed successfully.")
    except Exception as e:
        print(f"Error during inference: {e}")
        return False
        
    # 4. Try evaluating dummy keypoints
    try:
        # Mock 17 keypoints [x, y, conf]
        dummy_kp = np.zeros((17, 3))
        # Set shoulders and hips with high confidence but in upright position (normal/aman)
        # Shoulders (5, 6)
        dummy_kp[5] = [300, 150, 0.9]
        dummy_kp[6] = [340, 150, 0.9]
        # Hips (11, 12)
        dummy_kp[11] = [300, 300, 0.9]
        dummy_kp[12] = [340, 300, 0.9]
        # Knees (13, 14)
        dummy_kp[13] = [300, 400, 0.9]
        dummy_kp[14] = [340, 400, 0.9]
        # Ankles (15, 16)
        dummy_kp[15] = [300, 470, 0.9]
        dummy_kp[16] = [340, 470, 0.9]
        # Nose (0)
        dummy_kp[0] = [320, 100, 0.9]
        
        res = evaluate_ergonomics(dummy_kp)
        print("Ergonomic evaluation result:", res)
        assert res["risk_level"] == "AMAN", f"Expected AMAN for upright posture, got {res['risk_level']}"
        print("Ergonomic evaluation test passed!")
    except Exception as e:
        print(f"Error during ergonomic evaluation: {e}")
        return False
        
    print("All tests passed successfully!")
    return True

if __name__ == "__main__":
    test_pipeline()
