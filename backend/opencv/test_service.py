#!/usr/bin/env python3
"""
Test script for OpenCV Water Quality Analysis Service
"""

import requests
import json
import sys

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("[OK] Health check passed")
            print(f"  Response: {response.json()}")
            return True
        else:
            print(f"[ERROR] Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("[ERROR] Cannot connect to service. Is it running?")
        print("  Start the service with: python opencv_analyzer.py")
        return False
    except Exception as e:
        print(f"[ERROR] Health check error: {e}")
        return False

def test_analyze(image_url):
    """Test analyze endpoint"""
    print(f"\nTesting analyze endpoint with image: {image_url}")
    try:
        response = requests.post(
            "http://localhost:8000/analyze",
            json={"imageUrl": image_url},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("[OK] Analysis successful")
                print(f"  pH: {data.get('water_ph')}")
                print(f"  Turbidity: {data.get('water_turbidity')} NTU")
                print(f"  Quality Level: {data.get('quality_level')}")
                print(f"  Quality Score: {data.get('quality_score')}")
                return True
            else:
                print(f"[ERROR] Analysis failed: {data.get('error')}")
                return False
        else:
            print(f"[ERROR] Analysis request failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("[ERROR] Cannot connect to service. Is it running?")
        return False
    except Exception as e:
        print(f"[ERROR] Analysis error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("OpenCV Water Quality Analysis Service Test")
    print("=" * 50)
    
    # Test health
    if not test_health():
        sys.exit(1)
    
    # Test analyze (optional - requires image URL)
    if len(sys.argv) > 1:
        image_url = sys.argv[1]
        test_analyze(image_url)
    else:
        print("\nTo test analysis, provide an image URL:")
        print("  python test_service.py <image_url>")
    
    print("\n" + "=" * 50)
    print("Test completed")





