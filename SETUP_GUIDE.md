# Complete Setup Guide - Health Monitor Application

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier works)
- Python 3.8+ (for backend services)

## Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies (optional, for ML and OpenCV)
cd backend/ml
pip install -r requirements.txt

cd ../opencv
pip install -r requirements.txt
cd ../..
```

### 2. Configure Supabase

#### A. Create Supabase Project
1. Go to https://supabase.com
2. Create a new project (or use existing: `usynxptupskoeceomjky`)
3. Wait for project to be ready (~2 minutes)

#### B. Get API Credentials
1. Go to Project Settings > API
2. Copy the following:
   - **Project URL** (e.g., `https://usynxptupskoeceomjky.supabase.co`)
   - **anon/public key** (long JWT token starting with `eyJ...`)

#### C. Apply Database Migrations
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref usynxptupskoeceomjky
   ```

3. Push migrations:
   ```bash
   supabase db push
   ```

   **OR** manually run migrations in Supabase Dashboard:
   - Go to SQL Editor
   - Run each file in `supabase/migrations/` in order

#### D. Configure Authentication
1. Go to Authentication > Providers
2. Enable Email provider
3. **For testing:** Disable "Confirm email" option
4. **For production:** Keep email confirmation enabled

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
VITE_SUPABASE_URL=https://usynxptupskoeceomjky.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important:**
- No quotes around values
- No spaces around `=`
- Replace `your_anon_key_here` with your actual anon key
- File must be named `.env.local` (not `.env`)

### 4. Verify Setup

Run the verification script:

```bash
node verify-supabase.js
```

Expected output:
```
✓ Database connection successful
✓ Auth signup successful
✓ Auth signin successful
✅ All tests passed!
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8080` (or 8081 if 8080 is in use).

### 6. Test Login/Registration

#### Create Test Accounts

**Health Worker:**
- Email: `worker@test.com`
- Password: `TestPassword123!`
- Role: Health Worker

**Villager:**
- Email: `villager@test.com`
- Password: `TestPassword123!`
- Role: Villager

## Common Issues and Solutions

### "Invalid API Key" Error

**Cause:** Environment variables not loaded or incorrect.

**Solution:**
1. Verify `.env.local` exists in project root
2. Check that values have no quotes
3. Restart dev server: Stop (Ctrl+C) and run `npm run dev` again
4. Clear browser cache (Ctrl+Shift+Delete)
5. Check browser console for detailed errors

### "Failed to fetch" Error

**Cause:** Supabase project not accessible or CORS issue.

**Solution:**
1. Check Supabase project is active (not paused)
2. Verify URL is correct
3. Check network connection
4. Try accessing Supabase URL in browser

### "No role assigned" Error

**Cause:** Database trigger not working or migrations not applied.

**Solution:**
1. Apply all migrations (see Step 2C)
2. Check `handle_new_user` function exists in Supabase Dashboard > Database > Functions
3. Manually insert role:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('your-user-id', 'villager');
   ```

### Email Confirmation Required

**Cause:** Supabase requires email confirmation by default.

**Solution:**
1. Check your email for confirmation link
2. **OR** disable email confirmation (see Step 2D)
3. **OR** manually confirm user in Supabase Dashboard > Authentication > Users

## Backend Services (Optional)

### OpenCV Water Quality Analysis

```bash
cd backend/opencv
python opencv_analyzer.py
```

Service runs on `http://localhost:8000`

### ML Disease Prediction

```bash
cd backend/ml
python create_dataset.py
python train_model.py dataset.csv
```

## Deployment

### Frontend
Deploy to Vercel, Netlify, or any static hosting:

```bash
npm run build
# Upload dist/ folder
```

### Backend Services
Deploy to Heroku, Railway, Render, or similar:
- OpenCV service: Deploy as Python web service
- Supabase Edge Functions: `supabase functions deploy`

## Environment Variables for Production

```bash
VITE_SUPABASE_URL=your_production_url
VITE_SUPABASE_ANON_KEY=your_production_key
```

## Support

If you're still experiencing issues:
1. Check `TROUBLESHOOTING.md`
2. Review browser console errors
3. Check Supabase Dashboard > Logs
4. Verify all migrations are applied
5. Test with `verify-supabase.js` script

## Security Notes

- Never commit `.env.local` to git (already in `.gitignore`)
- Use different keys for development and production
- Enable email confirmation in production
- Set up Row Level Security policies (already configured)
- Regularly rotate API keys
