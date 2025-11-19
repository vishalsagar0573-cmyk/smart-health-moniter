#!/usr/bin/env python3
"""
Simple script to run the OpenCV analyzer service
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from opencv_analyzer import app

if __name__ == '__main__':
    print("Starting OpenCV Water Quality Analysis Service...")
    print("Service will be available at http://localhost:8000")
    print("Health check: http://localhost:8000/health")
    print("Press Ctrl+C to stop")
    app.run(host='0.0.0.0', port=8000, debug=False)





