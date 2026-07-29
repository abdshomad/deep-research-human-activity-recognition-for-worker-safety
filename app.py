import streamlit as st
import cv2
import numpy as np
import tempfile
import time
import os
from ultralytics import YOLO
from src.ergonomics import evaluate_ergonomics

# Page config
st.set_page_config(
    page_title="AI Ergonomic Unsafe Lifting Detector",
    page_icon="🦾",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for modern design
st.markdown("""
<style>
    .main {
        background-color: #f8f9fa;
    }
    .stAlert {
        border-radius: 10px;
    }
    .metric-card {
        background-color: white;
        padding: 15px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        margin-bottom: 15px;
        border-left: 5px solid #ccc;
    }
    .metric-card.aman {
        border-left-color: #2ece71;
    }
    .metric-card.waspada {
        border-left-color: #f1c40f;
    }
    .metric-card.bahaya {
        border-left-color: #e74c3c;
    }
    .title-text {
        font-family: 'Inter', sans-serif;
        font-weight: 800;
        color: #2c3e50;
    }
</style>
""", unsafe_allow_html=True)

# Helper function to draw keypoints and skeleton on frame
# Helper function to draw keypoints and skeleton on frame for multiple workers
def draw_skeleton(frame, keypoints, risk_level, worker_id, conf_threshold=0.5):
    # Determine color (BGR format)
    if risk_level == "AMAN":
        color_bgr = (113, 204, 46)   # Light Green
    elif risk_level == "WASPADA":
        color_bgr = (15, 196, 241)   # Yellow
    elif risk_level == "BAHAYA":
        color_bgr = (60, 76, 231)    # Red
    else:
        color_bgr = (166, 165, 149)  # Gray
        
    connections = [
        (5, 6),       # shoulder-shoulder
        (5, 7), (7, 9),   # left arm
        (6, 8), (8, 10),  # right arm
        (11, 12),     # hip-hip
        (11, 13), (13, 15), # left leg
        (12, 14), (14, 16), # right leg
        (5, 11), (6, 12)    # torso side lines
    ]
    
    # Draw skeleton lines
    for p1, p2 in connections:
        if keypoints[p1][2] > conf_threshold and keypoints[p2][2] > conf_threshold:
            pt1 = (int(keypoints[p1][0]), int(keypoints[p1][1]))
            pt2 = (int(keypoints[p2][0]), int(keypoints[p2][1]))
            cv2.line(frame, pt1, pt2, color_bgr, 3)
            
    # Draw joint dots
    for idx, kp in enumerate(keypoints):
        if kp[2] > conf_threshold:
            # Skip drawing facial points to avoid clutter, keep only nose (0)
            if idx > 0 and idx < 5:
                continue
            pt = (int(kp[0]), int(kp[1]))
            cv2.circle(frame, pt, 5, (255, 255, 255), -1)
            cv2.circle(frame, pt, 6, color_bgr, 2)
            
    # Draw worker ID and risk label above head
    nose = keypoints[0]
    l_shoulder = keypoints[5]
    r_shoulder = keypoints[6]
    
    if nose[2] > conf_threshold:
        text_pos = (int(nose[0]), int(nose[1]) - 30)
    elif l_shoulder[2] > conf_threshold and r_shoulder[2] > conf_threshold:
        mid_x = int((l_shoulder[0] + r_shoulder[0]) / 2)
        mid_y = int((l_shoulder[1] + r_shoulder[1]) / 2)
        text_pos = (mid_x, mid_y - 40)
    else:
        visible_kps = [k for k in keypoints if k[2] > conf_threshold]
        if visible_kps:
            text_pos = (int(visible_kps[0][0]), int(visible_kps[0][1]) - 30)
        else:
            text_pos = (50, 50)
            
    label_text = f"Pek. {worker_id}: {risk_level}"
    (w, h), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
    
    tx = max(10, text_pos[0] - w // 2)
    ty = max(20, text_pos[1])
    
    # Draw solid background box for label
    cv2.rectangle(frame, (tx - 4, ty - h - 4), (tx + w + 4, ty + 4), color_bgr, -1)
    # Write white text on it
    cv2.putText(frame, label_text, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
            
    return frame

def render_workers_stats(workers_data):
    if not workers_data:
        st.info("⚠️ Tidak ada pekerja yang terdeteksi secara jelas.")
        return
        
    # Determine overall status
    levels = [w["risk_level"] for w in workers_data]
    if "BAHAYA" in levels:
        overall_risk = "BAHAYA"
        color_hex = "#e74c3c"
        card_class = "bahaya"
        reasons_summary = f"Terdeteksi {levels.count('BAHAYA')} pekerja dalam kondisi berbahaya!"
    elif "WASPADA" in levels:
        overall_risk = "WASPADA"
        color_hex = "#f1c40f"
        card_class = "waspada"
        reasons_summary = f"Terdeteksi {levels.count('WASPADA')} pekerja dalam pengawasan."
    else:
        overall_risk = "AMAN"
        color_hex = "#2ece71"
        card_class = "aman"
        reasons_summary = "Semua pekerja terdeteksi aman."
        
    st.markdown(f"""
    <div class="metric-card {card_class}" style="text-align: center;">
        <h2 style="margin: 0; color: {color_hex};">{overall_risk}</h2>
        <p style="margin: 0; font-size: 14px; color: #555;">Status Keseluruhan ({len(workers_data)} Pekerja)</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold; color: #777;">{reasons_summary}</p>
    </div>
    """, unsafe_allow_html=True)
    
    # List each worker details
    for w in workers_data:
        w_id = w["id"]
        w_risk = w["risk_level"]
        details = w["details"]
        reasons = w["reasons"]
        
        # Color emoji for expander title
        emoji = "🔴" if w_risk == "BAHAYA" else ("🟡" if w_risk == "WASPADA" else "🟢")
        
        with st.expander(f"{emoji} Pekerja {w_id} - {w_risk}", expanded=(w_risk == "BAHAYA")):
            st.markdown(f"""
            **Metrik Sudut Sendi:**
            - 📐 **Sudut Punggung (Trunk):** `{details['trunk_angle']}°` *(Aman: <20°)*
            - 🦵 **Sudut Lutut (Knee):** `{details['knee_angle'] if details['knee_angle'] is not None else 'N/A'}°` *(Squat: <135°)*
            - 🔄 **Rotasi Pinggang (Twist):** `{details['twist_angle']}°` *(Aman: <15°)*
            - 📐 **Kemiringan Bahu (Tilt):** `{details['shoulder_tilt']}°` *(Aman: <10°)*
            - 📦 **Jarak Beban-Tubuh:** `{details['wrist_hip_dist_normalized']}x` *(Aman: <1.8x)*
            """)
            
            if reasons:
                reasons_html = "".join([f"<li>⚠️ {r}</li>" for r in reasons])
                st.markdown(f"""
                <div style="background-color: #ffeef0; padding: 10px; border-radius: 6px; border: 1px solid #ffccd1; margin-top: 5px; margin-bottom: 5px;">
                    <ul style="margin: 0; padding-left: 15px; color: #b32d2f; font-size: 13px;">
                        {reasons_html}
                    </ul>
                </div>
                """, unsafe_allow_html=True)
            
            # Recommendation
            if w_risk == "BAHAYA":
                st.error("🚨 **TINDAKAN SEGERA:** Pekerja membungkuk terlalu dalam atau terpelintir. Harap tekuk lutut dan luruskan punggung!")
            elif w_risk == "WASPADA":
                st.warning("⚠️ **HIMBAUAN:** Dekatkan barang ke tubuh dan kurangi membungkuk berlebihan.")
            else:
                st.success("✅ **POSTUR BAIK:** Teknik pengangkatan sudah sesuai standar ergonomi.")

# Header
st.write("""
# 🦾 AI Unsafe Lifting Detector (Ergonomics K3)
Sistem computer vision menggunakan model **YOLOv8-Pose** untuk mendeteksi postur pengangkatan beban yang tidak ergonomis secara real-time berdasarkan standar **REBA** dan **NIOSH**.
""")
st.divider()

# Load YOLOv8-pose model
@st.cache_resource
def load_model(model_name):
    # This will load from local, or download from ultralytics automatically
    model = YOLO(model_name)
    return model

# Sidebar Configuration
st.sidebar.header("⚙️ Konfigurasi Sistem")
model_option = st.sidebar.selectbox(
    "Pilih Model YOLOv8-Pose:",
    ["yolov8n-pose.pt", "yolov8s-pose.pt"],
    index=0,
    help="Model 'n' (nano) adalah yang paling ringan dan cepat. Model 's' (small) lebih akurat namun lebih berat."
)

conf_threshold = st.sidebar.slider(
    "Keypoint Confidence Threshold:",
    min_value=0.1,
    max_value=1.0,
    value=0.5,
    step=0.05,
    help="Batas keypoints yang dideteksi model untuk dihitung sudutnya (disarankan: 0.5)"
)

source_option = st.sidebar.radio(
    "Pilih Sumber Video:",
    ["Unggah Video (.mp4 / .avi)", "Webcam Laptop (Real-time)"]
)

# Load model
try:
    with st.spinner(f"Memuat model {model_option}..."):
        model = load_model(model_option)
    st.sidebar.success("✅ Model berhasil dimuat!")
except Exception as e:
    st.sidebar.error(f"❌ Gagal memuat model: {e}")

# Layout Columns
col_video, col_stats = st.columns([2, 1.2])

with col_video:
    st.subheader("🎥 Video Monitor")
    video_placeholder = st.empty()

with col_stats:
    st.subheader("📊 Analisis Postur Real-time")
    stats_placeholder = st.empty()

# Initialization of placeholders
stats_placeholder.info("Menunggu input video...")

if source_option == "Unggah Video (.mp4 / .avi)":
    uploaded_file = st.file_uploader("Pilih file video...", type=["mp4", "avi", "mov", "mkv"])
    
    if uploaded_file is not None:
        # Save uploaded file to temp file
        tfile = tempfile.NamedTemporaryFile(delete=False)
        tfile.write(uploaded_file.read())
        tfile.close()
        
        cap = cv2.VideoCapture(tfile.name)
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 30.0
            
        frame_delay = 1.0 / fps
        
        start_btn = st.button("▶️ Mulai Analisis Video")
        
        if start_btn:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Resize frame for faster processing
                h, w = frame.shape[:2]
                target_w = 640
                target_h = int((target_w / w) * h)
                frame = cv2.resize(frame, (target_w, target_h))
                
                # Try tracking first for persistent IDs, fallback to predict
                try:
                    results = model.track(frame, persist=True, verbose=False)
                except Exception:
                    results = model(frame, verbose=False)
                
                workers_data = []
                
                # Process detection
                if len(results) > 0 and results[0].keypoints is not None:
                    keypoints_data = results[0].keypoints.data.cpu().numpy()
                    boxes = results[0].boxes
                    
                    ids = None
                    if boxes is not None and boxes.id is not None:
                        ids = boxes.id.int().cpu().tolist()
                        
                    for i, kp in enumerate(keypoints_data):
                        worker_id = ids[i] if ids is not None else i + 1
                        
                        # Evaluate ergonomics
                        eval_res = evaluate_ergonomics(kp, conf_threshold=conf_threshold)
                        if eval_res["status"] == "SUCCESS":
                            workers_data.append({
                                "id": worker_id,
                                "risk_level": eval_res["risk_level"],
                                "reasons": eval_res["reasons"],
                                "details": eval_res["details"]
                            })
                            
                            # Draw overlay skeleton
                            frame = draw_skeleton(frame, kp, eval_res["risk_level"], worker_id, conf_threshold=conf_threshold)
                
                # Display processed frame
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                video_placeholder.image(frame_rgb, use_container_width=True)
                
                # Display real-time statistics for all workers
                with stats_placeholder.container():
                    render_workers_stats(workers_data)
                
                time.sleep(frame_delay)
            
            cap.release()
            st.success("Analisis video selesai!")
            
            # Clean up temp file
            try:
                os.unlink(tfile.name)
            except Exception:
                pass

elif source_option == "Webcam Laptop (Real-time)":
    st.info("Catatan: Mode webcam akan membuka kamera internal komputer server lokal Anda secara real-time.")
    
    run_webcam = st.toggle("Aktifkan Webcam")
    
    if run_webcam:
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            st.error("Gagal membuka webcam. Pastikan kamera tidak sedang digunakan aplikasi lain.")
        else:
            while run_webcam:
                ret, frame = cap.read()
                if not ret:
                    st.error("Gagal membaca frame dari webcam.")
                    break
                
                # Mirror frame for intuitive view
                frame = cv2.flip(frame, 1)
                
                # Resize frame for faster processing
                h, w = frame.shape[:2]
                target_w = 640
                target_h = int((target_w / w) * h)
                frame = cv2.resize(frame, (target_w, target_h))
                
                # Try tracking first for persistent IDs, fallback to predict
                try:
                    results = model.track(frame, persist=True, verbose=False)
                except Exception:
                    results = model(frame, verbose=False)
                
                workers_data = []
                
                # Process detection
                if len(results) > 0 and results[0].keypoints is not None:
                    keypoints_data = results[0].keypoints.data.cpu().numpy()
                    boxes = results[0].boxes
                    
                    ids = None
                    if boxes is not None and boxes.id is not None:
                        ids = boxes.id.int().cpu().tolist()
                        
                    for i, kp in enumerate(keypoints_data):
                        worker_id = ids[i] if ids is not None else i + 1
                        
                        # Evaluate ergonomics
                        eval_res = evaluate_ergonomics(kp, conf_threshold=conf_threshold)
                        if eval_res["status"] == "SUCCESS":
                            workers_data.append({
                                "id": worker_id,
                                "risk_level": eval_res["risk_level"],
                                "reasons": eval_res["reasons"],
                                "details": eval_res["details"]
                            })
                            
                            # Draw overlay skeleton
                            frame = draw_skeleton(frame, kp, eval_res["risk_level"], worker_id, conf_threshold=conf_threshold)
                
                # Display processed frame
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                video_placeholder.image(frame_rgb, use_container_width=True)
                
                # Display real-time statistics for all workers
                with stats_placeholder.container():
                    render_workers_stats(workers_data)
                
                # Check for stop toggle
                time.sleep(0.01)
            
            cap.release()
            video_placeholder.empty()
            stats_placeholder.info("Webcam dinonaktifkan.")
