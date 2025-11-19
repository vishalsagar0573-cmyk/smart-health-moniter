# OpenCV Service Setup Instructions

## Current Status

The OpenCV Python service code is complete and ready to use. However, you need to install dependencies and run the service.

## Installation Steps

### Option 1: Standard Installation (Recommended)

```bash
cd backend/opencv
pip install -r requirements.txt
```

### Option 2: If you encounter numpy build errors

Since numpy 2.3.4 is already installed, you can install opencv-python without rebuilding numpy:

```bash
cd backend/opencv
pip install opencv-python --no-deps
pip install flask flask-cors requests Pillow
```

### Option 3: Use pre-built wheels

```bash
pip install --upgrade pip
pip install opencv-python --only-binary :all:
pip install flask flask-cors requests Pillow
```

## Running the Service

Once dependencies are installed:

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

## Verification

The service should start on `http://localhost:8000`

Test it:
```bash
# Health check
curl http://localhost:8000/health

# Or use the test script
python test_service.py
```

## Integration

Once running, configure Supabase to use it:

```bash
supabase secrets set OPENCV_SERVICE_URL=http://localhost:8000
```

## Troubleshooting

### Issue: numpy version conflicts
**Solution:** The code works with numpy 2.3.4. If opencv-python requires a different version, you may need to:
1. Use a virtual environment
2. Install compatible versions manually

### Issue: Port already in use
**Solution:** Change port in `opencv_analyzer.py` line 336:
```python
app.run(host='0.0.0.0', port=8001, debug=False)
```

### Issue: Module not found
**Solution:** Make sure you're in the correct directory and all dependencies are installed:
```bash
cd backend/opencv
pip list | grep -E "opencv|flask|numpy"
```

## Code Status

✅ **All code is complete and fixed:**
- Fixed image conversion bug (RGBA/RGB handling)
- Fixed OpenCV version compatibility (findContours)
- Added error handling and validation
- Added test scripts
- Added startup scripts for Windows/Linux

The service is ready to run once dependencies are installed!




