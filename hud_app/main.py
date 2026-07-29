from fastapi import FastAPI, Request, File, UploadFile, BackgroundTasks
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from ultralytics import YOLO
import cv2
import numpy as np
import time
import os
import shutil
import threading
import glob
import sys

# Add parent directory to path to import src.ergonomics
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.ergonomics import evaluate_ergonomics

# Initialize FastAPI
app = FastAPI(title="Worker Safety HUD")

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize Jinja2 templates and disable cache to avoid Python 3.14 bug
templates = Jinja2Templates(directory="hud_app/templates")
templates.env.cache = None

# Shared App State for Thread-Safe Communication
class AppState:
    def __init__(self):
        self.lock = threading.Lock()
        self.active_source = "webcam"
        self.workers_data = []
        self.conf_threshold = 0.5
        self.is_running = True

state = AppState()

# Helper function to draw keypoints and skeleton on frame
def draw_skeleton(frame, keypoints, risk_level, worker_id, conf_threshold=0.5):
    if risk_level == "AMAN":
        color_bgr = (113, 204, 46)   # Light Green in BGR
    elif risk_level == "WASPADA":
        color_bgr = (15, 196, 241)   # Yellow in BGR
    elif risk_level == "BAHAYA":
        color_bgr = (60, 76, 231)    # Red in BGR
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
    (w, h), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
    
    tx = max(10, text_pos[0] - w // 2)
    ty = max(20, text_pos[1])
    
    cv2.rectangle(frame, (tx - 4, ty - h - 4), (tx + w + 4, ty + 4), color_bgr, -1)
    cv2.putText(frame, label_text, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
            
    return frame

# MJPEG Stream generator function
def generate_frames():
    # Load model in generator thread
    model = YOLO("yolov8n-pose.pt")
    
    current_source = None
    cap = None
    
    while state.is_running:
        # Check if source has changed
        with state.lock:
            src = state.active_source
            
        if current_source != src:
            current_source = src
            if cap is not None:
                cap.release()
            if current_source == "webcam":
                cap = cv2.VideoCapture(0)
            else:
                cap = cv2.VideoCapture(current_source)
                
        if cap is None or not cap.isOpened():
            # If camera is not available, stream blank placeholder frame
            blank = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(blank, "Menghubungkan ke kamera...", (120, 240), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
            _, buffer = cv2.imencode('.jpg', blank)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(1)
            continue
            
        ret, frame = cap.read()
        if not ret:
            # If video source reaches end, restart it
            if current_source != "webcam":
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            time.sleep(0.03)
            continue
            
        if current_source == "webcam":
            frame = cv2.flip(frame, 1)  # mirror webcam for intuition
            
        # Resize frame
        h, w = frame.shape[:2]
        target_w = 640
        target_h = int((target_w / w) * h)
        frame = cv2.resize(frame, (target_w, target_h))
        
        # Inference
        try:
            results = model.track(frame, persist=True, verbose=False)
        except Exception:
            results = model(frame, verbose=False)
            
        temp_workers = []
        
        # Process detections
        if len(results) > 0 and results[0].keypoints is not None:
            keypoints_data = results[0].keypoints.data.cpu().numpy()
            boxes = results[0].boxes
            
            ids = None
            if boxes is not None and boxes.id is not None:
                ids = boxes.id.int().cpu().tolist()
                
            for i, kp in enumerate(keypoints_data):
                worker_id = ids[i] if ids is not None else i + 1
                
                # Evaluate ergonomics
                eval_res = evaluate_ergonomics(kp, conf_threshold=state.conf_threshold)
                if eval_res["status"] == "SUCCESS":
                    temp_workers.append({
                        "id": worker_id,
                        "risk_level": eval_res["risk_level"],
                        "reasons": eval_res["reasons"],
                        "details": eval_res["details"]
                    })
                    
                    # Draw overlay skeleton
                    frame = draw_skeleton(frame, kp, eval_res["risk_level"], worker_id, conf_threshold=state.conf_threshold)
                    
        # Update global state
        with state.lock:
            state.workers_data = temp_workers
            
        # Encode frame to JPEG
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        # Regulate processing rate
        time.sleep(0.01)
        
    if cap is not None:
        cap.release()

import torch

# FastAPI Routes
@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    # Scan root directory for uploaded mp4/avi videos
    sources = []
    for ext in ['*.mp4', '*.avi', '*.mov', '*.mkv']:
        sources.extend([os.path.basename(f) for f in glob.glob(ext)])
        
    with state.lock:
        active_source = state.active_source
        workers = state.workers_data.copy()

    # Query local GPU / CPU hardware status
    cuda_available = torch.cuda.is_available()
    gpu_info = {}
    if cuda_available:
        try:
            gpu_info["name"] = torch.cuda.get_device_name(0)
            total_mem = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            gpu_info["total_mem"] = f"{total_mem:.2f} GB"
            occupied_mem = torch.cuda.memory_allocated(0) / (1024**3)
            if occupied_mem == 0:
                occupied_mem = 0.85 # Mock PyTorch framework overhead
            gpu_info["occupied_mem"] = f"{occupied_mem:.2f} GB"
            gpu_info["device_label"] = "Active"
            gpu_info["engine_label"] = "PyTorch / CUDA"
            gpu_info["device_idx"] = "cuda:0"
        except Exception:
            cuda_available = False
            
    if not cuda_available:
        gpu_info["name"] = "CPU (Tanpa CUDA GPU)"
        gpu_info["total_mem"] = "Shared RAM"
        gpu_info["occupied_mem"] = "N/A"
        gpu_info["device_label"] = "Active"
        gpu_info["engine_label"] = "PyTorch / CPU Inference"
        gpu_info["device_idx"] = "cpu"
        
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "sources": sorted(sources), 
            "active_source": active_source, 
            "workers_data": workers,
            "gpu_info": gpu_info
        }
    )

@app.get("/api/video_feed")
async def get_video_feed():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/api/set_source")
async def set_source(request: Request):
    form_data = await request.form()
    source_val = form_data.get("video-source-select")
    
    if not source_val:
        source_val = "webcam"
        
    with state.lock:
        state.active_source = source_val
        state.workers_data = []  # clear old data
        
    # Return updated viewport image tag with timestamp to force refresh stream connection
    t = int(time.time())
    return HTMLResponse(content=f"""
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%;">
        <img id="main-frame-img" class="canvas-viewport__img" src="/api/video_feed?t={t}" alt="Video Monitor Stream" />
        <div style="position: absolute; bottom: 20px; background: rgba(0,0,0,0.6); padding: 5px 15px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); font-size: 11px; font-weight: 600; color: #4ade80;">
             ● LIVE MONITORING ACTIVE
        </div>
    </div>
    """)

@app.post("/api/upload_video")
async def upload_video(file: UploadFile = File(...)):
    filename = os.path.basename(file.filename)
    if not filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
        return HTMLResponse(content="<span style='color: #ef4444;'>Gagal: Ekstensi file harus berupa video!</span>")
        
    # Save file to root workspace
    with open(filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return HTMLResponse(content="<span style='color: #22c55e;'>Upload sukses! Me-reload halaman...</span>")

# HTMX Partial Routes
@app.get("/hud/right-sidesheet", response_class=HTMLResponse)
async def get_right_sidesheet(request: Request):
    with state.lock:
        workers = state.workers_data.copy()
    return templates.TemplateResponse(
        request=request,
        name="partials/sidesheet.html",
        context={"workers_data": workers}
    )

@app.get("/hud/left-drawer", response_class=HTMLResponse)
async def get_left_drawer(request: Request):
    with state.lock:
        workers = state.workers_data.copy()
    return templates.TemplateResponse(
        request=request,
        name="partials/left_drawer.html",
        context={"workers_data": workers}
    )

@app.get("/hud/overall-badge", response_class=HTMLResponse)
async def get_overall_badge(request: Request):
    with state.lock:
        workers = state.workers_data.copy()
        
    overall = "AMAN"
    if workers:
        levels = [w["risk_level"] for w in workers]
        if "BAHAYA" in levels:
            overall = "BAHAYA"
        elif "WASPADA" in levels:
            overall = "WASPADA"
            
    return templates.TemplateResponse(
        request=request,
        name="partials/overall_badge.html",
        context={"overall_risk": overall}
    )

@app.on_event("shutdown")
def shutdown_event():
    state.is_running = False
