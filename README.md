# 🛡️ WorkerSafety HUD — Real-Time AI Ergonomics & Multi-Behavior Unsafe Act Detection System

> **Sistem pemantauan keselamatan kerja real-time berbasis Computer Vision & AI**, yang mendeteksi postur berbahaya pekerja secara langsung melalui kamera (webcam, DroidCam, atau IP Camera), dan menampilkannya pada dasbor web HUD (Heads-Up Display) dengan peringatan visual otomatis.

---

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Arsitektur Teknologi](#-arsitektur-teknologi)
- [Prasyarat Sistem](#-prasyarat-sistem)
- [Instalasi](#-instalasi)
- [Model AI yang Dibutuhkan](#-model-ai-yang-dibutuhkan)
- [Menjalankan Aplikasi](#-menjalankan-aplikasi)
- [Koneksi Kamera](#-koneksi-kamera)
- [Pintasan Keyboard](#-pintasan-keyboard)
- [Struktur Proyek](#-struktur-proyek)
- [Dokumentasi Lanjutan](#-dokumentasi-lanjutan)

---

## ⚡ Fitur Utama

Sistem ini mendeteksi **5 kategori perilaku berbahaya secara real-time** menggunakan 1 model AI ringan (YOLOv8-Pose):

| No | Modul Deteksi | Deskripsi |
|---|---|---|
| 1 | 🏋️ **Unsafe Lifting Ergonomics** | Deteksi postur mengangkat beban dengan REBA scoring (membungkuk, twist pinggang, overreaching) |
| 2 | 🏃 **Berlari di Area Kerja** | Pelacakan kecepatan gerak pekerja (centroid velocity tracking) |
| 3 | 📱🚬 **Distraksi Gadget & Potensi Merokok** | Deteksi tangan di dekat wajah/mulut (wrist-to-face proximity) |
| 4 | ⛔ **Memasuki Zona Terlarang** | Virtual geofencing dengan polygon check pada koordinat kaki |
| 5 | ⏳ **Postur Statis Berkelanjutan** | Pelacakan durasi posisi bungkuk/jongkok (>10 detik) |

**Fitur Tambahan:**
- 🎥 Dukungan multi-kamera: Webcam laptop, DroidCam (HP), dan IP Camera
- 🖥️ Tampilan dasbor web HUD glassmorphism full-screen
- 📡 Server-Sent Events (SSE) untuk alert real-time tanpa refresh halaman
- ⌨️ Pintasan keyboard (`F` Fullscreen, `Z` Zen Mode, `G` GPU Panel)
- 🩶 Skeleton visualizer dengan gray fallback mode

---

## 🏗️ Arsitektur Teknologi

| Komponen | Teknologi |
|---|---|
| **AI / Pose Estimation** | YOLOv8-Pose (Ultralytics) |
| **Backend** | FastAPI + Uvicorn (ASGI) |
| **Frontend** | HTMX v2.0 + Vanilla CSS (Glassmorphism) |
| **Video Processing** | OpenCV (cv2) |
| **Template Engine** | Jinja2 |
| **Real-Time Alerts** | Server-Sent Events (SSE) |
| **Runtime** | Python 3.10+ |

---

## 💻 Prasyarat Sistem

Sebelum instalasi, pastikan sistem Anda memenuhi persyaratan berikut:

- **Sistem Operasi:** Windows 10/11, Linux, atau macOS
- **Python:** Versi 3.10 atau lebih baru
- **RAM:** Minimal 4 GB (disarankan 8 GB)
- **Penyimpanan:** Minimal 2 GB ruang kosong
- **Kamera:** Webcam internal, DroidCam (HP), atau IP Camera (opsional)
- **GPU:** Tidak wajib — sistem ini **berjalan lancar di CPU** (AMD/Intel)

> **Catatan:** Jika Anda memiliki GPU NVIDIA dengan CUDA, instal versi PyTorch GPU untuk performa lebih cepat. Lihat [pytorch.org](https://pytorch.org/get-started/locally/) untuk panduan instalasi.

---

## 🚀 Instalasi

### Langkah 1 — Clone Repositori

```bash
git clone https://github.com/abdshomad/deep-research-human-activity-recognition-for-worker-safety.git
cd deep-research-human-activity-recognition-for-worker-safety
```

> Jika Anda ingin menggunakan branch pengembangan:
> ```bash
> git checkout ervan
> ```

### Langkah 2 — Buat Virtual Environment (Disarankan)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### Langkah 3 — Instal Semua Dependency

```bash
pip install -r requirements.txt
```

**Daftar dependency utama yang akan diinstal:**

| Paket | Fungsi |
|---|---|
| `ultralytics` | Engine YOLOv8 untuk pose estimation |
| `opencv-python` | Pengolahan video & gambar |
| `numpy` | Komputasi numerik (perhitungan sudut, jarak) |
| `torch` | Backend neural network (PyTorch) |
| `matplotlib` | Matematika polygon untuk virtual geofencing |
| `fastapi` | Framework web backend ASGI |
| `uvicorn` | Server ASGI untuk menjalankan FastAPI |
| `jinja2` | Merender template HTML |
| `python-multipart` | Pengunggahan file video via web |

> **Catatan untuk pengguna CPU (tanpa NVIDIA GPU):**
> PyTorch versi CPU akan otomatis terpasang. Tidak perlu konfigurasi tambahan.

---

## 🤖 Model AI yang Dibutuhkan

### Model Wajib (Harus Ada Sebelum Menjalankan Aplikasi)

Aplikasi ini memerlukan **1 file model utama** yang harus diletakkan di **root folder proyek** (sejajar dengan file `requirements.txt`):

| File Model | Ukuran | Fungsi | Lokasi Penyimpanan |
|---|---|---|---|
| **`yolov8n-pose.pt`** | ~6.8 MB | Model pose estimation (17 keypoints tubuh) | 📁 Root proyek (`./yolov8n-pose.pt`) |

#### Cara Mendapatkan Model:

**Opsi A — Download Otomatis (Paling Mudah):**

Model akan otomatis terunduh saat pertama kali menjalankan aplikasi jika belum ada. Ultralytics akan mengunduhnya dari server resmi.

**Opsi B — Download Manual:**

```bash
# Menggunakan Python
python -c "from ultralytics import YOLO; YOLO('yolov8n-pose.pt')"
```

Atau unduh langsung dari:
- 🔗 [Ultralytics YOLOv8 Releases (GitHub)](https://github.com/ultralytics/assets/releases)
- Cari file: `yolov8n-pose.pt`
- Letakkan di folder root proyek

**Opsi C — Model Lebih Akurat (Opsional):**

Jika Anda ingin akurasi lebih tinggi dengan sedikit penurunan kecepatan:

| File Model | Ukuran | Kecepatan | Akurasi |
|---|---|---|---|
| `yolov8n-pose.pt` | ~6.8 MB | ⚡ Tercepat (~30+ FPS di CPU) | ★★★☆☆ |
| `yolov8s-pose.pt` | ~23 MB | 🚀 Cepat (~15-20 FPS di CPU) | ★★★★☆ |
| `yolov8m-pose.pt` | ~52 MB | 🐢 Sedang (~8-12 FPS di CPU) | ★★★★★ |

Untuk mengganti model, ubah baris di file `app/config.py`:

```python
class Settings:
    MODEL_PATH: str = "yolov8s-pose.pt"  # Ganti nama model di sini
```

### Verifikasi Model Terpasang Dengan Benar

Setelah menempatkan file model, struktur folder Anda harus terlihat seperti ini:

```
📁 deep-research-human-activity-recognition-for-worker-safety/
├── 📄 yolov8n-pose.pt          ← ✅ FILE MODEL WAJIB (letakkan di sini!)
├── 📄 requirements.txt
├── 📁 app/
│   ├── main.py
│   ├── config.py
│   └── ...
├── 📁 src/
│   └── ergonomics.py
└── ...
```

> ⚠️ **PENTING:** Jika file `yolov8n-pose.pt` tidak ditemukan di root proyek, aplikasi akan error saat startup. Pastikan file model berada di lokasi yang benar!

---

## ▶️ Menjalankan Aplikasi

Setelah instalasi dan model sudah siap:

```bash
# Pastikan virtual environment aktif
# Windows: venv\Scripts\activate
# Linux/macOS: source venv/bin/activate

# Jalankan server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Buka browser dan akses:

```
http://localhost:8000
```

Anda akan melihat dasbor HUD WorkerSafety dengan video feed real-time.

---

## 📹 Koneksi Kamera

### Webcam Laptop (Default)
Secara default, aplikasi menggunakan webcam laptop (Index 0). Pilih **"Kamera Utama / Laptop (Index 0)"** di dropdown SUMBER pada navbar.

### DroidCam (Kamera HP via WiFi)

1. Instal aplikasi **DroidCam** di HP (Android/iOS) dan PC:
   - HP: Download dari Play Store / App Store
   - PC: Download dari [https://www.dev47apps.com/](https://www.dev47apps.com/)
2. Hubungkan HP dan PC ke **jaringan WiFi yang sama**
3. Buka DroidCam di HP, catat **IP Address** yang ditampilkan (contoh: `192.168.1.5`)
4. Di dasbor web WorkerSafety HUD, masukkan URL pada kolom **"DROIDCAM IP CAMERA (URL)"** di panel kiri:

```
http://192.168.1.5:4747/video
```

5. Klik tombol **"Connect DroidCam IP Stream"**

### IP Camera / CCTV
Masukkan URL stream RTSP atau HTTP kamera Anda di kolom yang sama:

```
rtsp://username:password@192.168.1.100:554/stream1
```

---

## ⌨️ Pintasan Keyboard

| Tombol | Fungsi |
|---|---|
| `F` | Full Screen Browser Mode |
| `Z` | Zen Mode (sembunyikan panel samping) |
| `Shift + W` | Fit Canvas Viewport |
| `G` | GPU Management Overlay |
| `?` | Tampilkan bantuan pintasan |

---

## 📁 Struktur Proyek

```
📁 Root Proyek/
│
├── 📄 requirements.txt             # Daftar dependency Python
├── 📄 yolov8n-pose.pt              # ⬇️ Model AI (WAJIB diunduh)
│
├── 📁 app/                         # Kode sumber aplikasi web
│   ├── 📄 __init__.py
│   ├── 📄 main.py                  # Entrypoint FastAPI (ASGI)
│   ├── 📄 config.py                # Konfigurasi sistem & path model
│   │
│   ├── 📁 routes/                  # Endpoint HTTP
│   │   ├── 📄 hud.py               # Render template HUD (/, /hud/*)
│   │   └── 📄 api.py               # REST API (video feed, camera switch, SSE, follow-up)
│   │
│   ├── 📁 services/                # Logika bisnis
│   │   ├── 📄 db.py                # Database SQLite & CRUD service
│   │   ├── 📄 detector.py          # Background thread: YOLO capture, multi-behavior evaluator, & auto-snapshot
│   │   └── 📄 sse_manager.py       # Async SSE broadcaster
│   │
│   └── 📁 templates/               # Template HTML
│       ├── 📄 base.html            # Base wrapper (fonts, CSS, HTMX)
│       ├── 📄 index.html           # Halaman utama dasbor HUD
│       └── 📁 partials/            # Komponen HTML modular
│           ├── 📄 top_hud.html
│           ├── 📄 bottom_hud.html
│           ├── 📄 left_drawer.html
│           ├── 📄 right_sidesheet.html
│           ├── 📄 hazard_item.html
│           ├── 📄 overall_badge.html
│           ├── 📄 modal_detail.html        # Modal detail pelanggaran & follow-up
│           └── 📄 violations_history.html   # Modal tabel log audit riwayat
│
├── 📁 src/                         # Modul algoritma inti
│   └── 📄 ergonomics.py            # REBA engine + multi-behavior evaluators
│
├── 📁 static/                      # Asset statis web
│   ├── 📁 css/                     # Stylesheet (hud_base.css, dll.)
│   └── 📁 violations/              # Folder penyimpanan otomatis snapshot (.jpg)
│
├── 📁 docs/                        # Dokumentasi
│   └── 📄 feature-list.md          # Daftar fitur aktif lengkap
│
└── 📁 tests/                       # Unit test
    ├── 📄 test_model.py
    └── 📄 test_violations.py       # Unit test database SQLite & API routing
```

---

## 🧪 Pengujian Unit Test

Aplikasi ini menggunakan pengujian otomatis berbasis TDD untuk memverifikasi integritas database dan fungsionalitas API.

Untuk menjalankan unit test, ketik perintah berikut pada shell/terminal:

```bash
py tests/test_violations.py
```

---

## 📚 Dokumentasi Lanjutan

- **Daftar fitur lengkap:** Lihat [docs/feature-list.md](docs/feature-list.md)
- **Riset perilaku berbahaya:** Lihat [riset_unsafe_behavior_lapangan (1).md](<riset_unsafe_behavior_lapangan (1).md>)

---

## 🔧 Troubleshooting

### ❌ "Model file not found" saat startup
- Pastikan file `yolov8n-pose.pt` sudah ada di folder root proyek.
- Jika belum ada, jalankan: `python -c "from ultralytics import YOLO; YOLO('yolov8n-pose.pt')"`

### ❌ Kamera tidak muncul / loading terus
- Pastikan kamera tidak sedang digunakan oleh aplikasi lain (Zoom, Teams, dll.)
- Untuk DroidCam: pastikan HP dan PC terhubung ke WiFi yang sama
- Jika memilih Index 2 tapi tidak ada kamera ketiga, layar akan menampilkan pesan error. Pilih Index 0 atau 1.

### ❌ "Port 8000 already in use"
- Hentikan proses yang menggunakan port 8000, atau gunakan port lain:
  ```bash
  python -m uvicorn app.main:app --host 0.0.0.0 --port 8080
  ```

### ❌ FPS sangat rendah / lambat
- Gunakan model `yolov8n-pose.pt` (versi Nano) untuk performa tercepat
- Pastikan tidak ada proses berat lain yang berjalan bersamaan
- Jika memiliki GPU NVIDIA, instal PyTorch versi CUDA untuk akselerasi

---

## 📄 Lisensi

Proyek ini dikembangkan untuk keperluan penelitian dan edukasi keselamatan kerja (K3).

---

## 👥 Kontributor

- **Ervan Fahri AW** — Pengembangan aplikasi & integrasi multi-behavior detection
- **Abd. Shomad** — Riset & referensi arsitektur Human Activity Recognition for Worker Safety
