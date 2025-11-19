# Quick Start Guide - OpenCV Service

## Prerequisites

- Python 3.8 or higher
- pip package manager

## Installation & Running

### Step 1: Install Dependencies

```bash
cd backend/opencv
pip install -r requirements.txt
```

**Note:** If you encounter numpy build errors, try:
```bash
pip install opencv-python flask flask-cors requests Pillow --no-build-isolation
```

### Step 2: Run the Service

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

The service will start on `http://localhost:8000`

### Step 3: Test the Service

Open a new terminal and run:
```bash
# Test health
python test_service.py

# Test with an image URL
python test_service.py https://example.com/water-sample.jpg
```

Or use curl:
```bash
# Health check
curl http://localhost:8000/health

# Analysis
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "YOUR_IMAGE_URL"}'
```

## Troubleshooting

### Issue: numpy build errors
**Solution:** Install pre-built wheels:
```bash
pip install --upgrade pip
pip install opencv-python --only-binary :all:
```

### Issue: Port 8000 already in use
**Solution:** Change the port in `opencv_analyzer.py`:
```python
app.run(host='0.0.0.0', port=8001, debug=False)  # Use different port
```

### Issue: Module not found errors
**Solution:** Make sure all dependencies are installed:
```bash
pip install -r requirements.txt
```

## Integration with Supabase

Once the service is running, set the environment variable in Supabase:

```bash
supabase secrets set OPENCV_SERVICE_URL=http://localhost:8000
```

For production, deploy the service and use the production URL:
```bash
supabase secrets set OPENCV_SERVICE_URL=https://your-opencv-service.com
```




