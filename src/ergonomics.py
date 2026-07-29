import numpy as np

def calculate_angle(a, b, c):
    """
    Calculates the 2D angle (in degrees) formed at point B by line segments AB and BC.
    a, b, c are arrays/lists of [x, y].
    """
    a = np.array(a[:2])
    b = np.array(b[:2])
    c = np.array(c[:2])
    
    ba = a - b
    bc = c - b
    
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    
    return float(np.degrees(angle))

def calculate_trunk_angle(left_shoulder, right_shoulder, left_hip, right_hip):
    """
    Calculates the angle (in degrees) of the torso/trunk relative to the vertical axis.
    0° means upright, larger angles mean bending forward or backward.
    """
    sh_mid = (np.array(left_shoulder[:2]) + np.array(right_shoulder[:2])) / 2.0
    hip_mid = (np.array(left_hip[:2]) + np.array(right_hip[:2])) / 2.0
    
    trunk_vector = sh_mid - hip_mid
    vertical_vector = np.array([0, -1])  # Points straight up in image coordinates
    
    cosine_angle = np.dot(trunk_vector, vertical_vector) / (np.linalg.norm(trunk_vector) * np.linalg.norm(vertical_vector) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return float(np.degrees(angle))

def calculate_shoulder_tilt(left_shoulder, right_shoulder):
    """
    Calculates the angle of the shoulders relative to the horizontal axis.
    """
    sh_vec = np.array(right_shoulder[:2]) - np.array(left_shoulder[:2])
    horizontal = np.array([1, 0])
    cosine_angle = np.dot(sh_vec, horizontal) / (np.linalg.norm(sh_vec) * np.linalg.norm(horizontal) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    deg = float(np.degrees(angle))
    tilt = abs(deg - 0) if deg < 90 else abs(180 - deg)
    return tilt

def calculate_twist_angle(left_shoulder, right_shoulder, left_hip, right_hip):
    """
    Estimates body twisting by calculating the angle difference between shoulder and hip lines.
    """
    sh_vec = np.array(right_shoulder[:2]) - np.array(left_shoulder[:2])
    hip_vec = np.array(right_hip[:2]) - np.array(left_hip[:2])
    
    cosine_angle = np.dot(sh_vec, hip_vec) / (np.linalg.norm(sh_vec) * np.linalg.norm(hip_vec) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return float(np.degrees(angle))

def calculate_neck_angle(left_shoulder, right_shoulder, nose, left_ear=None, right_ear=None):
    """
    Calculates neck angle relative to the vertical line.
    """
    sh_mid = (np.array(left_shoulder[:2]) + np.array(right_shoulder[:2])) / 2.0
    if left_ear is not None and right_ear is not None:
        head_point = (np.array(left_ear[:2]) + np.array(right_ear[:2])) / 2.0
    else:
        head_point = np.array(nose[:2])
        
    neck_vector = head_point - sh_mid
    vertical_vector = np.array([0, -1])
    
    cosine_angle = np.dot(neck_vector, vertical_vector) / (np.linalg.norm(neck_vector) * np.linalg.norm(vertical_vector) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return float(np.degrees(angle))

def evaluate_phone_distraction(kp, conf_threshold=0.5):
    """
    Detects phone usage / distraction based on wrist-to-head proximity and head pitch.
    COCO Keypoints: 0: nose, 9: l_wrist, 10: r_wrist, 5: l_sh, 6: r_sh
    """
    def is_vis(i):
        return kp.shape[1] >= 3 and kp[i, 2] >= conf_threshold
        
    if not (is_vis(5) and is_vis(6) and is_vis(0)):
        return False, 0.0
        
    sh_width = np.linalg.norm(np.array(kp[6][:2]) - np.array(kp[5][:2]))
    if sh_width <= 0:
        return False, 0.0
        
    nose_pt = np.array(kp[0][:2])
    min_dist_norm = 999.0
    
    for w_idx in [9, 10]:
        if is_vis(w_idx):
            w_pt = np.array(kp[w_idx][:2])
            d_norm = np.linalg.norm(w_pt - nose_pt) / sh_width
            if d_norm < min_dist_norm:
                min_dist_norm = d_norm
                
    # Distraction condition: hand near head/face (< 1.1x shoulder width)
    is_distracted = (min_dist_norm < 1.1)
    return is_distracted, float(min_dist_norm)

def evaluate_running_behavior(speed_px_per_sec, sh_width_px):
    """
    Detects running / hasty locomotion from centroid velocity.
    """
    if sh_width_px <= 0:
        return False, 0.0
        
    normalized_speed = speed_px_per_sec / sh_width_px
    is_running = (normalized_speed > 3.2)  # High movement speed threshold relative to body size
    return is_running, float(normalized_speed)

def evaluate_zone_intrusion(feet_pts, zone_polygon):
    """
    Checks if foot coordinates fall inside a restricted polygon area.
    zone_polygon is a list of [x, y] vertices.
    """
    if not zone_polygon or len(zone_polygon) < 3:
        return False
        
    from matplotlib.path import Path
    poly_path = Path(zone_polygon)
    
    for pt in feet_pts:
        if poly_path.contains_point(pt[:2]):
            return True
    return False

def evaluate_ergonomics(keypoints, conf_threshold=0.5):
    """
    Evaluates keypoints list/array (shape: 17x3 or 17x2) from YOLOv8-pose.
    Returns a dictionary with angles and ergonomic classification.
    """
    kp = np.array(keypoints)
    
    def is_visible(idx):
        if kp.shape[1] < 3:
            return True
        return kp[idx, 2] >= conf_threshold

    core_points = [5, 6, 11, 12]  # shoulders & hips
    if not all(is_visible(i) for i in core_points):
        return {
            "status": "INSUFFICIENT_DATA",
            "message": "Badan pekerja kurang terlihat jelas",
            "risk_level": "UNKNOWN",
            "details": {}
        }
        
    l_sh, r_sh = kp[5], kp[6]
    l_hip, r_hip = kp[11], kp[12]
    
    # Calculations
    trunk_angle = calculate_trunk_angle(l_sh, r_sh, l_hip, r_hip)
    shoulder_tilt = calculate_shoulder_tilt(l_sh, r_sh)
    twist_angle = calculate_twist_angle(l_sh, r_sh, l_hip, r_hip)
    
    # Knee calculation
    left_knee_visible = is_visible(11) and is_visible(13) and is_visible(15)
    right_knee_visible = is_visible(12) and is_visible(14) and is_visible(16)
    
    knee_angles = []
    if left_knee_visible:
        knee_angles.append(calculate_angle(kp[11], kp[13], kp[15]))
    if right_knee_visible:
        knee_angles.append(calculate_angle(kp[12], kp[14], kp[16]))
        
    avg_knee_angle = np.mean(knee_angles) if knee_angles else 180.0
    
    # Neck calculation
    neck_angle = None
    if is_visible(0):
        l_ear = kp[3] if is_visible(3) else None
        r_ear = kp[4] if is_visible(4) else None
        neck_angle = calculate_neck_angle(l_sh, r_sh, kp[0], l_ear, r_ear)

    # Overreach (wrist to hip distance)
    wrist_hip_dist = 0.0
    sh_width = np.linalg.norm(np.array(r_sh[:2]) - np.array(l_sh[:2]))
    
    distances = []
    if is_visible(9) and is_visible(11):
        distances.append(np.linalg.norm(np.array(kp[9][:2]) - np.array(kp[11][:2])))
    if is_visible(10) and is_visible(12):
        distances.append(np.linalg.norm(np.array(kp[10][:2]) - np.array(kp[12][:2])))
        
    if distances and sh_width > 0:
        wrist_hip_dist = float(np.mean(distances) / sh_width)

    # Logic Classification based on REBA
    reba_trunk_score = 1
    if trunk_angle > 60:
        reba_trunk_score = 4
    elif trunk_angle > 20:
        reba_trunk_score = 3
    elif trunk_angle > 5:
        reba_trunk_score = 2
        
    if twist_angle > 15 or shoulder_tilt > 10:
        reba_trunk_score += 1
        
    is_stoop_lift = (trunk_angle > 25) and (avg_knee_angle > 145)
    
    # Evaluate Hand-to-Face / Hand-to-Mouth (Phone Distraction / Smoking posture)
    is_hand_to_face, hand_face_dist = evaluate_phone_distraction(kp, conf_threshold)
    
    risk_level = "AMAN"
    reasons = []
    
    if reba_trunk_score >= 4 or is_stoop_lift:
        risk_level = "BAHAYA"
        if is_stoop_lift:
            reasons.append("Mengangkat dengan membungkuk (stoop lift) - Gunakan kaki/squat!")
        if trunk_angle > 60:
            reasons.append("Batang tubuh membungkuk sangat ekstrem (>60°)")
        elif twist_angle > 15:
            reasons.append("Tubuh terpelintir (twisting) saat membungkuk")
    elif reba_trunk_score == 3 or trunk_angle > 20 or wrist_hip_dist > 1.8:
        risk_level = "WASPADA"
        if trunk_angle > 20:
            reasons.append("Batang tubuh membungkuk sedang (20°-60°)")
        if wrist_hip_dist > 1.8:
            reasons.append("Beban terlalu jauh dari tubuh (overreaching)")
        if twist_angle > 15:
            reasons.append("Tubuh terpelintir (twisting) ringan")

    if is_hand_to_face:
        if risk_level == "AMAN":
            risk_level = "WASPADA"
        reasons.append("📱🚬 Distraksi / Potensi Merokok: Tangan di Dekat Wajah & Mulut")

    return {
        "status": "SUCCESS",
        "risk_level": risk_level,
        "reasons": reasons,
        "details": {
            "trunk_angle": float(round(trunk_angle, 1)),
            "knee_angle": float(round(avg_knee_angle, 1)) if knee_angles else None,
            "neck_angle": float(round(neck_angle, 1)) if neck_angle is not None else None,
            "twist_angle": float(round(twist_angle, 1)),
            "shoulder_tilt": float(round(shoulder_tilt, 1)),
            "wrist_hip_dist_normalized": float(round(wrist_hip_dist, 2)),
            "is_stoop_lift": bool(is_stoop_lift),
            "is_distracted": bool(is_distracted)
        }
    }
