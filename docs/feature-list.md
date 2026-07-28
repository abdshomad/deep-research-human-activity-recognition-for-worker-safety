# 🛠️ Platform Feature List & System Capabilities

> **Project Name:** Human Activity Recognition for Worker Safety  
> **Documentation Type:** Master Platform Feature Registry  
> **Last Updated:** 2026-07-29  
> **Status:** Active Research & Architecture Specification  

---

## 📌 Document Overview
This document maintains an organized, standardized list of all core platform features, computer vision capabilities, web application interface components, and environment management specifications for the **Unsafe Worker Behaviour Detection** platform.

---

## 1. 🔬 Deep Research & Vision Frameworks
- **Git Submodule Evaluation Matrix:** Comprehensive benchmark analysis evaluating `mmaction2`, `MotionBERT`, `SlowFast`, `Video-Swin-Transformer`, and `VideoChat3` for workplace safety applications ([deep-research/unsafe_worker_behaviour_detection.md](../deep-research/unsafe_worker_behaviour_detection.md)).
- **Hybrid Detection Engine:** Dual-pipeline integration combining MMAction2 (PoseC3D/AVA spatio-temporal action detection) for multi-worker action localization with MotionBERT for 3D monocular joint reconstruction and REBA/RULA postural ergonomics risk scoring.
- **Skeleton-First Preprocessing:** 2D keypoint extraction pipeline (MMPose/RTMPose) feeding 17 joint coordinates into 3D heatmap volumes for lighting- and apparel-invariant hazard detection.

---

## 2. 🖥️ Operational Safety HUD Web Application Architecture
- **FastAPI + HTMX Backend:** High-performance asynchronous Python web backend serving template partials for seamless HTMX component dynamic swaps ([plans/worker_safety_hud_app.md](../plans/worker_safety_hud_app.md)).
- **4-Quadrant Glassmorphic HUD Layout:** Complete UI shell featuring:
  - **Top HUD Header:** System branding, live camera stream switcher, GPU/inference status badge, confidence slider, active hazard counters.
  - **Main Viewport Canvas:** Interactive SVG video overlay for 2D/3D skeleton keypoint visualization and hazard bounding boxes.
  - **Left Drawer (Widget):** Camera stream list, active worker roster, and keyframe thumbnail strip ([hud-design](../hud-design)).
  - **Right Sidesheet (Widget):** Live hazard alert logs (falls, trips, zone breaches) and MotionBERT REBA posture meters.
  - **Bottom HUD Dock:** Video playback timeline controls (play/pause/step) and category filter buttons.

---

## 3. ⚡ Real-Time Streaming & Alert System
- **Server-Sent Events (SSE) Engine:** Real-time push notification architecture utilizing `htmx-ext-sse` (`sse-connect="/api/sse/alerts"`) to swap live hazard alert components into the UI without page reloads.
- **Automated Incident Logging:** Real-time risk scoring and event snapshot generation for safety compliance audits.

---

## 4. 📦 Package & Environment Management (`uv`)
- **Isolated `uv` Ecosystem:** Dependency resolution and script execution standard using `uv init`, `uv add`, `uv sync`, and `uv run`.
- **Fast ASGI Deployment:** Production and dev server launching powered by Uvicorn and FastAPI.
