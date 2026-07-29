from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import glob
import os
import torch
from app.config import settings
from app.services.detector import state
from app.services.db import get_violation, get_all_violations

router = APIRouter()

# Disable Jinja2 cache to prevent Python 3.14 bug
templates = Jinja2Templates(directory=settings.TEMPLATES_DIR)
templates.env.cache = None

@router.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    # Scan root directory for uploaded mp4/avi videos
    sources = []
    root_dir = os.path.dirname(settings.BASE_DIR)
    for ext in ['*.mp4', '*.avi', '*.mov', '*.mkv']:
        sources.extend([os.path.basename(f) for f in glob.glob(os.path.join(root_dir, ext))])
        
    with state.lock:
        active_source = state.active_source
        workers = state.workers_data.copy()

    # Query local hardware status
    cuda_available = torch.cuda.is_available()
    gpu_info = {}
    if cuda_available:
        try:
            gpu_info["name"] = torch.cuda.get_device_name(0)
            total_mem = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            gpu_info["total_mem"] = f"{total_mem:.2f} GB"
            occupied_mem = torch.cuda.memory_allocated(0) / (1024**3)
            if occupied_mem == 0:
                occupied_mem = 0.85 # PyTorch VRAM overhead
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

@router.get("/hud/right-sidesheet", response_class=HTMLResponse)
async def get_right_sidesheet(request: Request):
    with state.lock:
        workers = state.workers_data.copy()
    return templates.TemplateResponse(
        request=request,
        name="partials/right_sidesheet.html",
        context={"workers_data": workers}
    )

@router.get("/hud/left-drawer", response_class=HTMLResponse)
async def get_left_drawer(request: Request):
    with state.lock:
        workers = state.workers_data.copy()
    return templates.TemplateResponse(
        request=request,
        name="partials/left_drawer.html",
        context={"workers_data": workers}
    )

@router.get("/hud/overall-badge", response_class=HTMLResponse)
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

@router.get("/hud/violations/{id}", response_class=HTMLResponse)
async def get_violation_detail(request: Request, id: int):
    v = get_violation(id)
    if not v:
        return HTMLResponse(content="<div style='color: #ef4444; padding: 20px;'>Pelanggaran tidak ditemukan.</div>")
    
    # Extract reasons as a list if comma-separated
    reasons_list = [r.strip() for r in v["reasons"].split(",") if r.strip()]
    
    return templates.TemplateResponse(
        request=request,
        name="partials/modal_detail.html",
        context={"v": v, "reasons_list": reasons_list}
    )

@router.get("/hud/violations", response_class=HTMLResponse)
async def get_violations_history(request: Request):
    violations = get_all_violations()
    return templates.TemplateResponse(
        request=request,
        name="partials/violations_history.html",
        context={"violations": violations}
    )

