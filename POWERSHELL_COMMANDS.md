# PowerShell Commands for Testing

## The Error You Encountered

The error happened because:
- **`curl`** in PowerShell is an alias for `Invoke-WebRequest`
- PowerShell uses **different syntax** than bash/Linux
- The `-X`, `-H`, `-d` flags are **bash curl flags**, not PowerShell

## Correct PowerShell Commands

### Test predict-disease Edge Function

#### Simple Test (One-liner)
```powershell
Invoke-RestMethod -Uri "https://usynxptupskoeceomjky.supabase.co/functions/v1/predict-disease" -Method Post -Headers @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzeW54cHR1cHNrb2VjZW9tamt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzQxMzQsImV4cCI6MjA3NTMxMDEzNH0.UGrKIZk3YSY5PAjM872H6jXEzAtsBeawqjoGZheL0lE"; "Content-Type"="application/json"} -Body '{"symptoms": ["diarrhea", "vomiting", "dehydration"], "peopleAffected": 1}'
```

#### Formatted Test (Easier to read)
```powershell
$body = @{
    symptoms = @("diarrhea", "vomiting", "dehydration")
    peopleAffected = 1
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "https://usynxptupskoeceomjky.supabase.co/functions/v1/predict-disease" `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzeW54cHR1cHNrb2VjZW9tamt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzQxMzQsImV4cCI6MjA3NTMxMDEzNH0.UGrKIZk3YSY5PAjM872H6jXEzAtsBeawqjoGZheL0lE"
        "Content-Type" = "application/json"
    } `
    -Body $body
```

#### Using Script (Recommended)
```powershell
.\test-edge-function.ps1
```

---

## Other Useful PowerShell Commands

### Test OpenCV Service
```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:8000/health"

# Analyze water sample
$opencvBody = @{
    imageUrl = "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:8000/analyze" `
    -Method Post `
    -Headers @{"Content-Type"="application/json"} `
    -Body $opencvBody
```

### Check Running Processes
```powershell
# Check if OpenCV is running on port 8000
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

# Check if frontend is running on port 8082
Get-NetTCPConnection -LocalPort 8082 -ErrorAction SilentlyContinue
```

### Start Services
```powershell
# Start OpenCV service
cd backend/opencv
python opencv_analyzer.py

# Start frontend (in another terminal)
npm run dev
```

---

## Bash vs PowerShell Comparison

| Task | Bash (Linux/Mac) | PowerShell (Windows) |
|------|------------------|----------------------|
| **HTTP POST** | `curl -X POST` | `Invoke-RestMethod -Method Post` |
| **Headers** | `-H "Key: Value"` | `-Headers @{"Key"="Value"}` |
| **Body** | `-d '{"key":"value"}'` | `-Body '{"key":"value"}'` |
| **JSON** | `'{"key":"value"}'` | `@{key="value"} \| ConvertTo-Json` |
| **List files** | `ls` | `Get-ChildItem` or `ls` |
| **Remove file** | `rm file.txt` | `Remove-Item file.txt` |
| **View file** | `cat file.txt` | `Get-Content file.txt` or `type file.txt` |
| **Find text** | `grep "text"` | `Select-String "text"` |

---

## Quick Reference

### Variables
```powershell
$url = "https://example.com"
$key = "your-api-key"
```

### JSON Body
```powershell
# Method 1: Hashtable
$body = @{
    key1 = "value1"
    key2 = @("item1", "item2")
} | ConvertTo-Json

# Method 2: String
$body = '{"key1":"value1","key2":["item1","item2"]}'
```

### Headers
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
```

### Make Request
```powershell
$response = Invoke-RestMethod `
    -Uri $url `
    -Method Post `
    -Headers $headers `
    -Body $body

# Access response
Write-Host $response.predicted_disease
Write-Host $response.risk_level
```

---

## Testing Edge Functions

### Before Deployment
Edge Functions must be deployed to Supabase before they can be tested via HTTP.

**Deploy command:**
```bash
supabase functions deploy predict-disease
```

**Note:** This requires Supabase CLI to be installed.

### After Deployment
Use the PowerShell commands above to test.

### Alternative: Test Locally
You can test the logic locally using Node.js:
```powershell
node test-ml-prediction.js
```

---

## Troubleshooting

### Error: "Cannot find parameter 'X'"
**Problem:** Using bash curl syntax in PowerShell
**Solution:** Use `Invoke-RestMethod` instead

### Error: "The term '-H' is not recognized"
**Problem:** Using bash flags in PowerShell
**Solution:** Use PowerShell syntax with `-Headers @{}`

### Error: "The term '-d' is not recognized"
**Problem:** Using bash data flag in PowerShell
**Solution:** Use `-Body` parameter

### Error: "404 Not Found"
**Problem:** Edge Function not deployed
**Solution:** Deploy with `supabase functions deploy predict-disease`

### Error: "401 Unauthorized"
**Problem:** Missing or invalid API key
**Solution:** Check your `SUPABASE_ANON_KEY` in `.env.local`

---

## Summary

✅ **Use PowerShell Script:** `.\test-edge-function.ps1`
✅ **Or use Invoke-RestMethod** with proper PowerShell syntax
❌ **Don't use bash curl syntax** in PowerShell

**Key Differences:**
- Bash: `curl -X POST -H "..." -d '...'`
- PowerShell: `Invoke-RestMethod -Method Post -Headers @{...} -Body '...'`
