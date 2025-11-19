# OpenCV Water Quality Analysis Service

Python service for analyzing water sample images using OpenCV to extract pH and turbidity measurements.

## Location

This service is located in `backend/opencv/` as part of the backend services.

## Setup

1. Install dependencies:
```bash
cd backend/opencv
pip install -r requirements.txt
```

2. Run the service:

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Or directly:**
```bash
python opencv_analyzer.py
```

The service will run on `http://localhost:8000`

## Testing

Test the service:

```bash
# Test health endpoint
python test_service.py

# Test analysis with image URL
python test_service.py https://example.com/water-sample.jpg
```

## API Endpoints

### POST /analyze
Analyzes a water sample image and returns pH and turbidity measurements.

**Request:**
```json
{
  "imageUrl": "https://example.com/water-sample.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "water_ph": 7.2,
  "water_turbidity": 2.5,
  "avg_R": 180.5,
  "avg_G": 195.2,
  "avg_B": 210.3,
  "brightness": 195.0,
  "quality_score": 85.5,
  "quality_level": "Safe",
  "analysis": "Water quality: Safe. pH: 7.2, Turbidity: 2.50 NTU",
  "opencv_metrics": {
    "ph_metrics": {...},
    "turbidity_metrics": {...},
    "quality_metrics": {...}
  }
}
```

### GET /health
Health check endpoint.

## Integration with Supabase

The Supabase Edge Function `analyze-water-image` calls this service via HTTP. Set the service URL as an environment variable:

```bash
supabase secrets set OPENCV_SERVICE_URL=http://localhost:8000
```

For production, deploy this service and use the production URL.

## Deployment

For production deployment, use a WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 opencv_analyzer:app
```

Or deploy as a containerized service.

## How It Works

1. **Image Download**: Downloads image from provided URL
2. **Preprocessing**: Resizes and applies noise reduction
3. **Water Region Detection**: Identifies water sample in white container
4. **pH Estimation**: Analyzes color characteristics to estimate pH (6.0-8.5)
5. **Turbidity Measurement**: Uses clarity/contrast analysis to measure turbidity (0-10 NTU)
6. **Quality Assessment**: Combines pH and turbidity to determine overall quality

## Dependencies

- opencv-python: Image processing and computer vision
- numpy: Numerical computations
- flask: Web framework
- flask-cors: Cross-origin resource sharing
- requests: HTTP client for downloading images
- Pillow: Image manipulation




