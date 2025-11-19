@echo off
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Starting OpenCV Water Quality Analysis Service...
echo Service will be available at http://localhost:8000
echo Health check: http://localhost:8000/health
echo Press Ctrl+C to stop
echo.

python opencv_analyzer.py





