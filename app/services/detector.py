import cv2
import numpy as np
import threading
import time
import os
import sys
from ultralytics import YOLO

# Add parent directory to path to import src.ergonomics
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from src.ergonomics import (
    evaluate_ergonomics,
    evaluate_running_behavior,
    evaluate_zone_intrusion
)
from app.services.sse_manager import sse_manager
from app.config import settings
from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory=settings.TEMPLATES_DIR)
templates.env.cache = None

class AppState:
    def __init__(self):
        self.lock = threading.Lock()
        self.active_source = "webcam"
        self.workers_data = []
        self.conf_threshold = 0.5
        self.is_running = True
        self.latest_frame = None

state = AppState()

# Helper function to draw keypoints and skeleton on frame
def draw_skeleton(frame, keypoints, risk_level, worker_id, conf_threshold=0.5, speed_label=None, is_zone_hazard=False):
    if risk_level == "AMAN":
        color_bgr = (113, 204, 46)   # Light Green in BGR
    elif risk_level == "WASPADA":
        color_bgr = (15, 196, 241)   # Yellow/Orange in BGR
    elif risk_level == "BAHAYA":
        color_bgr = (60, 76, 231)    # Red/Crimson in BGR
    else:
        color_bgr = (166, 165, 149)  # Gray in BGR
        
    connections = [
        (5, 6),       # shoulder-shoulder
        (5, 7), (7, 9),   # left arm
        (6, 8), (8, 10),  # right arm
        (11, 12),     # hip-hip
        (11, 13), (13, 15), # left leg
        (12, 14), (14, 16), # right leg
        (5, 11), (6, 12)    # torso side lines
    ]
    
    # Draw skeleton lines
    for p1, p2 in connections:
        if keypoints[p1][2] > conf_threshold and keypoints[p2][2] > conf_threshold:
            pt1 = (int(keypoints[p1][0]), int(keypoints[p1][1]))
            pt2 = (int(keypoints[p2][0]), int(keypoints[p2][1]))
            cv2.line(frame, pt1, pt2, color_bgr, 3)
            
    # Draw joint dots
    for idx, kp in enumerate(keypoints):
        if kp[2] > conf_threshold:
            if idx > 0 and idx < 5:
                continue
            pt = (int(kp[0]), int(kp[1]))
            cv2.circle(frame, pt, 5, (255, 255, 255), -1)
            cv2.circle(frame, pt, 6, color_bgr, 2)
            
    # Draw worker ID and risk label above head
    nose = keypoints[0]
    l_shoulder = keypoints[5]
    r_shoulder = keypoints[6]
    
    if nose[2] > conf_threshold:
        text_pos = (int(nose[0]), int(nose[1]) - 30)
    elif l_shoulder[2] > conf_threshold and r_shoulder[2] > conf_threshold:
        mid_x = int((l_shoulder[0] + r_shoulder[0]) / 2)
        mid_y = int((l_shoulder[1] + r_shoulder[1]) / 2)
        text_pos = (mid_x, mid_y - 40)
    else:
        visible_kps = [k for k in keypoints if k[2] > conf_threshold]
        if visible_kps:
            text_pos = (int(visible_kps[0][0]), int(visible_kps[0][1]) - 30)
        else:
            text_pos = (50, 50)
            
    label_text = f"Pek. {worker_id}: {risk_level}"
    if speed_label:
        label_text += f" | {speed_label}"
    if is_zone_hazard:
        label_text += " [ZONA TERLARANG]"
        
    (w, h), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
    
    tx = max(10, text_pos[0] - w // 2)
    ty = max(20, text_pos[1])
    
    cv2.rectangle(frame, (tx - 4, ty - h - 4), (tx + w + 4, ty + 4), color_bgr, -1)
    cv2.putText(frame, label_text, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
            
    return frame

def draw_restricted_zone(frame):
    """
    Draws a semi-transparent virtual restricted zone polygon on the frame.
    """
    h, w = frame.shape[:2]
    # Define virtual zone polygon in bottom right quadrant (e.g. machine hazard zone)
    zone_pts = np.array([
        [int(w * 0.7), int(h * 0.65)],
        [int(w * 0.98), int(h * 0.65)],
        [int(w * 0.98), int(h * 0.95)],
        [int(w * 0.7), int(h * 0.95)]
    ], np.int32)
    
    overlay = frame.copy()
    cv2.fillPoly(overlay, [zone_pts], (0, 0, 220))  # Red fill
    cv2.addWeighted(overlay, 0.25, frame, 0.75, 0, frame)
    cv2.polylines(frame, [zone_pts], True, (0, 0, 255), 2)
    cv2.putText(frame, "ZONA TERLARANG (HAZARD)", (int(w * 0.71), int(h * 0.69)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
    return frame, zone_pts.tolist()

def background_worker():
    model = YOLO(settings.MODEL_PATH)
    
    current_source = None
    cap = None
    last_alert_time = 0
    tracking_history = {}  # {worker_id: (x, y, timestamp)}
    
    while state.is_running:
        with state.lock:
            src = state.active_source
            
        if current_source != src:
            current_source = src
            if cap is not None:
                cap.release()
                cap = None
                time.sleep(0.5)
            if isinstance(current_source, int) or (isinstance(current_source, str) and current_source.isdigit()):
                idx = int(current_source)
                cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
                if not cap.isOpened():
                    cap = cv2.VideoCapture(idx)
            elif current_source == "webcam":
                cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                if not cap.isOpened():
                    cap = cv2.VideoCapture(0)
            else:
                cap = cv2.VideoCapture(current_source)
                
        if cap is None or not cap.isOpened():
            blank = np.zeros((480, 960, 3), dtype=np.uint8)
            cv2.putText(blank, f"SUMBER VIDEO '{src}' TIDAK TERHUBUNG / TIDAK ADA", (120, 220), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (60, 76, 231), 2, cv2.LINE_AA)
            cv2.putText(blank, "Silakan pilih Kamera 0 (Laptop) atau Kamera 1 (DroidCam) pada menu SUMBER", (100, 270), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
            _, buffer = cv2.imencode('.jpg', blank)
            with state.lock:
                state.latest_frame = buffer.tobytes()
                state.workers_data = []
            current_source = None  # Reset so thread can attempt next selection cleanly
            time.sleep(1.0)
            continue
            
        ret, frame = cap.read()
        if not ret:
            if current_source != "webcam" and not str(current_source).isdigit():
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            time.sleep(0.03)
            continue
            
        if current_source == "webcam" or str(current_source).isdigit():
            frame = cv2.flip(frame, 1)
            
        h_f, w_f = frame.shape[:2]
        target_w = 960
        target_h = int((target_w / w_f) * h_f)
        frame = cv2.resize(frame, (target_w, target_h))
        
        # Draw virtual restricted geofence zone
        frame, zone_polygon = draw_restricted_zone(frame)
        
        try:
            results = model.track(frame, persist=True, verbose=False)
        except Exception:
            results = model(frame, verbose=False)
            
        temp_workers = []
        now_time = time.time()
        
        if len(results) > 0 and results[0].keypoints is not None:
            keypoints_data = results[0].keypoints.data.cpu().numpy()
            boxes = results[0].boxes
            ids = None
            if boxes is not None and boxes.id is not None:
                ids = boxes.id.int().cpu().tolist()
                
            for i, kp in enumerate(keypoints_data):
                worker_id = ids[i] if ids is not None else i + 1
                eval_res = evaluate_ergonomics(kp, conf_threshold=state.conf_threshold)
                
                # Multi-Behavior Evaluations:
                # 1. Running hazard (centroid velocity)
                sh_mid_x = (kp[5][0] + kp[6][0]) / 2.0
                sh_mid_y = (kp[5][1] + kp[6][1]) / 2.0
                sh_width = np.linalg.norm(np.array(kp[6][:2]) - np.array(kp[5][:2]))
                
                speed_px_sec = 0.0
                is_running = False
                if worker_id in tracking_history:
                    prev_x, prev_y, prev_t = tracking_history[worker_id]
                    dt = now_time - prev_t
                    if dt > 0.05:
                        dist_px = np.sqrt((sh_mid_x - prev_x)**2 + (sh_mid_y - prev_y)**2)
                        speed_px_sec = dist_px / dt
                        is_running, norm_speed = evaluate_running_behavior(speed_px_sec, sh_width)
                        
                tracking_history[worker_id] = (sh_mid_x, sh_mid_y, now_time)
                
                # 2. Zone Intrusion
                feet_pts = [kp[15][:2].tolist(), kp[16][:2].tolist()]
                is_zone_intruding = evaluate_zone_intrusion(feet_pts, zone_polygon)
                
                # Update risk level & reasons based on multi-behavior results
                risk_lvl = eval_res.get("risk_level", "UNKNOWN")
                reasons = eval_res.get("reasons", [])
                
                if is_running:
                    if risk_lvl == "AMAN":
                        risk_lvl = "WASPADA"
                    reasons.append("🏃 Berlari di Area Kerja / Gerakan Tergesa-gesa")
                    
                if is_zone_intruding:
                    risk_lvl = "BAHAYA"
                    reasons.append("⛔ Memasuki Zona Terlarang / Hazard Area")
                    
                eval_res["risk_level"] = risk_lvl
                eval_res["reasons"] = reasons
                
                # Draw visual skeleton & labels on frame
                speed_lbl = f"{int(speed_px_sec)}px/s" if speed_px_sec > 10 else None
                frame = draw_skeleton(frame, kp, risk_lvl, worker_id, conf_threshold=state.conf_threshold, 
                                      speed_label=speed_lbl, is_zone_hazard=is_zone_intruding)
                
                if eval_res["status"] == "SUCCESS":
                    temp_workers.append({
                        "id": worker_id,
                        "risk_level": risk_lvl,
                        "reasons": reasons,
                        "details": eval_res["details"]
                    })
                    
                    # SSE Hazard Alert Swapping Broadcaster (Throttle to max 1 alert per second)
                    if risk_lvl in ["BAHAYA", "WASPADA"] and (now_time - last_alert_time > 1.0):
                        last_alert_time = now_time
                        t_str = time.strftime("%H:%M:%S")
                        
                        try:
                            alert_html = templates.get_template("partials/hazard_item.html").render({
                                "risk_level": risk_lvl,
                                "time_str": t_str,
                                "worker_id": worker_id,
                                "reasons": reasons
                            })
                            sse_manager.broadcast(alert_html)
                        except Exception:
                            pass
                else:
                    temp_workers.append({
                        "id": worker_id,
                        "risk_level": "KURANG DATA",
                        "reasons": [eval_res.get("message", "Tunjukkan seluruh badan (bahu & pinggul)")],
                        "details": {
                            "trunk_angle": 0.0,
                            "knee_angle": None,
                            "twist_angle": 0.0,
                            "shoulder_tilt": 0.0,
                            "wrist_hip_dist_normalized": 0.0
                        }
                    })
                    
        _, buffer = cv2.imencode('.jpg', frame)
        with state.lock:
            state.latest_frame = buffer.tobytes()
            state.workers_data = temp_workers
            
        time.sleep(0.03)
        
    if cap is not None:
        cap.release()
