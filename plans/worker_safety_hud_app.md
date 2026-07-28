# Implementation Plan: Unsafe Worker Behaviour Detection HUD Web Application

## Executive Overview

This implementation plan details the step-by-step process to build a real-time **Unsafe Worker Behaviour Detection & Monitoring Web Application** based on the research findings in `deep-research/unsafe_worker_behaviour_detection.md`.

The application leverages the **Unified HUD Interface Design** (Top HUD, Bottom HUD, Left Drawer, Right Sidesheet) from `hud-design/` combined with **Python (FastAPI)**, **HTMX**, and **`uv`** for dependency management.

---

## Technical Stack & Package Management

* **Python Environment & Package Manager:** `uv` (Fast, isolated Python project manager)
* **Backend Framework:** FastAPI + `jinja2` (Template partials for HTMX) + `uvicorn`
* **Frontend Tech Stack:** Vanilla Glassmorphic CSS (adapted from `hud-design/static/css`), HTMX `v2.0.10`, SSE Extension (`htmx-ext-sse`)
* **Core ML & Vision Models:** MMAction2 (PoseC3D / SlowFast), MotionBERT (3D Monocular Pose & Ergonomics)

---

## Agreed Architectural Decisions (Grill-Me Alignment)

### Decision 1: Python Web Backend Framework
* **Choice:** **FastAPI + Jinja2 Templates + HTMX**
* **Rationale:** Asynchronous ASGI server handles high-throughput video frame serving and Server-Sent Events (SSE) for pushing instant safety alerts without page reloads.

### Decision 2: HUD Quadrant & Widget Layout Mapping
* **Choice:** **Operational Safety HUD Mapping**
* **Quadrant Configurations:**
  - **Top HUD Header:** App Brand (`WorkerSafety HUD`), Live Camera Feed selector, GPU/Inference Status badge, Confidence Threshold slider, Active Hazard Counters.
  - **Main Viewport Canvas:** Interactive SVG video canvas displaying live camera frame, 2D MMPose/RTMPose skeleton overlay, 3D MotionBERT pose projections, and hazard bounding boxes.
  - **Left Drawer (Widget):** Camera Stream list, Active Worker Roster (IDs, locations), and Keyframe/Incident thumbnail strip.
  - **Right Sidesheet (Widget):** Live Unsafe Behaviour Alert Log (Falls, Trips, Intrusion), MotionBERT REBA/RULA Ergonomic Posture Meters, and Action Class breakdown.
  - **Bottom HUD Dock:** Video playback controller (Play/Pause/Step), Timeline Scrubber, and Quick Hazard Category Filter buttons.

### Decision 3: Real-Time HTMX Communication Strategy
* **Choice:** **Server-Sent Events (SSE) via `htmx-ext-sse`**
* **Rationale:** Direct SSE streaming (`hx-ext="sse"` + `sse-connect="/api/sse/alerts"`) pushes instant HTML partial updates for hazard alerts, worker risk scores, and GPU status to HTMX targets seamlessly without full page refreshes.

---

## Project Structure & File Layout

```
worker-safety-hud/
├── pyproject.toml               # Configured via `uv init` & `uv add`
├── .python-version
├── app/
│   ├── main.py                  # FastAPI application entrypoint & SSE router
│   ├── config.py                # Environment settings & video paths
│   ├── services/
│   │   ├── detector.py          # MMAction2 & MotionBERT inference bridge
│   │   └── sse_manager.py       # Async event broadcaster for safety alerts
│   ├── routes/
│   │   ├── hud.py               # HTMX partial rendering endpoints
│   │   └── api.py               # JSON REST & SSE endpoints
│   └── templates/
│       ├── base.html            # Main HTML layout wrapper
│       ├── index.html           # Full HUD workspace shell
│       └── partials/            # HTMX dynamic component partials
│           ├── top_hud.html     # Top HUD header partial
│           ├── bottom_hud.html  # Bottom playback dock partial
│           ├── left_drawer.html # Worker roster & camera list partial
│           ├── right_sidesheet.html # Hazard alert log & REBA meters partial
│           ├── hazard_item.html # Single hazard alert partial (SSE swapped)
│           └── canvas_svg.html  # Dynamic keypoint overlay partial
└── static/                      # Copied from hud-design/static
    ├── css/
    │   ├── style.css
    │   ├── hud_drawer.css
    │   ├── hud_sidesheet.css
    │   ├── hud_thumbnails.css
    │   └── toast.css
    └── js/
        ├── htmx.min.js
        └── sse.js
```

---

## Detailed Step-by-Step Execution Plan

### Phase 1: Environment Setup with `uv`
1. **Initialize Project:**
   ```bash
   uv init worker-safety-hud --python 3.10
   cd worker-safety-hud
   ```
2. **Add Dependencies:**
   ```bash
   uv add fastapi uvicorn jinja2 python-multipart sse-starlette numpy opencv-python-headless
   ```
3. **Sync Environment:**
   ```bash
   uv sync
   ```

### Phase 2: Static Asset Migration & Base Template Integration
1. Copy CSS assets from `hud-design/static/css/` into `worker-safety-hud/static/css/`.
2. Copy `htmx.min.js` and `sse.js` into `worker-safety-hud/static/js/`.
3. Create `templates/base.html` incorporating glassmorphism HUD styles, HTMX library scripts, and SSE extensions.

### Phase 3: Core FastAPI & HTMX Routes Development
1. **`app/main.py`**: Configure static directory mounting and template engine.
2. **`app/routes/hud.py`**:
   - `/`: Serves the complete HUD shell (`index.html`).
   - `/hud/left-drawer`: Renders updated worker roster & camera list.
   - `/hud/right-sidesheet`: Renders hazard log & MotionBERT ergonomic meters.
   - `/hud/canvas`: Returns SVG keypoint & bounding box overlay markup.
3. **`app/routes/api.py`**:
   - `/api/sse/alerts`: Server-Sent Events endpoint broadcasting live hazard triggers.
   - `/api/video/frame/{frame_id}`: Serves video keyframe images.

### Phase 4: Detection Engine Integration & SSE Broadcaster
1. Implement `app/services/detector.py` to ingest 2D keypoints (MMPose), format input for MMAction2 (PoseC3D), and compute 3D joints & REBA risk scores via MotionBERT.
2. Implement `app/services/sse_manager.py` using `asyncio.Queue` to broadcast alerts to connected HTMX clients.

### Phase 5: Verification & Launch Commands
1. Run application via `uv`:
   ```bash
   uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
2. Verify:
   - Access `http://localhost:8000` to inspect Top HUD, Bottom HUD, Left Drawer, and Right Sidesheet.
   - Test HTMX SSE live alert swaps (`hx-sse="connect:/api/sse/alerts"`).
   - Test confidence threshold slider and keyframe stepper updates.
