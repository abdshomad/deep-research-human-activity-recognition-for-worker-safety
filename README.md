# Deep Research: Human Activity Recognition for Worker Safety

[![Python](https://img.shields.io/badge/Python-3.10-blue.svg)](https://www.python.org/)
[![Package Manager](https://img.shields.io/badge/Package_Manager-uv-purple.svg)](https://github.com/astral-sh/uv)
[![Framework](https://img.shields.io/badge/Framework-FastAPI%20%7C%20HTMX-green.svg)](https://fastapi.tiangolo.com/)
[![Submodules](https://img.shields.io/badge/Submodules-MMAction2%20%7C%20MotionBERT%20%7C%20SlowFast-orange.svg)](https://github.com/open-mmlab/mmaction2)

A comprehensive research repository and operational system architecture designed to detect **unsafe worker behaviour**, assess **3D ergonomic posture strain (REBA/RULA)**, and monitor **workplace safety compliance** in industrial, construction, and manufacturing environments.

---

## 📚 Key Research & Documentation Links

* 📑 **Deep Research Report:** [deep-research/unsafe_worker_behaviour_detection.md](deep-research/unsafe_worker_behaviour_detection.md) — Comprehensive technical evaluation of Git submodules, computer vision tasks, and unsafe act detection paradigms.
* 📋 **Implementation Plan:** [plans/worker_safety_hud_app.md](plans/worker_safety_hud_app.md) — Step-by-step developer guide for building the real-time FastAPI + HTMX HUD web application using `uv`.
* 🎨 **HUD Design Mockup:** [hud-design/README.md](hud-design/README.md) — Offline glassmorphic HUD interface (Top HUD, Bottom HUD, Left Drawer, Right Sidesheet).

---

## 🔬 Submodule Evaluation Matrix

| Submodule / Repository | Core Technology | Computer Vision Tasks | Primary Worker Safety Use Cases | Evaluation Score |
| :--- | :--- | :--- | :--- | :---: |
| **[mmaction2](mmaction2)** | PyTorch Video Understanding Toolbox (OpenMMLab) | Spatio-Temporal Action Detection (AVA), Skeleton Action Recognition ([PoseC3D](mmaction2/configs/skeleton/posec3d)), Temporal Localization | Multi-worker tracking, localized unsafe act recognition (slips, trips, falls), zone intrusion | **9.5 / 10** *(Best Overall Framework)* |
| **[MotionBERT](MotionBERT)** | Dual-Stream Transformer for 3D Motion Representation | Monocular 3D Human Pose Estimation, 3D Mesh Recovery (SMPL), Skeleton Action Recognition | Biomechanical posture assessment, spine/neck flexion angle measurement, REBA/RULA ergonomics risk | **9.0 / 10** *(Best 3D Ergonomics Engine)* |
| **[SlowFast](SlowFast)** | Dual-Pathway 3D CNN (Meta AI Research) | High-frame-rate Action Dynamics & AVA Detection | Catching fast/abrupt movements, sudden falls, machinery collision proximity | **8.0 / 10** *(Fast Motion Capture)* |
| **[Video-Swin-Transformer](Video-Swin-Transformer)** | 3D Shifted Window Video Transformer | Video Classification Backbone | Clip-level safe vs. unsafe status classification | **7.5 / 10** *(Video Feature Backbone)* |
| **[VideoChat-Flash](VideoChat-Flash) / [VideoChat3](VideoChat3)** | Multimodal Video Language Model (Video-LLM) | Zero-Shot Video QA, Natural Language Safety Reasoning | Contextual safety reporting, conversational QA, PPE compliance verification | **8.5 / 10** *(High-Level Semantic Reasoning)* |

---

## 🏗️ System Architecture

The project adopts a **Hybrid MMAction2 + MotionBERT Framework** with a **2D Skeleton Extraction First** pipeline:

```
+------------------------------------------------------------------------------------------------+
|                                    CCTV / CAMERA VIDEO STREAM                                  |
+------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+------------------------------------------------------------------------------------------------+
|                                    1. SKELETON & WORKER DETECTOR                               |
|                                       (MMPose / RTMPose-m)                                     |
|                      Extracts 2D Joint Coordinates (17 Keypoints, H36M Format)                 |
+------------------------------------------------------------------------------------------------+
                               |                                    |
                               v                                    v
+----------------------------------------------+  +----------------------------------------------+
| 2. SPATIO-TEMPORAL UNSAFE ACTION RECOGNITION |  | 3. 3D BIOMECHANICS & ERGONOMICS EVALUATION   |
|         (MMAction2 - PoseC3D / SlowFast)     |  |                 (MotionBERT)                 |
|  - Spatio-temporal localized action detection |  | - Monocular 3D Pose Reconstruction           |
|  - Fall, Slip, Trip, & Intrusion Events      |  | - Spine/Neck Flexion Angle & REBA Risk Score |
+----------------------------------------------+  +----------------------------------------------+
                               \                                    /
                                \                                  /
                                 v                                v
+------------------------------------------------------------------------------------------------+
|                               4. UNIFIED SAFETY ALERT & REPORTING                              |
|                              (VideoChat3 Multimodal VLLM Summary)                              |
|                         Real-Time Warning (< 1s) & Automated Audit Logs                        |
+------------------------------------------------------------------------------------------------+
```

---

## 🖥️ Operational Safety HUD Interface Layout

The web application uses a **Unified HUD Interface** powered by **FastAPI**, **HTMX (`htmx-ext-sse`)**, and **`uv`**:

* **Top HUD Header:** App Brand (`WorkerSafety HUD`), Live Camera Feed Selector, GPU/Inference Status Badge, Confidence Slider, Active Hazard Counters.
* **Main Viewport Canvas:** Interactive SVG video canvas displaying live camera frame, 2D skeleton keypoint overlay, 3D pose reconstructions, and hazard bounding boxes.
* **Left Drawer (Widget):** Camera Stream list, Active Worker Roster (IDs, locations), and Keyframe/Incident thumbnail strip.
* **Right Sidesheet (Widget):** Live Unsafe Behaviour Alert Log (Falls, Trips, Intrusion), MotionBERT REBA/RULA Ergonomic Posture Risk Meters, and Action Class breakdown.
* **Bottom HUD Dock:** Video playback controller (Play/Pause/Step), Timeline Scrubber, and Quick Hazard Filter buttons.

---

## 🚀 Quick Start Guide (Using `uv`)

### Prerequisites
Ensure [`uv`](https://github.com/astral-sh/uv) is installed:
```bash
uv --version
```

### 1. Repository Setup & Submodule Update
```bash
git clone --recursive https://github.com/abdshomad/deep-research-human-activity-recognition-for-worker-safety.git
cd deep-research-human-activity-recognition-for-worker-safety
git submodule update --init --recursive
```

### 2. Initialize Application Project Environment
```bash
# Initialize Python environment with uv
uv init worker-safety-hud --python 3.10
cd worker-safety-hud

# Add core application dependencies
uv add fastapi uvicorn jinja2 python-multipart sse-starlette numpy opencv-python-headless

# Synchronize virtualenv dependencies
uv sync
```

### 3. Launch Development Server
```bash
# Run ASGI application with live reloading
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Then open `http://localhost:8000` in your browser.

---

## 📜 Citation & References

```bibtex
@article{mmaction2,
  title={MMAction2: OpenMMLab’s Next-Generation Video Understanding Toolbox},
  author={MMAction2 Contributors},
  journal={arXiv preprint arXiv:2303.04140},
  year={2023}
}

@inproceedings{motionbert2022,
  title={MotionBERT: A Unified Perspective on Learning Human Motion Representations},
  author={Zhu, Wentao and Ma, Xiaoxuan and Liu, Zhaoyang and Liu, Libin and Wu, Wayne and Wang, Yizhou},
  booktitle={Proceedings of the IEEE/CVF International Conference on Computer Vision},
  year={2023}
}
```