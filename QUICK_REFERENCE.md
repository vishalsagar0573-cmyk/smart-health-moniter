# Quick Reference Card

## Environment Setup
```bash
# .env.local (no quotes!)
VITE_SUPABASE_URL=https://usynxptupskoeceomjky.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Common Commands
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Check setup
node check-setup.js

# Verify Supabase
node verify-supabase.js

# Build for production
npm run build
```

## Troubleshooting
| Error | Solution |
|-------|----------|
| "Invalid API Key" | Check `.env.local` format, restart server |
| "Wrong input type" | Clear cache (Ctrl+F5), see `INPUT_TYPE_FIX.md` |
| "Failed to fetch" | Check Supabase project is active |
| "No role assigned" | Apply database migrations |
| "Email confirmation" | Disable in Supabase or check email |

## Quick Fixes
```bash
# Fix 1: Restart server
Ctrl+C
npm run dev

# Fix 2: Clear cache
# In browser: Ctrl+Shift+Delete

# Fix 3: Reinstall
rmdir /s /q node_modules
npm install
```

## Test Accounts
```
Health Worker:
- Email: worker@test.com
- Password: TestPassword123!

Villager:
- Email: villager@test.com
- Password: TestPassword123!
```

## File Locations
- Environment: `.env.local`
- Auth page: `frontend/pages/Auth.tsx`
- Supabase client: `frontend/integrations/supabase/client.ts`
- Migrations: `supabase/migrations/`

## Documentation
- Complete setup: `SETUP_GUIDE.md`
- Troubleshooting: `TROUBLESHOOTING.md`
- Quick fix: `QUICK_FIX.md`
- Input type fix: `INPUT_TYPE_FIX.md`
- Test accounts: `TEST_ACCOUNTS.md`
- Changes: `CHANGES_SUMMARY.md`

## URLs
- Dev server: http://localhost:8080
- Supabase: https://supabase.com/dashboard
- Project: https://usynxptupskoeceomjky.supabase.co

## Support Checklist
- [ ] `.env.local` exists and has no quotes
- [ ] Dev server restarted
- [ ] Browser cache cleared
- [ ] `check-setup.js` passes
- [ ] Supabase project is active
- [ ] Migrations applied
