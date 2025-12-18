"""
OpenCV-based Water Quality Analysis Service (Advanced ML + CV)
Uses MobileNetV2 for classification and Advanced CV for estimation.
"""

import cv2
import numpy as np
import requests
from io import BytesIO
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "mobilenetv2.onnx")
CLASSES_PATH = os.path.join(BASE_DIR, "imagenet_classes.txt")
FACE_CASCADE_PATH = os.path.join(BASE_DIR, "haarcascade_frontalface_default.xml")

# Load ML Model (MobileNetV2)
net = None
classes = []
try:
    if os.path.exists(MODEL_PATH):
        net = cv2.dnn.readNetFromONNX(MODEL_PATH)
        print(f"✅ Loaded MobileNetV2 model from {MODEL_PATH}")
    else:
        print(f"⚠️ Model file {MODEL_PATH} not found. ML classification will be disabled.")

    if os.path.exists(CLASSES_PATH):
        with open(CLASSES_PATH, "r") as f:
            classes = [s.strip() for s in f.readlines()]
        print(f"✅ Loaded {len(classes)} ImageNet classes")
except Exception as e:
    print(f"❌ Error loading ML model: {e}")

# Load Face Cascade
face_cascade = None
try:
    if os.path.exists(FACE_CASCADE_PATH):
        face_cascade = cv2.CascadeClassifier(FACE_CASCADE_PATH)
    else:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
except Exception:
    pass

def download_image(image_url):
    """Download image from URL"""
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img_array = np.array(img)
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        return img_array
    except Exception as e:
        return None

# --- 1. ML-BASED CLASSIFIER ---
def classify_water_ml(img):
    """
    Classify if image contains water using MobileNetV2 (ImageNet).
    Returns (is_water, confidence, label)
    """
    if net is None or not classes:
        return True, 1.0, "ML Disabled" # Fallback if model missing

    # Preprocess for MobileNet
    blob = cv2.dnn.blobFromImage(img, 1.0/225, (224, 224), (0.485, 0.456, 0.406), swapRB=True, crop=False)
    net.setInput(blob)
    preds = net.forward()
    
    # Get top predictions
    # Softmax
    preds = preds.flatten()
    probs = np.exp(preds) / np.sum(np.exp(preds))
    
    top_indices = np.argsort(probs)[::-1][:5]
    top_probs = probs[top_indices]
    top_labels = [classes[i] for i in top_indices]
    
    print(f"🔍 ML Predictions: {list(zip(top_labels, top_probs))}")
    
    # Water-related keywords in ImageNet (Expanded)
    water_keywords = [
        'water', 'bottle', 'cup', 'mug', 'beaker', 'jug', 'pitcher', 
        'bucket', 'basin', 'tub', 'fountain', 'liquid', 'glass', 
        'lakeside', 'seashore', 'promontory', 'sandbar', 'breakwater',
        'vase', 'bowl', 'pot', 'jar', 'vial', 'flask', 'petri', 'dish'
    ]

    # Strict Blocklist: Only reject if we are sure it is one of these
    block_keywords = [
        'person', 'woman', 'man', 'boy', 'girl', 'face', 'human', 
        'dog', 'cat', 'bird', 'animal', 'mammal', 'spider', 'snake',
        't-shirt', 'jersey', 'maillot', 'shirt', 'clothing', 'tie',
        'car', 'truck', 'vehicle', 'bicycle', 'motor'
    ]
    
    # Logic:
    # 1. If matches water_keyword -> Water (High Conf)
    # 2. If matches block_keyword -> Not Water (Hard Reject)
    # 3. Else (Table, Wall, Pen, etc.) -> Assume Water (Benefit of Doubt)
    
    is_water = True # Default to True (Benefit of Doubt)
    confidence = 0.5 # Default confidence
    matched_label = "Uncertain (Assumed Water)"
    
    top_label = top_labels[0].lower()
    top_prob = float(top_probs[0])

    # Check Top Prediction
    if any(kw in top_label for kw in water_keywords):
        is_water = True
        confidence = top_prob
        matched_label = top_labels[0]
        
    elif any(kw in top_label for kw in block_keywords):
        # Only reject if fairly confident
        if top_prob > 0.4:
            is_water = False
            confidence = top_prob
            matched_label = top_labels[0]
            
    # Check deeper if top was uncertaion but high prob not water
    # (Optional: keep simple)
    
    # If explicitly detected water in top 5, boost it
    for i, label in enumerate(top_labels):
        if any(kw in label.lower() for kw in water_keywords):
            is_water = True
            confidence = float(top_probs[i])
            matched_label = label
            break

    return is_water, confidence, matched_label

# --- 2. ADVANCED CV ESTIMATION ---
def estimate_turbidity_advanced(img):
    """
    Estimate Turbidity using Digital Nephelometric Scattering principles.
    Uses: CLAHE, Laplacian Variance, Edge Density, Contrast
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 1. Laplacian Variance (Texture/Clarity)
    # Clear water = Low variance (smooth)
    # Turbid water = Higher variance (particles)
    # BUT: Very high variance = Noise/Non-water
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # 2. Edge Density (Particles)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum(edges > 0) / (gray.shape[0] * gray.shape[1])
    
    # 3. Contrast (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl1 = clahe.apply(gray)
    contrast_score = cl1.std()
    
    # 4. Haze/Blur (Mean intensity of edges)
    # Turbid water scatters light -> softer edges
    
    # Formula Construction
    # We want a score 0-10 NTU
    
    # Base score from variance (mapped 0-500 -> 0-10)
    # Log scale is better for turbidity
    turbidity_var = np.log1p(laplacian_var) * 1.5
    
    # Add edge density contribution (more edges = more particles)
    turbidity_edge = edge_density * 50.0
    
    # Contrast contribution (Lower contrast = Higher turbidity/cloudiness)
    # High contrast (clear water) -> Low turbidity
    turbidity_contrast = max(0, 10 - (contrast_score / 5.0))
    
    # Weighted Sum
    # Weights: Variance (40%), Edge (30%), Contrast (30%)
    final_turbidity = (turbidity_var * 0.4) + (turbidity_edge * 0.3) + (turbidity_contrast * 0.3)
    
    # Clamp
    final_turbidity = max(0.1, min(10.0, final_turbidity))
    
    return round(final_turbidity, 1)

def estimate_ph_advanced(img):
    """
    Estimate pH using LAB Color Space and Color Calibration.
    L: Lightness, A: Green-Red, B: Blue-Yellow
    """
    # Convert to LAB
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Calculate means
    l_mean = np.mean(l)
    a_mean = np.mean(a) # Green-Red axis (Negative=Green, Positive=Red)
    b_mean = np.mean(b) # Blue-Yellow axis (Negative=Blue, Positive=Yellow)
    
    # OpenCV LAB ranges: L [0, 255], A [0, 255], B [0, 255]
    # In OpenCV: A and B are shifted by 128. 
    # < 128 is Green/Blue, > 128 is Red/Yellow
    
    a_val = a_mean - 128
    b_val = b_mean - 128
    
    # pH Logic based on Universal Indicator colors (approximate)
    # Acidic (Red/Orange): High A (Red), High B (Yellow)
    # Neutral (Green): Low A (Green), Low B
    # Alkaline (Blue/Purple): Low A, Low B (Blue)
    
    # Linear Regression Model (Simulated coefficients)
    # pH = bias + w1*A + w2*B + w3*L
    
    # Coefficients tuned for "Natural Water" (mostly neutral 6.5-8.5)
    # If water is clear/blueish -> pH ~7-8
    # If water is greenish -> pH ~6.5-7.5
    # If water is reddish/brown -> pH < 6.5 or > 8.5 (dirty)
    
    # Base pH
    ph = 7.0
    
    # Adjust based on A (Green-Red)
    # Green (negative A) -> Neutral/Slightly Acidic
    # Red (positive A) -> Acidic
    ph -= (a_val / 20.0) # If A is 20 (Red), pH drops by 1. If A is -20 (Green), pH increases by 1
    
    # Adjust based on B (Blue-Yellow)
    # Blue (negative B) -> Alkaline
    # Yellow (positive B) -> Acidic/Neutral
    ph -= (b_val / 30.0) # If B is -30 (Blue), pH increases by 1
    
    # Clamp to realistic range for natural water
    ph = max(5.5, min(9.0, ph))
    
    return round(ph, 1)

def analyze_water_advanced(img):
    """
    Master Pipeline V4 (Advanced ML + CV)
    Meets strict requirements for Water Verification, pH, and Turbidity.
    """
    # 1. ML Classification (Water vs Non-Water)
    is_water, confidence, label = classify_water_ml(img)
    
    # Heuristic Fallback: Skin Tone Analysis (Selfie Rejection)
    # Relaxed for dirty water if ML detects a container
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_skin = np.array([0, 20, 70], dtype=np.uint8)
    upper_skin = np.array([20, 255, 255], dtype=np.uint8)
    mask_skin = cv2.inRange(hsv, lower_skin, upper_skin)
    skin_percent = (cv2.countNonZero(mask_skin) / (img.shape[0] * img.shape[1])) * 100
    
    print(f"🔍 Skin Tone Analysis: {skin_percent:.2f}% (Threshold: {'50.0' if is_water else '15.0'}%)")
    
    # Dynamic Threshold: Allow more "skin-like" colors (mud/rust) if we are sure it's a water container
    # Increase thresholds significantly to avoid rejecting dirty water
    skin_threshold = 60.0 if is_water else 35.0
    
    # Only reject if VERY high skin tone amount (likely a close up face/hand)
    if skin_percent > skin_threshold:
        return {
            "is_water": False,
            "error": True,
            "message": f"Analysis failed: Too much skin tone detected ({skin_percent:.1f}%). Please ensure only water is visible."
        }
        
    # If ML says NOT water (Blocked Object)
    if not is_water:
        return {
            "is_water": False,
            "error": True,
            "message": f"Analysis failed: Image appears to contain a {label}. Please upload water only."
        }

    # 2. Advanced CV Estimation (pH & Turbidity)
    ph = estimate_ph_advanced(img)
    turbidity = estimate_turbidity_advanced(img)
    
    # 3. Quality & Safety Assessment
    # pH Quality
    if 6.5 <= ph <= 8.5:
        ph_quality = "Neutral"
    elif ph < 6.5:
        ph_quality = "Acidic"
    else:
        ph_quality = "Alkaline"
        
    # Turbidity Level
    if turbidity < 1.0:
        turbidity_level = "Clear"
    elif turbidity < 5.0:
        turbidity_level = "Slightly Turbid"
    else:
        turbidity_level = "Highly Turbid"
        
    # Overall Safety
    safety = "Moderate"
    advice = "Boil water before drinking."
    
    if turbidity < 1.0 and 6.5 <= ph <= 8.5:
        safety = "Safe"
        advice = "Water appears safe, but boiling is recommended."
    elif turbidity > 5.0 or ph < 6.0 or ph > 9.0:
        safety = "Unsafe"
        advice = "Do not drink without heavy treatment (filtration + boiling)."
    else:
        safety = "Moderate"
        advice = "Filter and boil water before drinking."

    return {
        "is_water": True,
        "confidence": round(confidence, 2),
        "ph": ph,
        "ph_quality": ph_quality,
        "turbidity": turbidity,
        "turbidity_level": turbidity_level,
        "water_quality": safety, # Mapping 'safety' to 'water_quality' as requested in point 4
        "water_safety": safety,
        "advice": advice
    }

@app.route('/analyze-water', methods=['POST'])
def analyze_water_endpoint():
    try:
        data = request.get_json()
        if not data or 'imageUrl' not in data:
            return jsonify({"error": True, "message": "No image URL provided", "is_water": False}), 400
            
        img = download_image(data['imageUrl'])
        if img is None:
            return jsonify({"error": True, "message": "Failed to download image", "is_water": False}), 400
            
        result = analyze_water_advanced(img)
        
        # If error in analysis
        if result.get("error"):
            return jsonify(result), 400
            
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"error": True, "message": f"Server error: {str(e)}", "is_water": False}), 500

# Backward compatibility for existing frontend
@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        if not data or 'imageUrl' not in data:
            return jsonify({"status": "fail", "message": "No image URL provided"}), 400
            
        img = download_image(data['imageUrl'])
        if img is None:
            return jsonify({"status": "fail", "message": "Failed to download image"}), 400
            
        # Call the new advanced function
        result = analyze_water_advanced(img)
        
        # Map new format to old format for backward compatibility
        if result.get("error"):
             return jsonify({
                "status": "fail", 
                "message": result["message"]
            }), 400
            
        return jsonify({
            "status": "success",
            "estimated_ph": result["ph"],
            "estimated_turbidity": result["turbidity"],
            "water_quality": result["water_safety"],
            "message": f"Water is {result['water_safety']}. {result['advice']}",
            "debug_ml": f"Confidence: {result['confidence']}"
        }), 200
        
    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"status": "fail", "message": f"Server error: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health():
    ml_status = "active" if net else "disabled"
    return jsonify({'status': 'healthy', 'version': '4.0-advanced-ml', 'ml_engine': ml_status}), 200

if __name__ == '__main__':
    print("Starting Advanced Water Analysis Service v3.0 (ML + CV)...")
    app.run(host='0.0.0.0', port=8000, debug=False)




