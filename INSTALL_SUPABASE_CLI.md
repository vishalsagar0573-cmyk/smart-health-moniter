# Installing Supabase CLI

## Why You Need It
The Supabase CLI is required to:
- Deploy Edge Functions
- Push database migrations
- Manage your Supabase project locally

## Installation Options

### Option 1: Using npm (Easiest)
```powershell
npm install -g supabase
```

### Option 2: Using Scoop (Windows Package Manager)
```powershell
# Install Scoop if you don't have it
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Option 3: Direct Download
1. Go to: https://github.com/supabase/cli/releases
2. Download the Windows executable
3. Add to your PATH

## Verify Installation
```powershell
supabase --version
```

## After Installation

### 1. Login to Supabase
```powershell
supabase login
```

### 2. Link Your Project
```powershell
supabase link --project-ref usynxptupskoeceomjky
```

### 3. Deploy Database Migrations
```powershell
supabase db push
```

### 4. Deploy Edge Functions
```powershell
# Deploy all functions
supabase functions deploy analyze-water-image
supabase functions deploy predict-disease
supabase functions deploy predict-risk
supabase functions deploy fetch-water-quality-data

# Or deploy specific function
supabase functions deploy predict-disease
```

### 5. Test Deployed Function
```powershell
.\test-edge-function.ps1
```

## Troubleshooting

### Error: "supabase is not recognized"
**Solution**: Restart PowerShell after installation

### Error: "Failed to link project"
**Solution**: Make sure you're logged in first with `supabase login`

### Error: "Permission denied"
**Solution**: Run PowerShell as Administrator

## Alternative: Deploy via Supabase Dashboard

If you can't install the CLI, you can deploy manually:

1. Go to https://supabase.com/dashboard
2. Select your project: `usynxptupskoeceomjky`
3. Go to **Edge Functions**
4. Click **New Function**
5. Copy the code from `supabase/functions/predict-disease/index.ts`
6. Paste and deploy

However, this is more tedious for multiple functions.

## Recommended: Install via npm

The easiest method:
```powershell
npm install -g supabase
```

Then verify:
```powershell
supabase --version
```

You should see something like: `1.x.x`
