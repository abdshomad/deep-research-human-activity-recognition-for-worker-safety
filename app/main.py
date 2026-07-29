from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import threading
from app.config import settings
from app.routes import hud, api
from app.services.detector import state, background_worker

app = FastAPI(title="WorkerSafety HUD - AI Ergonomics Monitor")

# Mount static files directory
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# Register routes
app.include_router(hud.router)
app.include_router(api.router)

@app.on_event("startup")
def startup_event():
    # Start the background YOLO capture & processing thread
    threading.Thread(target=background_worker, daemon=True).start()

@app.on_event("shutdown")
def shutdown_event():
    state.is_running = False
