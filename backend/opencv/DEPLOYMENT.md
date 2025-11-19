# OpenCV Service Deployment Guide

## Local Development

1. Install dependencies:
```bash
cd backend/opencv
pip install -r requirements.txt
```

2. Run the service:
```bash
python opencv_analyzer.py
```

The service will run on `http://localhost:8000`

3. Set environment variable in Supabase Edge Function:
```bash
# In Supabase dashboard or CLI
supabase secrets set OPENCV_SERVICE_URL=http://localhost:8000
```

## Production Deployment Options

### Option 1: Deploy as Separate Service (Recommended)

Deploy the Python service to a cloud platform:

**Heroku:**
```bash
heroku create opencv-water-analyzer
git push heroku main
```

**Railway:**
```bash
railway init
railway up
```

**Render:**
- Create new Web Service
- Set build command: `pip install -r requirements.txt`
- Set start command: `gunicorn -w 4 -b 0.0.0.0:8000 opencv_analyzer:app`

**Docker:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY opencv_analyzer.py .
EXPOSE 8000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "opencv_analyzer:app"]
```

### Option 2: Use Gunicorn for Production

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 opencv_analyzer:app
```

### Option 3: Container Deployment

Build and deploy as Docker container:

```bash
docker build -t opencv-water-analyzer .
docker run -p 8000:8000 opencv-water-analyzer
```

## Environment Configuration

Set the OpenCV service URL in your Supabase project:

```bash
# Using Supabase CLI
supabase secrets set OPENCV_SERVICE_URL=https://your-opencv-service.com

# Or in Supabase Dashboard
# Project Settings > Edge Functions > Secrets
```

## Health Check

Test the service:
```bash
curl http://localhost:8000/health
```

## Testing

Test the analysis endpoint:
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/water-sample.jpg"}'
```

## Monitoring

- Monitor service health via `/health` endpoint
- Set up alerts for service downtime
- Monitor response times and error rates




