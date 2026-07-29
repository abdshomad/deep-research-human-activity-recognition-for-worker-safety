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
    $0^\\circ$ means upright, larger angles mean bending forward or backward.
    """
    sh_mid = (np.array(left_shoulder[:2]) + np.array(right_shoulder[:2])) / 2.0
    hip_mid = (np.array(left_hip[:2]) + np.array(right_hip[:2])) / 2.0
    
    trunk_vector = sh_mid - hip_mid
    vertical_vector = np.array([0, -1])  # Points straight up in image coordinates (y decreases upwards)
    
    cosine_angle = np.dot(trunk_vector, vertical_vector) / (np.linalg.norm(trunk_vector) * np.linalg.norm(vertical_vector) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return float(np.degrees(angle))

def calculate_shoulder_tilt(left_shoulder, right_shoulder):
    """
    Calculates the angle of the shoulders relative to the horizontal axis.
    Indicates lateral bending or asymmetric lifting.
    """
    sh_vec = np.array(right_shoulder[:2]) - np.array(left_shoulder[:2])
    # Angle relative to horizontal [1, 0]
    horizontal = np.array([1, 0])
    cosine_angle = np.dot(sh_vec, horizontal) / (np.linalg.norm(sh_vec) * np.linalg.norm(horizontal) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    
    # We want tilt relative to horizontal, which is deviation from 0 degrees (if shoulders are horizontal)
    # Since sh_vec goes from left to right, it should be horizontal (0 deg or 180 deg depending on direction)
    deg = float(np.degrees(angle))
    # Normalize to 0-90 tilt
    tilt = abs(deg - 0) if deg < 90 else abs(180 - deg)
    return tilt

def calculate_twist_angle(left_shoulder, right_shoulder, left_hip, right_hip):
    """
    Estimates body twisting by calculating the angle difference (in 2D projection)
    between the shoulder line and the hip line.
    """
    sh_vec = np.array(right_shoulder[:2]) - np.array(left_shoulder[:2])
    hip_vec = np.array(right_hip[:2]) - np.array(left_hip[:2])
    
    cosine_angle = np.dot(sh_vec, hip_vec) / (np.linalg.norm(sh_vec) * np.linalg.norm(hip_vec) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return float(np.degrees(angle))

def calculate_neck_angle(left_shoulder, right_shoulder, nose, left_ear=None, right_ear=None):
    """
    Calculates neck angle relative to the vertical line.
    Uses nose and shoulder midpoint.
    """
    sh_mid = (np.array(left_shoulder[:2]) + np.array(right_shoulder[:2])) / 2.0
    
    # Head point: ear midpoint if available, otherwise nose
    if left_ear is not None and right_ear is not None:
        head_point = (np.array(left_ear[:2]) + np.array(right_ear[:2])) / 2.0
    else:
        head_point = np.array(nose[:2])
        
    neck_vector = head_point - sh_mid
    vertical_vector = np.array([0, -1])
    
    cosine_angle = np.dot(neck_vector, vertical_vector) / (np.linalg.norm(neck_vector) * np.linalg.norm(vertical_vector) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return float(np.degrees(angle))

def evaluate_ergonomics(keypoints, conf_threshold=0.5):
    """
    Evaluates keypoints list/array (shape: 17x3 or 17x2) from YOLOv8-pose.
    Returns a dictionary with angles and ergonomic classification.
    """
    # Keypoint indexes in COCO:
    # 0: nose, 3: l_ear, 4: r_ear, 5: l_shoulder, 6: r_shoulder
    # 11: l_hip, 12: r_hip, 13: l_knee, 14: r_knee, 15: l_ankle, 16: r_ankle
    # 9: l_wrist, 10: r_wrist
    
    kp = np.array(keypoints)
    
    # Helper to check confidence
    def is_visible(idx):
        if kp.shape[1] < 3:  # Only [x, y] coordinates
            return True
        return kp[idx, 2] >= conf_threshold

    # Required core points for trunk angle
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
    
    # Knee calculation (depends on visibility of hip, knee, ankle)
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
        # Normalize distance using shoulder width
        wrist_hip_dist = float(np.mean(distances) / sh_width)

    # Logic Classification based on REBA and ergonomics
    # 1. Trunk Angle Check
    reba_trunk_score = 1
    if trunk_angle > 60:
        reba_trunk_score = 4
    elif trunk_angle > 20:
        reba_trunk_score = 3
    elif trunk_angle > 5:
        reba_trunk_score = 2
        
    # Additional penalty for twisting or lateral tilt
    if twist_angle > 15 or shoulder_tilt > 10:
        reba_trunk_score += 1
        
    # 2. Knee / Lift technique Check
    # Stoop Lift: bending trunk (> 20) while knees are relatively straight (> 150)
    is_stoop_lift = (trunk_angle > 25) and (avg_knee_angle > 145)
    
    # Determine risk level
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
    else:
        risk_level = "AMAN"
        
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
            "is_stoop_lift": bool(is_stoop_lift)
        }
    }
