"""
OpenCV-based Water Quality Analysis Service
Analyzes water sample images to extract pH and turbidity measurements
"""

import cv2
import numpy as np
import requests
from io import BytesIO
from PIL import Image
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def download_image(image_url):
    """Download image from URL"""
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content))
        # Convert PIL image to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        # Convert PIL image to OpenCV format (BGR)
        img_array = np.array(img)
        # PIL uses RGB, OpenCV uses BGR, so convert
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        return img_array
    except Exception as e:
        raise Exception(f"Failed to download image: {str(e)}")

def preprocess_image(img):
    """Preprocess image: resize, normalize, noise reduction"""
    # Resize to standard size for consistent analysis
    height, width = img.shape[:2]
    max_dim = 800
    if max(height, width) > max_dim:
        scale = max_dim / max(height, width)
        new_width = int(width * scale)
        new_height = int(height * scale)
        img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)
    
    # Apply bilateral filter for noise reduction while preserving edges
    img_filtered = cv2.bilateralFilter(img, 9, 75, 75)
    
    return img_filtered

def detect_water_region(img):
    """Detect the water sample region (white cup/bottle)"""
    # Convert to HSV for better color detection
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Detect white/light regions (water container)
    # Lower and upper bounds for white/light colors
    lower_white = np.array([0, 0, 200])
    upper_white = np.array([180, 30, 255])
    mask_white = cv2.inRange(hsv, lower_white, upper_white)
    
    # Also detect light blue/cyan regions (water)
    lower_water = np.array([100, 50, 50])
    upper_water = np.array([130, 255, 255])
    mask_water = cv2.inRange(hsv, lower_water, upper_water)
    
    # Combine masks
    mask = cv2.bitwise_or(mask_white, mask_water)
    
    # Apply morphological operations to clean up mask
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    # Find contours to get water region
    # OpenCV 4.x returns (contours, hierarchy), OpenCV 3.x returns (image, contours, hierarchy)
    contour_result = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if len(contour_result) == 3:  # OpenCV 3.x
        _, contours, _ = contour_result
    else:  # OpenCV 4.x
        contours, _ = contour_result
    
    if contours:
        # Get largest contour (likely the water container)
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        # Extract ROI (Region of Interest) - focus on center region (water, not container edges)
        roi_x = max(0, x + w // 4)
        roi_y = max(0, y + h // 4)
        roi_w = w // 2
        roi_h = h // 2
        
        if roi_w > 50 and roi_h > 50:  # Ensure ROI is large enough
            return img[roi_y:roi_y+roi_h, roi_x:roi_x+roi_w]
    
    # Fallback: return center region of image
    h, w = img.shape[:2]
    return img[h//4:3*h//4, w//4:3*w//4]

def estimate_ph_from_color(water_region):
    """Estimate pH from color analysis"""
    # Convert to HSV for better color analysis
    hsv = cv2.cvtColor(water_region, cv2.COLOR_BGR2HSV)
    bgr = water_region
    
    # Calculate average color values
    avg_b = np.mean(bgr[:, :, 0])
    avg_g = np.mean(bgr[:, :, 1])
    avg_r = np.mean(bgr[:, :, 2])
    
    avg_h = np.mean(hsv[:, :, 0])
    avg_s = np.mean(hsv[:, :, 1])
    avg_v = np.mean(hsv[:, :, 2])
    
    # Normalize RGB values (0-255 to 0-1)
    r_norm = avg_r / 255.0
    g_norm = avg_g / 255.0
    b_norm = avg_b / 255.0
    
    # pH estimation based on color characteristics
    # Clear water (pH ~7) tends to be slightly blue
    # Acidic water (pH <7) may appear more yellow/green
    # Basic water (pH >7) may appear more blue
    
    # Calculate color ratios
    if avg_r + avg_g + avg_b > 0:
        blue_ratio = avg_b / (avg_r + avg_g + avg_b)
        green_ratio = avg_g / (avg_r + avg_g + avg_b)
        red_ratio = avg_r / (avg_r + avg_g + avg_b)
    else:
        blue_ratio = 0.33
        green_ratio = 0.33
        red_ratio = 0.34
    
    # Base pH estimation (neutral water ~7.0)
    base_ph = 7.0
    
    # Adjust based on color characteristics
    # More blue = higher pH (basic)
    # More yellow/green = lower pH (acidic)
    ph_adjustment = (blue_ratio - 0.33) * 2.0 - (green_ratio - 0.33) * 1.5
    
    estimated_ph = base_ph + ph_adjustment
    
    # Clamp to reasonable range (6.0 - 8.5)
    estimated_ph = np.clip(estimated_ph, 6.0, 8.5)
    
    return {
        'ph': float(estimated_ph),
        'avg_r': float(avg_r),
        'avg_g': float(avg_g),
        'avg_b': float(avg_b),
        'avg_h': float(avg_h),
        'avg_s': float(avg_s),
        'avg_v': float(avg_v),
        'blue_ratio': float(blue_ratio),
        'green_ratio': float(green_ratio),
        'red_ratio': float(red_ratio)
    }

def measure_turbidity(water_region):
    """Measure turbidity using image clarity/contrast analysis"""
    # Convert to grayscale for clarity analysis
    gray = cv2.cvtColor(water_region, cv2.COLOR_BGR2GRAY)
    
    # Calculate variance (clarity metric)
    # Higher variance = more particles/cloudiness = higher turbidity
    variance = np.var(gray)
    std_dev = np.std(gray)
    
    # Calculate Laplacian variance (edge detection for particles)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    laplacian_var = np.var(laplacian)
    
    # Calculate contrast ratio
    min_val = np.min(gray)
    max_val = np.max(gray)
    contrast_ratio = (max_val - min_val) / 255.0 if max_val > min_val else 0
    
    # Use Canny edge detection to detect particles
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
    
    # Combine metrics to estimate turbidity (0-10 NTU scale)
    # Higher variance, laplacian_var, edge_density = higher turbidity
    
    # Normalize metrics (0-1 scale)
    variance_norm = min(variance / 1000.0, 1.0)  # Normalize variance
    laplacian_norm = min(laplacian_var / 500.0, 1.0)  # Normalize laplacian variance
    edge_norm = min(edge_density * 10, 1.0)  # Normalize edge density
    
    # Weighted combination for turbidity estimation
    turbidity = (variance_norm * 0.3 + laplacian_norm * 0.4 + edge_norm * 0.3) * 10.0
    
    # Clamp to 0-10 NTU range
    turbidity = np.clip(turbidity, 0.0, 10.0)
    
    return {
        'turbidity': float(turbidity),
        'variance': float(variance),
        'std_dev': float(std_dev),
        'laplacian_var': float(laplacian_var),
        'contrast_ratio': float(contrast_ratio),
        'edge_density': float(edge_density)
    }

def analyze_water_quality(ph, turbidity):
    """Assess overall water quality based on pH and turbidity"""
    quality_score = 100.0
    
    # pH scoring (optimal range: 6.5-8.5)
    if 6.5 <= ph <= 8.5:
        ph_score = 100.0
    elif 6.0 <= ph < 6.5 or 8.5 < ph <= 9.0:
        ph_score = 70.0
    else:
        ph_score = 40.0
    
    # Turbidity scoring (lower is better, <5 NTU is good)
    if turbidity < 1.0:
        turbidity_score = 100.0
    elif turbidity < 3.0:
        turbidity_score = 85.0
    elif turbidity < 5.0:
        turbidity_score = 70.0
    elif turbidity < 7.0:
        turbidity_score = 50.0
    else:
        turbidity_score = 30.0
    
    # Combined quality score
    quality_score = (ph_score * 0.5 + turbidity_score * 0.5)
    
    # Determine quality level
    if quality_score >= 80:
        quality_level = "Safe"
    elif quality_score >= 60:
        quality_level = "Moderate"
    else:
        quality_level = "High Risk"
    
    return {
        'quality_score': float(quality_score),
        'quality_level': quality_level,
        'ph_score': float(ph_score),
        'turbidity_score': float(turbidity_score)
    }

@app.route('/analyze', methods=['POST'])
def analyze():
    """Main analysis endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
            
        image_url = data.get('imageUrl')
        
        if not image_url:
            return jsonify({
                'success': False,
                'error': 'imageUrl is required'
            }), 400
        
        # Download and preprocess image
        img = download_image(image_url)
        if img is None or img.size == 0:
            return jsonify({
                'success': False,
                'error': 'Failed to process image'
            }), 400
            
        img_processed = preprocess_image(img)
        
        # Detect water region
        water_region = detect_water_region(img_processed)
        
        if water_region is None or water_region.size == 0:
            return jsonify({
                'success': False,
                'error': 'Failed to detect water region in image'
            }), 400
        
        # Analyze pH from color
        ph_analysis = estimate_ph_from_color(water_region)
        
        # Measure turbidity
        turbidity_analysis = measure_turbidity(water_region)
        
        # Assess overall quality
        quality_assessment = analyze_water_quality(
            ph_analysis['ph'],
            turbidity_analysis['turbidity']
        )
        
        # Calculate brightness
        brightness = float(np.mean(cv2.cvtColor(water_region, cv2.COLOR_BGR2GRAY)))
        
        return jsonify({
            'success': True,
            'water_ph': ph_analysis['ph'],
            'water_turbidity': turbidity_analysis['turbidity'],
            'avg_R': ph_analysis['avg_r'],
            'avg_G': ph_analysis['avg_g'],
            'avg_B': ph_analysis['avg_b'],
            'brightness': brightness,
            'quality_score': quality_assessment['quality_score'],
            'quality_level': quality_assessment['quality_level'],
            'analysis': f"Water quality: {quality_assessment['quality_level']}. pH: {ph_analysis['ph']:.1f}, Turbidity: {turbidity_analysis['turbidity']:.2f} NTU",
            'opencv_metrics': {
                'ph_metrics': ph_analysis,
                'turbidity_metrics': turbidity_analysis,
                'quality_metrics': quality_assessment
            }
        })
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in analyze endpoint: {error_trace}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)




