# 🛠️ Master Platform Feature Registry (Fitur Aktif & Berjalan)

> **Project Name:** WorkerSafety HUD - Real-Time AI Ergonomics & Multi-Behavior Unsafe Act Detection System  
> **Repository:** `caramengangkatyangbenar`  
> **Last Updated:** 2026-07-29  
> **Status:** Operational Web Application & Multi-Behavior Safety Monitoring Platform  

---

## 📌 Overview
Dokumen ini mencatat seluruh **fitur yang telah 100% diimplementasikan dan berjalan aktif** pada sistem **WorkerSafety HUD**. Seluruh fitur di bawah ini dapat diuji dan dijalankan secara real-time pada aplikasi.

---

## 1. 🚀 Fitur Sistem & Antarmuka (UI/UX & Hardware)

### 📱 1.1 DroidCam & Direct IP Camera Stream Connector (`URL`)
- **Deskripsi:** Modul konektor stream IP Camera (MJPEG/HTTP) langsung di Left Drawer & Top HUD.
- **Kemampuan:** Menghubungkan kamera HP (Android/iOS) via DroidCam / IP Webcam nirkabel (contoh: `http://192.168.x.x:4747/video`).
- **Keunggulan:** Bebas kendala driver Virtual Camera Windows dan tidak membutuhkan kabel data.

### 🎥 1.2 Windows Multi-Camera Device Lock Release & DirectShow Switching
- **Deskripsi:** Arsitektur *Background Capture Thread* berbasis `cv2.CAP_DSHOW` dengan penundaan rilis memori (`time.sleep(0.5)`).
- **Kemampuan:** 
  - Mencegah *device locking* (MSMF error) pada OS Windows saat berpindah antar-kamera.
  - Pergantian instan antara Webcam Laptop (Index 0), DroidCam Camera (Index 1), dan Kamera Eksternal (Index 2).
  - Lampu webcam laptop otomatis padam secara instan saat sumber video dialihkan ke file rekaman (`.mp4`).

### 🖼️ 1.3 Full-Cover Glassmorphic Video Viewport & Display Scaling
- **Deskripsi:** Pembaruan styling pada elemen viewport utama (`main#stream-viewer-container` & `img#main-frame-img`).
- **Kemampuan:**
  - Video otomatis terisi penuh 100% (*width: 100%; height: 100%; object-fit: cover;*) tanpa terpotong atau menyusut saat diganti via HTMX (`set_source`).
  - Dilengkapi bingkai glassmorphism modern (*border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(12px); border-radius: 16px*).

### ⌨️ 1.4 Fullscreen Mode & Interactive Shortcuts (`[F]`, `[Z]`, `[Shift+W]`, `[G]`)
- **Deskripsi:** Pintasan keyboard interaktif untuk kontrol layar dan kenyamanan pemantauan:
  - `F` : **Full Screen Browser Mode** (Memperbesar video ke seluruh monitor fisik).
  - `Z` : **Zen Mode / Clean View** (Menyembunyikan seluruh panel samping untuk tampilan bersih).
  - `Shift + W` : **Fit Canvas Viewport** (Merenggangkan rasio tampilan video).
  - `G` : **GPU Management Overlay** (Panel spesifikasi hardware).
  - `?` : **Help Shortcuts Modal**.

### 🩶 1.5 Continuous Skeleton Visualizer with Gray Fallback Mode
- **Deskripsi:** Visualisasi pose adapter yang tetap menggambar kerangka tubuh meskipun pekerja berdiri terlalu dekat dengan kamera.
- **Kemampuan:** Bagian tubuh yang terdeteksi digambar dengan warna **Abu-abu (Gray)** saat bahu/pinggul terpotong kamera, disertai pesan `KURANG DATA: Tunjukkan seluruh badan (bahu & pinggul)`. Berubah warna menjadi **Hijau/Kuning/Merah** begitu seluruh badan terlihat utuh.

### 💻 1.6 Dynamic Hardware Detection & GPU Management Panel
- **Deskripsi:** Panel overlay manajemen GPU (`[G]`) yang mendeteksi spesifikasi hardware secara dinamis menggunakan PyTorch.
- **Kemampuan:** Mendeteksi spesifikasi hardware komputer secara nyata (seperti **AMD Ryzen 5 6600H CPU / Integrated Radeon Graphics**), alokasi RAM/VRAM, dan device index (`cpu`/`cuda:0`).

### 📤 1.7 Integrated Video File Uploader & Workspace File Scanner
- **Deskripsi:** Form pengunggahan berkas video di Left Drawer (`/api/upload_video`) beserta pemindai berkas otomatis di root workspace (`.mp4`, `.avi`, `.mov`, `.mkv`).

---

## 2. ⚠️ Engine Deteksi Multi-Perilaku Berbahaya (Aktif Berjalan)

Berikut adalah daftar 5 modul bahaya yang **telah aktif berjalan** pada engine pendeteksi (`app/services/detector.py` & `src/ergonomics.py`):

| No | Modul Bahaya | Cara Kerja Algoritma | Indikator Visual & Alert |
|---|---|---|---|
| 1 | **🏋️ Unsafe Lifting Ergonomics** | Perhitungan sudut REBA (Punggung membungkuk, tekukan lutut, twist pinggang, jarak beban) | Kerangka Merah/Kuning + Alert Stoop Lift / Bend |
| 2 | **🏃 Berlari di Area Kerja** | Memantau kecepatan gerakan titik pusat (*centroid velocity tracking*) per-ID pekerja antar-frame | Label `[BERLARI DI AREA KERJA]` + Speed `px/s` |
| 3 | **📱🚬 Distraksi Gadget & Potensi Merokok** | Mengukur jarak tangan ke wajah/mulut (*wrist-to-face/mouth proximity*) dipadu sudut kepala menunduk | Alert `📱🚬 Distraksi / Potensi Merokok: Tangan di Dekat Wajah & Mulut` |
| 4 | **⛔ Memasuki Zona Terlarang** | Overlapping poligon area bahaya virtual (*virtual geofencing polygon*) dengan koordinat kaki pekerja | Overlay Poligon Merah + Label `[ZONA TERLARANG]` |
| 5 | **⏳ Postur Statis Berkelanjutan** | Pelacakan durasi kumulatif posisi bungkuk/jongkok ($>10\text{ detik}$) | Alert `Postur bungkuk berkelanjutan (>10 detik)` |

---

## 3. 🔬 Vision Framework & Core Algoritma Engine

- **2D Pose Extraction (YOLOv8-Pose):** Melacak 17 titik koordinat sendi tubuh (*H36M keypoints format*) secara real-time pada 30+ FPS di CPU.
- **REBA Biomechanics Engine (`src/ergonomics.py`):**
  - **Trunk Bending (Fleksi Punggung):** Batas aman $\le 20^\circ$.
  - **Knee Squat (Tekukan Lutut):** Mengharuskan tekukan lutut ($> 90^\circ$).
  - **Waist Twisting (Pilinan Pinggang):** Batas aman $< 15^\circ$.
  - **Shoulder Tilt & Wrist Distance:** Mengukur miring bahu & jarak beban.
- **Centroid Tracking & Speed Meter:** Menghitung kecepatan pergerakan piksel per detik ($v = \frac{\Delta \text{dist}}{\Delta t}$) relatif terhadap lebar bahu pekerja.
- **Virtual Geofencing Engine:** Memeriksa apakah koordinat titik kaki $(x_{15}, y_{15})$ atau $(x_{16}, y_{16})$ berada di dalam poligon zona bahaya (`matplotlib.path.Path`).

---

## 4. 🖥️ Arsitektur Web & Real-Time Alert System

- **Backend:** FastAPI + Uvicorn ASGI Server + Jinja2 Template Partials.
- **Frontend:** HTMX `v2.0.10` + Glassmorphism Vanilla CSS + SSE Extension (`htmx-ext-sse`).
- **Server-Sent Events (SSE) Broadcaster (`/api/sse/alerts`):** Memancar (*broadcast*) kartu peringatan bahaya (*Hazard Alert Cards*) secara otomatis ke panel `🚨 LIVE HAZARD ALERT LOGS` tanpa me-reload halaman.
- **Modular Directory Layout:**
  - `app/main.py` — Entrypoint ASGI & static mounting
  - `app/config.py` — Pengaturan sistem & path
  - `app/routes/hud.py` — Render partials HTMX (`/`, `/hud/left-drawer`, `/hud/right-sidesheet`)
  - `app/routes/api.py` — REST API, stream MJPEG, & endpoint SSE
  - `app/services/detector.py` — Background thread capture & multi-behavior evaluator
  - `app/services/sse_manager.py` — Async queue broadcaster
  - `app/templates/partials/` — 6 komponen partial HTML
