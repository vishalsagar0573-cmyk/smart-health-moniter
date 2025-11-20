# Troubleshooting Guide - "Invalid API Key" Error

## Issue
When trying to login or register as a health worker or villager, you receive an "Invalid API Key" error.

## Root Causes and Solutions

### 1. Environment Variables Not Loaded
**Solution:** Ensure your `.env.local` file is properly formatted and restart the dev server.

Your `.env.local` should look like this (no quotes):
```
VITE_SUPABASE_URL=https://usynxptupskoeceomjky.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzeW54cHR1cHNrb2VjZW9tamt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzQxMzQsImV4cCI6MjA3NTMxMDEzNH0.UGrKIZk3YSY5PAjM872H6jXEzAtsBeawqjoGZheL0lE
```

**Steps:**
1. Stop the dev server (Ctrl+C)
2. Verify `.env.local` file exists in the project root
3. Restart the dev server: `npm run dev`
4. Clear browser cache and reload

### 2. Supabase Project Not Configured
**Solution:** Verify your Supabase project is active and properly configured.

**Steps:**
1. Go to https://supabase.com/dashboard
2. Check if project `usynxptupskoeceomjky` exists and is active
3. Verify the API keys match:
   - Go to Project Settings > API
   - Copy the `URL` and `anon/public` key
   - Update `.env.local` if they don't match

### 3. Database Migrations Not Applied
**Solution:** Ensure all database migrations are applied.

**Steps:**
```bash
# If using Supabase CLI
supabase db push

# Or apply migrations manually in Supabase Dashboard
# Go to SQL Editor and run the migration files in order
```

### 4. Email Confirmation Required
**Solution:** Disable email confirmation for testing (or check your email).

**Steps:**
1. Go to Supabase Dashboard > Authentication > Providers
2. Click on Email provider
3. Disable "Confirm email" option
4. Save changes

### 5. CORS or Network Issues
**Solution:** Check browser console for CORS errors.

**Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for CORS or network errors
4. If CORS errors exist, check Supabase project settings

### 6. Invalid API Key Format
**Solution:** Verify the API key is complete and not truncated.

The anon key should be a long JWT token (starts with `eyJ...`). If it's truncated in the `.env.local` file, it will cause this error.

## Testing the Connection

1. Open `test-supabase-connection.html` in your browser
2. Check the console for connection status
3. If connection fails, the issue is with Supabase configuration

## Quick Fix Checklist

- [ ] `.env.local` file exists in project root
- [ ] Environment variables have no quotes
- [ ] Dev server was restarted after changing `.env.local`
- [ ] Browser cache was cleared
- [ ] Supabase project is active
- [ ] Database migrations are applied
- [ ] Email confirmation is disabled (for testing)

## Still Having Issues?

1. Check browser console for detailed error messages
2. Check Supabase Dashboard > Logs for API errors
3. Verify your Supabase project hasn't been paused
4. Try creating a new test account with a different email

## Contact Support

If none of these solutions work, the issue might be with:
- Supabase project configuration
- Network/firewall blocking Supabase
- Supabase service outage (check https://status.supabase.com)
