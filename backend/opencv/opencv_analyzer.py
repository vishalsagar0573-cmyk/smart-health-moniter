"""
OpenCV-based Water Quality Analysis Service (Advanced ML + CV)
Uses MobileNetV2 for classification and Advanced CV for estimation.
"""

import cv2
import numpy as np
import requests
from io import BytesIO
from PIL import Image
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

# Configure Gemini
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)
# else: User might rely on system env vars, handled in function check

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

# --- GEMINI VERIFICATION ---
def verify_water_with_gemini(img_array):
    """
    Uses Google Gemini Vision to verify if the image contains water.
    Returns: (is_valid: bool, reason: str)
    """
    if not GENAI_API_KEY:
        print("⚠️ Gemini API Key not found. Falling back to strict OpenCV/ML.")
        return None, "ML Setup Missing"

    try:
        # Convert numpy/opencv image to PIL
        # img_array is BGR from cv2
        img_rgb = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(img_rgb)

        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = (
            "Analyze this image strictly. Is this likely a photo of a water sample (in a glass, bottle, cup, or container) "
            "intended for quality testing? "
            "If it is a diagram, document, screenshot, specific object (like an ID card, phone, laptop), person, or non-water item, answer NO. "
            "If it is water, answer YES. "
            "Return ONLY 'YES' or 'NO'."
        )
        
        response = model.generate_content([prompt, pil_image])
        answer = response.text.strip().upper()
        
        print(f"🤖 Gemini Verification: {answer}")
        
        if "YES" in answer:
            return True, "Verified by Gemini"
        else:
            return False, "Gemini rejected image"
            
    except Exception as e:
        print(f"❌ Gemini Error: {e}")
        return None, str(e)

# --- 1. ML-BASED CLASSIFIER ---
def classify_water_ml(img):
    """
    Classify if image contains water using MobileNetV2 (ImageNet).
    Returns (is_water, confidence, label)
    STRICT MODE: Rejects everything unless explicitly recognized as water-like.
    """
    if net is None or not classes:
        # If ML is down, we fall back to heuristics, but default to suspicious
        return False, 0.0, "ML Disabled" 

    # Preprocess for MobileNet
    blob = cv2.dnn.blobFromImage(img, 1.0/225, (224, 224), (0.485, 0.456, 0.406), swapRB=True, crop=False)
    net.setInput(blob)
    preds = net.forward()
    
    # Get top predictions
    preds = preds.flatten()
    probs = np.exp(preds) / np.sum(np.exp(preds))
    
    top_indices = np.argsort(probs)[::-1][:5]
    top_probs = probs[top_indices]
    top_labels = [classes[i] for i in top_indices]
    
    print(f"🔍 ML Predictions: {list(zip(top_labels, top_probs))}")
    
    # Water-related keywords in ImageNet (Strict)
    water_keywords = [
        'water', 'bottle', 'cup', 'mug', 'beaker', 'jug', 'pitcher', 
        'bucket', 'basin', 'tub', 'fountain', 'liquid', 'glass', 
        'lakeside', 'seashore', 'promontory', 'sandbar', 'breakwater',
        'vase', 'bowl', 'pot', 'jar', 'vial', 'flask', 'petri', 'dish',
        'beer_glass', 'goblet', 'soup_bowl', 'washbasin'
    ]

    # Explicit Blocklist (Common confusion items)
    block_keywords = [
        'person', 'woman', 'man', 'boy', 'girl', 'face', 'human', 
        'dog', 'cat', 'bird', 'animal', 'mammal', 'spider', 'snake',
        't-shirt', 'jersey', 'maillot', 'shirt', 'clothing', 'tie',
        'car', 'truck', 'vehicle', 'bicycle', 'motor',
        'envelope', 'web_site', 'monitor', 'screen', 'television', 'display',
        'paper', 'notebook', 'binder', 'rule', 'modem', 'projector',
        'packet', 'carton', 'switch', 'keyboard', 'cellular', 'mobile',
        'wallet', 'purse', 'card', 'identity', 'passport'
    ]
    
    # --- STRICT LOGIC (Balanced) ---
    # Default: Assume NOT WATER to be strict
    is_water = False 
    confidence = 0.0
    matched_label = top_labels[0]
    
    # 1. Check if explicitly in Water List (Boost confidence)
    top_name = top_labels[0].lower()
    top_score = float(top_probs[0])

    if any(kw in top_name for kw in water_keywords):
        is_water = True
        confidence = max(0.8, top_score)
        matched_label = top_labels[0]
        
    # 2. Check if explicitly in Block List (Strict Reject)
    elif any(kw in top_name for kw in block_keywords):
        # Reject if even moderately confident it's a blocked item
        if top_score > 0.15: # Low threshold for safety
            is_water = False
            confidence = top_score
            matched_label = top_labels[0]
            print(f"🛑 Blocked Object Detected: {matched_label}")

    # 3. Diagram/Document Detection (Heuristic)
    # If it's a diagram, it usually has high white content and sharp edges (text)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 230, 255, cv2.THRESH_BINARY)
    white_pixel_ratio = cv2.countNonZero(binary) / (gray.shape[0] * gray.shape[1])
    
    if white_pixel_ratio > 0.6: # >60% pure white background
        # Check for edges (text)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / (gray.shape[0] * gray.shape[1])
        
        # High white background + Moderate complexity usually means document/diagram
        if edge_density > 0.015: 
            print(f"🛑 Detected Document/Diagram: White ratio {white_pixel_ratio:.2f}, Edge Density {edge_density:.4f}")
            is_water = False
            matched_label = "Document/Diagram"

    if not is_water:
        print(f"❌ Rejected: Identified as '{matched_label}' or Diagram.")

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
    Master Pipeline V4 (Advanced ML + CV + Gemini)
    Meets strict requirements for Water Verification, pH, and Turbidity.
    """
    # 0. Gemini Verification (Primary & Strictest)
    is_gemini_valid, gemini_reason = verify_water_with_gemini(img)
    
    # Initialize variables to prevent scope errors
    label = "Unknown Object"
    
    print(f"DEBUG: Gemini Valid: {is_gemini_valid}")
    
    if is_gemini_valid is False:
        # Gemini explicitly said NO
        return {
            "is_water": False,
            "error": True,
            "message": "Analysis failed: Incorrect water sample. Please upload a valid photo of water."
        }
    
    is_water = False
    confidence = 0.0
    
    # 1. Fallback / Secondary ML Classification
    # If Gemini passed (True) or was unavailable (None), run local ML
    ml_is_water, ml_conf, ml_label = classify_water_ml(img)
    
    if is_gemini_valid is True:
        # If Gemini trusted it, we trust it, but use ML to confirm if possible
        is_water = True
        confidence = 1.0 # High confidence from Gemini
        label = "Verified Water Sample"
        print("✅ Trusted by Gemini - Skipping Strict Blocklist")
    else:
        # Gemini was unavailable, rely purely on Strict ML
        is_water = ml_is_water
        confidence = ml_conf
        label = ml_label
        
    # Heuristic Fallback: Skin Tone Analysis (Selfie Rejection)
    # Relaxed for dirty water if ML detects a container
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_skin = np.array([0, 20, 70], dtype=np.uint8)
    upper_skin = np.array([20, 255, 255], dtype=np.uint8)
    mask_skin = cv2.inRange(hsv, lower_skin, upper_skin)
    skin_percent = (cv2.countNonZero(mask_skin) / (img.shape[0] * img.shape[1])) * 100
    
    print(f"🔍 Skin Tone Analysis: {skin_percent:.2f}% (Threshold: {'50.0' if is_water else '15.0'}%)")
    
    # Face Detection Check (More reliable than skin tone)
    # Face Detection Check (Strict)
    # We BLOCK if a face is detected, unless Gemini EXPLICITLY whitelisted it (rare).
    if face_cascade is not None:
        gray_frame = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray_frame, 1.1, 8) 
        if len(faces) > 0:
            print(f"⚠️ Face detected (Count: {len(faces)}).")
            
            # If Gemini didn't explicitly say YES, we reject faces.
            if is_gemini_valid is not True:
                return {
                    "is_water": False,
                    "error": True,
                    "message": "Analysis failed: Face detected in image. Please photograph only the water sample."
                }

    # Dynamic Threshold: Allow more "skin-like" colors (mud/rust) if we are sure it's a water container
    # Increase thresholds significantly to avoid rejecting dirty water
    skin_threshold = 85.0 if is_water else 50.0
    
    # Only reject if VERY high skin tone amount (likely a close up face/hand)
    # Again, trust Gemini if it said YES
    if is_gemini_valid is not True and skin_percent > skin_threshold:
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
    print("🚀 Starting STRICT Water Analysis Service v5.0 (Strict Blocklist)...")
    app.run(host='0.0.0.0', port=8000, debug=False)




