# PowerShell script to test the predict-disease Edge Function
# Usage: .\test-edge-function.ps1

$SUPABASE_URL = "https://usynxptupskoeceomjky.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzeW54cHR1cHNrb2VjZW9tamt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzQxMzQsImV4cCI6MjA3NTMxMDEzNH0.UGrKIZk3YSY5PAjM872H6jXEzAtsBeawqjoGZheL0lE"

Write-Host "Testing predict-disease Edge Function" -ForegroundColor Cyan
Write-Host ("=" * 60)

# Test Case 1: Cholera
Write-Host "`n1. Testing Cholera prediction..." -ForegroundColor Yellow

$body1 = @{
    symptoms = @("diarrhea", "vomiting", "dehydration")
    peopleAffected = 1
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/predict-disease" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $SUPABASE_ANON_KEY"
            "Content-Type" = "application/json"
        } `
        -Body $body1
    
    Write-Host "   Disease: $($response1.predicted_disease)" -ForegroundColor Green
    Write-Host "   Risk Level: $($response1.risk_level)" -ForegroundColor Green
    Write-Host "   Urgency: $($response1.urgency)" -ForegroundColor Green
    Write-Host "   Confidence: $([math]::Round($response1.confidence * 100))%" -ForegroundColor Green
    Write-Host "   Key Symptoms: $($response1.key_symptoms_detected -join ', ')" -ForegroundColor Green
    $advicePreview = $response1.advice.Substring(0, [Math]::Min(80, $response1.advice.Length))
    Write-Host "   Advice: $advicePreview..." -ForegroundColor Green
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# Test Case 2: Typhoid
Write-Host "`n2. Testing Typhoid prediction..." -ForegroundColor Yellow

$body2 = @{
    symptoms = @("fever", "headache", "weakness", "nausea")
    peopleAffected = 1
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/predict-disease" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $SUPABASE_ANON_KEY"
            "Content-Type" = "application/json"
        } `
        -Body $body2
    
    Write-Host "   Disease: $($response2.predicted_disease)" -ForegroundColor Green
    Write-Host "   Risk Level: $($response2.risk_level)" -ForegroundColor Green
    Write-Host "   Urgency: $($response2.urgency)" -ForegroundColor Green
    Write-Host "   Confidence: $([math]::Round($response2.confidence * 100))%" -ForegroundColor Green
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Case 3: Community Outbreak
Write-Host "`n3. Testing Community Outbreak..." -ForegroundColor Yellow

$body3 = @{
    symptoms = @("diarrhea", "vomiting", "fever")
    peopleAffected = 5
    waterQuality = @{
        ph = 6.0
        turbidity = 8.5
    }
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/predict-disease" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $SUPABASE_ANON_KEY"
            "Content-Type" = "application/json"
        } `
        -Body $body3
    
    Write-Host "   Disease: $($response3.predicted_disease)" -ForegroundColor Green
    Write-Host "   Risk Level: $($response3.risk_level)" -ForegroundColor Green
    Write-Host "   Urgency: $($response3.urgency)" -ForegroundColor Green
    Write-Host "   People Affected: $($response3.model_info.people_affected)" -ForegroundColor Green
    
    if ($response3.advice -match "COMMUNITY ALERT") {
        Write-Host "   Community Alert Triggered!" -ForegroundColor Magenta
    }
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Case 4: Single Symptom (Sparse)
Write-Host "`n4. Testing Single Symptom (headache only)..." -ForegroundColor Yellow

$body4 = @{
    symptoms = @("headache")
    peopleAffected = 1
} | ConvertTo-Json

try {
    $response4 = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/predict-disease" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $SUPABASE_ANON_KEY"
            "Content-Type" = "application/json"
        } `
        -Body $body4
    
    Write-Host "   Disease: $($response4.predicted_disease)" -ForegroundColor Green
    Write-Host "   Risk Level: $($response4.risk_level)" -ForegroundColor Green
    Write-Host "   Confidence: $([math]::Round($response4.confidence * 100))%" -ForegroundColor Green
    Write-Host "   Matched Symptoms: $($response4.matched_symptoms -join ', ')" -ForegroundColor Green
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n$('=' * 60)"
Write-Host "Testing Complete!" -ForegroundColor Green
Write-Host "`nNote: If you see errors, the Edge Function may not be deployed yet." -ForegroundColor Yellow
Write-Host "Deploy with: supabase functions deploy predict-disease" -ForegroundColor Yellow
