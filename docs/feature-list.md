# 🛠️ Master Platform Feature Registry & Custom Additions

> **Project Name:** WorkerSafety HUD - Real-Time AI Ergonomics & Unsafe Lifting Detection  
> **Repository:** `caramengangkatyangbenar`  
> **Last Updated:** 2026-07-29  
> **Status:** Fully Functional Operational Web Application  

---

## 📌 Overview
Dokumen ini mencatat seluruh fitur platform, kemampuan Computer Vision, arsitektur web backend/frontend, serta **semua penambahan fitur kustom di luar repositori referensi** yang telah diimplementasikan dalam sistem **WorkerSafety HUD**.

---

## 1. 🚀 Fitur Tambahan & Kustomisasi Sistem (Di Luar Repo Referensi)

Berikut adalah daftar fitur inovatif dan kustomisasi teknis yang ditambahkan secara khusus untuk mendukung kebutuhan nyata pengguna di lapangan:

### 📱 1.1 DroidCam & Direct IP Camera Stream Connector (`URL`)
- **Deskripsi:** Modul konektor stream IP Camera (MJPEG/HTTP) langsung yang terintegrasi di Left Drawer dan Top HUD.
- **Kemampuan:** Memungkinkan HP (Android/iOS) yang menjalankan aplikasi **DroidCam** atau **IP Webcam** terhubung secara nirkabel via alamat IP (contoh: `http://192.168.x.x:4747/video`).
- **Keunggulan:** Bebas dari kendala driver Virtual Camera Windows dan tidak membutuhkan kabel data.

### 🎥 1.2 Windows Multi-Camera Device Lock Release & DirectShow Switching
- **Deskripsi:** Arsitektur *Background Capture Thread* berbasis `cv2.CAP_DSHOW` dengan mekanisme penundaan rilis memori (`time.sleep(0.5)`).
- **Kemampuan:** 
  - Mencegah *device locking* (MSMF error) pada OS Windows saat berpindah antar-kamera.
  - Memungkinkan pergantian instan antara Webcam Laptop (Index 0), DroidCam Camera (Index 1), dan Kamera Eksternal (Index 2).
  - Lampu webcam laptop otomatis padam secara instan saat sumber video dialihkan ke file rekaman (`.mp4`).

### 🩶 1.3 Continuous Skeleton Visualizer with Gray Fallback Mode
- **Deskripsi:** Visualisasi pose adapter yang tetap menggambar kerangka tubuh meskipun pekerja berdiri terlalu dekat dengan kamera.
- **Kemampuan:**
  - Bagian tubuh yang terdeteksi tetap digambar dengan warna **Abu-abu (Gray)** saat bahu/pinggul terpotong kamera.
  - Menampilkan umpan balik instruktif di sidesheet kanan: `KURANG DATA: Tunjukkan seluruh badan (bahu & pinggul)`.
  - Berubah warna secara otomatis menjadi **Hijau (Aman)**, **Kuning (Waspada)**, atau **Merah (Bahaya)** begitu seluruh badan pekerja terlihat utuh.

### 💻 1.4 Dynamic Hardware Detection & GPU Management Panel
- **Deskripsi:** Panel overlay manajemen GPU (`[G]`) yang mendeteksi spesifikasi hardware secara dinamis menggunakan PyTorch.
- **Kemampuan:**
  - Mendeteksi secara nyata spesifikasi hardware komputer (seperti **AMD Ryzen 5 6600H CPU / Integrated Radeon Graphics**).
  - Menampilkan alokasi RAM/VRAM, index device (`cpu` / `cuda:0`), dan status model terpasang.

### 📤 1.5 Integrated Video File Uploader & File Scanner
- **Deskripsi:** Form pengunggahan berkas video di Left Drawer (`/api/upload_video`) beserta pemindai berkas otomatis di root workspace.
- **Kemampuan:** Mendukung format `.mp4`, `.avi`, `.mov`, `.mkv` yang otomatis terdaftar di dropdown pilihan sumber tanpa perlu restart server.

### ⌨️ 1.6 Interactive Glassmorphic Shortcuts & Viewport Fit Controls
- **Deskripsi:** Pintasan keyboard interaktif untuk kontrol tampilan yang efisien:
  - `Z` : **Zen Mode** (Sembunyikan semua panel untuk tampilan bersih).
  - `Shift + W` : **Fit Canvas Viewport** (Sesuaikan rasio tampilan video).
  - `G` : **GPU Management Overlay**.
  - `?` : **Help Shortcuts Modal**.

---

## 2. 🔬 Vision Framework & Algoritma Ergonomi (Core Engine)

- **2D Pose Extraction (YOLOv8-Pose):** Melacak 17 titik koordinat sendi tubuh (*H36M keypoints format*) secara real-time pada 30+ FPS di CPU.
- **REBA Biomechanics Engine (`src/ergonomics.py`):** Algoritma perhitungan sudut ergonomi untuk keselamatan pengangkatan:
  - **Trunk Bending (Fleksi Punggung):** Batas aman $\le 20^\circ$.
  - **Knee Squat (Tekukan Lutut):** Mengharuskan tekukan lutut ($> 90^\circ$) untuk menyalurkan beban ke paha.
  - **Waist Twisting (Kemiringan/Pilinan Pinggang):** Menghindari pilinan pinggang ($< 15^\circ$).
  - **Shoulder Tilt & Load Distance:** Mengukur kemiringan bahu dan jarak beban dari tubuh.

---

## 3. 🖥️ Arsitektur Web & Real-Time Alert System

- **Backend:** FastAPI + Uvicorn ASGI Server + Jinja2 Template Partials.
- **Frontend:** HTMX `v2.0.10` + Glassmorphism Vanilla CSS + SSE Extension (`htmx-ext-sse`).
- **Server-Sent Events (SSE) Broadcaster (`/api/sse/alerts`):** Memancar (*broadcast*) kartu peringatan bahaya (*Hazard Alert Cards*) secara otomatis ke panel `🚨 LIVE HAZARD ALERT LOGS` tanpa me-reload halaman.
- **Modular Directory Layout:**
  - `app/main.py` — Entrypoint ASGI & static mounting
  - `app/config.py` — Pengaturan sistem & path
  - `app/routes/hud.py` — Render partials HTMX (`/`, `/hud/left-drawer`, `/hud/right-sidesheet`)
  - `app/routes/api.py` — REST API, stream MJPEG, & endpoint SSE
  - `app/services/detector.py` — Background thread capture & REBA evaluator
  - `app/services/sse_manager.py` — Async queue broadcaster
  - `app/templates/partials/` — 6 komponen partial HTML
