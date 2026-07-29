from fastapi import APIRouter, Request, File, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
import os
import shutil
import time
import asyncio
from app.services.detector import state
from app.services.sse_manager import sse_manager

router = APIRouter()

# Generator for video feed stream
async def frame_generator():
    last_frame = None
    while state.is_running:
        with state.lock:
            frame = state.latest_frame
        if frame is not None and frame != last_frame:
            last_frame = frame
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        await asyncio.sleep(0.03)

@router.get("/api/video_feed")
async def get_video_feed():
    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.post("/api/set_source")
async def set_source(request: Request):
    form_data = await request.form()
    source_val = form_data.get("video-source-select")
    
    if not source_val:
        source_val = "webcam"
        
    with state.lock:
        state.active_source = source_val
        state.workers_data = []  # clear old data
        
    t = int(time.time())
    return HTMLResponse(content=f"""
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 14px; overflow: hidden;">
        <img id="main-frame-img" class="canvas-viewport__img" src="/api/video_feed?t={t}" alt="Video Monitor Stream" style="width: 100%; height: 100%; object-fit: cover; border-radius: 14px;" />
        <div style="position: absolute; bottom: 20px; background: rgba(0,0,0,0.65); padding: 6px 18px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(12px); font-size: 11px; font-weight: 600; color: #4ade80;">
             ● LIVE MONITORING ACTIVE
        </div>
    </div>
    """)

@router.post("/api/upload_video")
async def upload_video(file: UploadFile = File(...)):
    filename = os.path.basename(file.filename)
    if not filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
        return HTMLResponse(content="<span style='color: #ef4444;'>Gagal: Ekstensi file harus berupa video!</span>")
        
    # Save file to root workspace
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_path = os.path.join(root_dir, filename)
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return HTMLResponse(content="<span style='color: #22c55e;'>Upload sukses! Me-reload halaman...</span>")

@router.get("/api/sse/alerts")
async def sse_alerts(request: Request):
    """
    Server-Sent Events router stream for safety alerts.
    Sends raw hazard template blocks under event 'new-hazard'.
    """
    async def event_stream():
        queue = sse_manager.subscribe()
        try:
            while True:
                # Wait for new hazard alert to broadcast
                alert_html = await queue.get()
                # Clean up formatting to output single-line string to satisfy SSE standard
                sanitized_html = alert_html.strip().replace("\n", "")
                yield f"event: new-hazard\ndata: {sanitized_html}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            sse_manager.unsubscribe(queue)
            
    return StreamingResponse(event_stream(), media_type="text/event-stream")
