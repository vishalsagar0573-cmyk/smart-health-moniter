// Quick setup checker for Health Monitor application
// Run with: node check-setup.js

import { existsSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

console.log('🔍 Health Monitor - Setup Checker\n');
console.log('='.repeat(50));

let allChecks = true;

// Check 1: Node modules
console.log('\n1. Checking node_modules...');
if (existsSync('./node_modules')) {
  console.log('   ✓ node_modules found');
} else {
  console.log('   ❌ node_modules not found. Run: npm install');
  allChecks = false;
}

// Check 2: .env.local file
console.log('\n2. Checking .env.local file...');
if (existsSync('./.env.local')) {
  console.log('   ✓ .env.local file exists');
  
  const envContent = readFileSync('./.env.local', 'utf-8');
  
  // Check for required variables
  const hasUrl = envContent.includes('VITE_SUPABASE_URL=');
  const hasKey = envContent.includes('VITE_SUPABASE_ANON_KEY=');
  
  if (hasUrl) {
    console.log('   ✓ VITE_SUPABASE_URL is set');
  } else {
    console.log('   ❌ VITE_SUPABASE_URL is missing');
    allChecks = false;
  }
  
  if (hasKey) {
    console.log('   ✓ VITE_SUPABASE_ANON_KEY is set');
  } else {
    console.log('   ❌ VITE_SUPABASE_ANON_KEY is missing');
    allChecks = false;
  }
  
  // Check for quotes (common mistake)
  if (envContent.includes('"') || envContent.includes("'")) {
    console.log('   ⚠️  Warning: Found quotes in .env.local. Remove them!');
    console.log('   Example: VITE_SUPABASE_URL=https://... (no quotes)');
  }
  
} else {
  console.log('   ❌ .env.local file not found');
  console.log('   Create it with:');
  console.log('   VITE_SUPABASE_URL=https://usynxptupskoeceomjky.supabase.co');
  console.log('   VITE_SUPABASE_ANON_KEY=your-anon-key');
  allChecks = false;
}

// Check 3: Supabase connection
console.log('\n3. Testing Supabase connection...');
try {
  const envContent = readFileSync('./.env.local', 'utf-8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
  
  if (urlMatch && keyMatch) {
    const url = urlMatch[1].trim().replace(/['"]/g, '');
    const key = keyMatch[1].trim().replace(/['"]/g, '');
    
    const supabase = createClient(url, key);
    
    const { data, error } = await supabase.from('profiles').select('count');
    
    if (error) {
      console.log('   ❌ Supabase connection failed:', error.message);
      console.log('   Check:');
      console.log('   - Is your Supabase project active?');
      console.log('   - Are the credentials correct?');
      console.log('   - Have migrations been applied?');
      allChecks = false;
    } else {
      console.log('   ✓ Supabase connection successful');
    }
  }
} catch (err) {
  console.log('   ❌ Could not test Supabase connection:', err.message);
  allChecks = false;
}

// Check 4: Migrations
console.log('\n4. Checking database migrations...');
console.log('   ℹ️  Ensure migrations are applied in Supabase Dashboard');
console.log('   Or run: supabase db push');

// Summary
console.log('\n' + '='.repeat(50));
if (allChecks) {
  console.log('✅ All checks passed! You\'re ready to start development.');
  console.log('\nRun: npm run dev');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  console.log('\nFor detailed help, see:');
  console.log('- SETUP_GUIDE.md');
  console.log('- TROUBLESHOOTING.md');
}
console.log('='.repeat(50) + '\n');

process.exit(allChecks ? 0 : 1);
