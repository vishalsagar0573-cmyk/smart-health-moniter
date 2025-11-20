# Test Accounts

## Creating Test Accounts

### Health Worker Account
1. Go to http://localhost:8080 (or 8081)
2. Click "Health Worker" tab
3. Click "Register" sub-tab
4. Fill in:
   - Full Name: `Dr. Test Worker`
   - Email: `worker@test.com`
   - Password: `TestPassword123!`
5. Click "Register as Health Worker"

### Villager Account
1. Go to http://localhost:8080 (or 8081)
2. Click "Village People" tab
3. Click "Register" sub-tab
4. Fill in:
   - Full Name: `Test Villager`
   - Email: `villager@test.com`
   - Password: `TestPassword123!`
5. Click "Register as Villager"

## Login

### Health Worker Login
- Email: `worker@test.com`
- Password: `TestPassword123!`
- Dashboard: `/worker-dashboard`

### Villager Login
- Email: `villager@test.com`
- Password: `TestPassword123!`
- Dashboard: `/villager-dashboard`

## Troubleshooting Registration

### "Invalid API Key" Error
- Check `.env.local` file exists and has correct format
- Restart dev server
- Clear browser cache
- See `QUICK_FIX.md`

### "Email already registered" Error
- Use a different email
- Or delete the user from Supabase Dashboard > Authentication > Users

### "No role assigned" Error
- Check database migrations are applied
- Verify `handle_new_user` function exists in Supabase
- Manually add role in Supabase Dashboard:
  ```sql
  INSERT INTO user_roles (user_id, role)
  VALUES ('user-id-here', 'villager');
  ```

### Email Confirmation Required
If you see "Check your email for confirmation":
1. Check your email inbox
2. Click the confirmation link
3. **OR** disable email confirmation:
   - Go to Supabase Dashboard
   - Authentication > Providers > Email
   - Uncheck "Confirm email"

## Testing Features

### As Villager
1. Report health issues
2. Upload water sample images
3. View your reports
4. See risk assessments

### As Health Worker
1. View all reports from villagers
2. Analyze trends and patterns
3. View maps of report locations
4. Provide safety advice

## Database Queries

### Check if user has role
```sql
SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'worker@test.com';
```

### Add role manually
```sql
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'worker@test.com'),
  'health_worker'
);
```

### View all users and roles
```sql
SELECT 
  u.email,
  p.full_name,
  ur.role,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;
```

## Automated Test Account Creation

Run the verification script to create a test account:
```bash
node verify-supabase.js
```

This creates a test villager account with:
- Email: `test-[timestamp]@example.com`
- Password: `TestPassword123!`
- Role: `villager`
