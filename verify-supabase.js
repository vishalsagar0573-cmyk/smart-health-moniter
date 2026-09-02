// Simple Node.js script to verify Supabase connection
// Run with: node verify-supabase.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://usynxptupskoeceomjky.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzeW54cHR1cHNrb2VjZW9tamt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzQxMzQsImV4cCI6MjA3NTMxMDEzNH0.UGrKIZk3YSY5PAjM872H6jXEzAtsBeawqjoGZheL0lE';

console.log('Testing Supabase connection...');
console.log('URL:', SUPABASE_URL);
console.log('Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  try {
    // Test 1: Check if we can query the profiles table
    console.log('\n1. Testing database connection...');
    const { data, error } = await supabase.from('profiles').select('count');
    
    if (error) {
      console.error('❌ Database query failed:', error.message);
      return false;
    }
    console.log('✓ Database connection successful');

    // Test 2: Try to sign up a test user
    console.log('\n2. Testing auth signup...');
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Test User',
          role: 'villager'
        }
      }
    });

    if (signUpError) {
      console.error('❌ Auth signup failed:', signUpError.message);
      return false;
    }
    console.log('✓ Auth signup successful');
    console.log('User ID:', signUpData.user?.id);

    // Test 3: Try to sign in
    console.log('\n3. Testing auth signin...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'TestPassword123!'
    });

    if (signInError) {
      console.error('❌ Auth signin failed:', signInError.message);
      return false;
    }
    console.log('✓ Auth signin successful');

    console.log('\n✅ All tests passed! Supabase is configured correctly.');
    return true;
  } catch (err) {
    console.error('\n❌ Unexpected error:', err.message);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
