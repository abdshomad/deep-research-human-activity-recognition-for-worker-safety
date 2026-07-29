# 🛠️ Master Platform Feature Registry & Taksonomi Perilaku Berbahaya K3

> **Project Name:** WorkerSafety HUD - Real-Time AI Ergonomics & Multi-Behavior Unsafe Act Detection System  
> **Repository:** `caramengangkatyangbenar`  
> **Last Updated:** 2026-07-29  
> **Status:** Operational Web Application & Multi-Behavior Safety Monitoring Platform  

---

## 📌 Overview
Dokumen ini merupakan **Daftar Fitur Master** dan **Taksonomi Lengkap Perilaku Berbahaya (Unsafe Act)** yang dicatat berdasarkan implementasi nyata di repositori proyek serta riset lapangan pada `riset_unsafe_behavior_lapangan (1).md`.

---

## 1. 🚀 Fitur Baru, Perubahan UI & Kustomisasi Sistem

Berikut adalah daftar seluruh fitur baru, perubahan antarmuka, dan perbaikan teknis yang telah diterapkan:

### 📱 1.1 DroidCam & Direct IP Camera Stream Connector (`URL`)
- **Deskripsi:** Modul konektor stream IP Camera (MJPEG/HTTP) langsung di Left Drawer & Top HUD.
- **Kemampuan:** Menghubungkan kamera HP (Android/iOS) via DroidCam / IP Webcam nirkabel (contoh: `http://192.168.x.x:4747/video`).
- **Keunggulan:** Bebas kendala driver Virtual Camera Windows dan tidak membutuhkan kabel data.

### 🎥 1.2 Windows Multi-Camera Device Lock Release & DirectShow Switching
- **Deskripsi:** Arsitektur *Background Capture Thread* berbasis `cv2.CAP_DSHOW` dengan mekanisme penundaan rilis memori (`time.sleep(0.5)`).
- **Kemampuan:** 
  - Mencegah *device locking* (MSMF error) pada OS Windows saat perpindah antar-kamera.
  - Pergantian instan antara Webcam Laptop (Index 0), DroidCam Camera (Index 1), dan Kamera Eksternal (Index 2).
  - Lampu webcam laptop otomatis padam secara instan saat sumber video dialihkan ke file rekaman (`.mp4`).

### 🖼️ 1.3 Full-Cover Glassmorphic Video Viewport & Display Fix
- **Deskripsi:** Pembaruan styling pada elemen viewport utama (`main#stream-viewer-container` & `img#main-frame-img`).
- **Kemampuan:**
  - Video otomatis terisi penuh 100% (*width: 100%; height: 100%; object-fit: cover;*) tanpa terpotong atau menyusut menjadi kotak kecil di tengah saat diganti via HTMX (`set_source`).
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

## 2. ⚠️ Taksonomi & Daftar Lengkap Perilaku Berbahaya (Unsafe Act)

Berikut adalah matriks taksonomi lengkap perilaku & postur berbahaya di lapangan kerja berat (gudang, manufaktur, konstruksi) sesuai dokumen riset `riset_unsafe_behavior_lapangan (1).md` beserta status implementasinya dalam sistem:

| No | Kategori Perilaku Berbahaya | Contoh Postur / Perilaku Spesifik | Metode Computer Vision | Status Implementasi |
|---|---|---|---|:---:|
| 1 | **Unsafe Lifting Ergonomics** | Mengangkat dengan membungkuk (*stoop lift*), fleksi torso $>20^\circ$, pilinan pinggang (*twisting* $>15^\circ$), overreaching | YOLOv8-Pose + REBA Biomechanics Engine (`src/ergonomics.py`) | 🟢 **Aktif (Live)** |
| 2 | **Berlari / Gerakan Tergesa (Running)** | Berlari di lorong kerja, tergesa-gesa dekat kendaraan | Centroid Velocity Tracking antar-frame | 🟢 **Aktif (Live)** |
| 3 | **Distraksi / Penggunaan Gadget** | Menggunakan HP saat bekerja, menatap ke bawah sambil berjalan | Wrist-to-Face Proximity + Head Pitch Angle | 🟢 **Aktif (Live)** |
| 4 | **Memasuki Zona Terlarang** | Memasuki area mesin aktif, lintasan forklift, atau area bahaya | Virtual Geofencing (Foot-in-Polygon Check) | 🟢 **Aktif (Live)** |
| 5 | **Postur Statis Janggal** | Menahan posisi bungkuk/jongkok dalam waktu lama tanpa jeda | Cumulative Posture Timer ($>10\text{s}$) | 🟢 **Aktif (Live)** |
| 6 | **Ketidakpatuhan APD (PPE)** | Tidak memakai helm, rompi keselamatan (*safety vest*), sepatu safety | Object Detection (YOLOv8 PPE model) + Person BBox Mapping | 🟡 *Fase Penggantian Model* |
| 7 | **Interaksi Berisiko Forklift** | Berjalan terlalu dekat forklift, berada di titik buta (*blind spot*) | Bounding Box Proximity + Trajectory Prediction | 🟡 *Fase Penggantian Model* |
| 8 | **Bekerja di Ketinggian** | Naik ke rak/tangga tanpa harness, tanpa 3 titik kontak | Harness/Lanyard Object Detection + Height Estimation | 🟡 *Fase Penggantian Model* |
| 9 | **Merokok di Area Terlarang** | Merokok di dekat bahan mudah terbakar/fuel storage | Small Object Detection (YOLO Small-Object) + Smoke Filter | 🟡 *Fase Penggantian Model* |
| 10 | **Kelelahan & Microsleep** | Mengantuk saat mengoperasikan alat berat, kepala mengangguk | Facial Landmark EAR (Eye Aspect Ratio), PERCLOS, MAR | 🟡 *Fase Penggantian Model* |
| 11 | **Horseplay / Bercanda Berbahaya** | Saling dorong, bergulat, berkendara ugal-ugalan | Anomaly Action Recognition (Skeleton-based) | ⚪ *Fase Lanjutan* |
| 12 | **Housekeeping Berbahaya** | Barang menghalangi jalur evakuasi/APAR, menumpuk berlebih | Area Object Detection + Evacuation Path Checking | ⚪ *Fase Lanjutan* |
| 13 | **Ketidakpatuhan LOTO** | Bekerja pada mesin aktif tanpa mengunci sumber energi | Vision + IoT Machine Sensor Status | ⚪ *Fase Lanjutan* |
| 14 | **Overcrowding / Kerumunan** | Kepadatan berlebih pekerja di satu titik berbahaya | People Counting & Density Estimation | ⚪ *Fase Lanjutan* |

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
