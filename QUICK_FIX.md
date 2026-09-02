# Quick Fix for "Invalid API Key" Error

## The Problem
Login and registration showing "Invalid API Key" error for both health workers and villagers.

## The Solution

### Step 1: Verify Environment File
Your `.env.local` file should look exactly like this (NO QUOTES):

```
VITE_SUPABASE_URL=https://usynxptupskoeceomjky.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzeW54cHR1cHNrb2VjZW9tamt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzQxMzQsImV4cCI6MjA3NTMxMDEzNH0.UGrKIZk3YSY5PAjM872H6jXEzAtsBeawqjoGZheL0lE
```

### Step 2: Restart Development Server
```bash
# Stop the server (Ctrl+C)
# Then start again
npm run dev
```

### Step 3: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Step 4: Test the Setup
```bash
node check-setup.js
```

Should show: `✅ All checks passed!`

## Still Not Working?

### Check Browser Console
1. Press F12 to open DevTools
2. Go to Console tab
3. Look for error messages
4. Common errors:
   - "Missing Supabase environment variables" → Check `.env.local`
   - "Failed to fetch" → Check Supabase project is active
   - "Invalid API key" → Verify the anon key is correct

### Verify Supabase Project
1. Go to https://supabase.com/dashboard
2. Check project `usynxptupskoeceomjky` is active (not paused)
3. Go to Settings > API
4. Verify the URL and anon key match your `.env.local`

### Test Connection Directly
```bash
node verify-supabase.js
```

This will test:
- Database connection
- Auth signup
- Auth signin

If this passes but the app still fails, the issue is with the frontend build.

### Nuclear Option: Fresh Start
```bash
# Stop dev server
# Delete node_modules
rmdir /s /q node_modules

# Delete .vite cache
rmdir /s /q node_modules\.vite

# Reinstall
npm install

# Restart
npm run dev
```

## What Was Fixed

1. **Environment file format**: Removed quotes from values
2. **Better error handling**: Added try-catch blocks in Auth.tsx
3. **Console logging**: Added debug logs in Supabase client
4. **Verification tools**: Created scripts to test setup

## Files Modified

- `.env.local` - Fixed format (no quotes)
- `frontend/integrations/supabase/client.ts` - Added error handling and logging
- `frontend/pages/Auth.tsx` - Added try-catch blocks and better error messages

## New Files Created

- `SETUP_GUIDE.md` - Complete setup instructions
- `TROUBLESHOOTING.md` - Common issues and solutions
- `verify-supabase.js` - Test Supabase connection
- `check-setup.js` - Verify complete setup
- `test-supabase-connection.html` - Browser-based connection test

## Next Steps

1. Run `node check-setup.js` to verify setup
2. Start dev server: `npm run dev`
3. Open http://localhost:8080 (or 8081)
4. Try registering a new account
5. Check browser console for any errors

## Support

If still having issues:
1. Check `TROUBLESHOOTING.md` for detailed solutions
2. Review browser console errors
3. Check Supabase Dashboard > Logs
4. Verify migrations are applied: `supabase db push`
