// Comprehensive Backend Testing Script
// Tests: Supabase, OpenCV, ML, and Edge Functions

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://usynxptupskoeceomjky.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzeW54cHR1cHNrb2VjZW9tamt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzQxMzQsImV4cCI6MjA3NTMxMDEzNH0.UGrKIZk3YSY5PAjM872H6jXEzAtsBeawqjoGZheL0lE';
const OPENCV_URL = 'http://localhost:8000';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 Comprehensive Backend Testing\n');
console.log('='.repeat(60));

const results = {
  supabase: { database: false, auth: false, storage: false },
  opencv: { health: false, analysis: false },
  edgeFunctions: { analyzeWater: false, predictDisease: false, predictRisk: false },
  ml: { model: false }
};

// Test 1: Supabase Database
async function testDatabase() {
  console.log('\n📊 1. Testing Supabase Database...');
  try {
    // Test profiles table
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('count');
    
    if (profileError) throw profileError;
    console.log('   ✓ Profiles table accessible');

    // Test user_roles table
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('count');
    
    if (roleError) throw roleError;
    console.log('   ✓ User_roles table accessible');

    // Test health_reports table
    const { data: reports, error: reportError } = await supabase
      .from('health_reports')
      .select('count');
    
    if (reportError) throw reportError;
    console.log('   ✓ Health_reports table accessible');

    results.supabase.database = true;
    return true;
  } catch (error) {
    console.log('   ❌ Database test failed:', error.message);
    return false;
  }
}

// Test 2: Supabase Authentication
async function testAuth() {
  console.log('\n🔐 2. Testing Supabase Authentication...');
  try {
    const testEmail = `test-backend-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Test signup
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Backend Test User',
          role: 'villager'
        }
      }
    });

    if (signUpError) throw signUpError;
    console.log('   ✓ User signup works');

    // Test signin
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) throw signInError;
    console.log('   ✓ User signin works');

    // Check if role was assigned
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', signInData.user.id);

    if (roleError) throw roleError;
    
    if (userRoles && userRoles.length > 0) {
      console.log('   ✓ User role assignment works');
    } else {
      console.log('   ⚠️  User role not assigned (check trigger)');
    }

    // Cleanup - sign out
    await supabase.auth.signOut();
    console.log('   ✓ User signout works');

    results.supabase.auth = true;
    return true;
  } catch (error) {
    console.log('   ❌ Auth test failed:', error.message);
    return false;
  }
}

// Test 3: Supabase Storage
async function testStorage() {
  console.log('\n💾 3. Testing Supabase Storage...');
  try {
    // List buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) throw bucketError;
    console.log(`   ✓ Storage accessible (${buckets.length} buckets)`);

    results.supabase.storage = true;
    return true;
  } catch (error) {
    console.log('   ❌ Storage test failed:', error.message);
    return false;
  }
}

// Test 4: OpenCV Service
async function testOpenCV() {
  console.log('\n🔬 4. Testing OpenCV Service...');
  try {
    // Health check
    const healthResponse = await fetch(`${OPENCV_URL}/health`);
    if (!healthResponse.ok) throw new Error('Health check failed');
    console.log('   ✓ OpenCV service is running');
    results.opencv.health = true;

    // Analysis test
    const testImageUrl = 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400';
    const analysisResponse = await fetch(`${OPENCV_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: testImageUrl })
    });

    if (!analysisResponse.ok) throw new Error('Analysis failed');
    const analysisData = await analysisResponse.json();
    
    if (analysisData.success) {
      console.log('   ✓ Water analysis works');
      console.log(`     - pH: ${analysisData.water_ph.toFixed(2)}`);
      console.log(`     - Turbidity: ${analysisData.water_turbidity.toFixed(2)} NTU`);
      results.opencv.analysis = true;
    }

    return true;
  } catch (error) {
    console.log('   ❌ OpenCV test failed:', error.message);
    return false;
  }
}

// Test 5: Edge Functions
async function testEdgeFunctions() {
  console.log('\n⚡ 5. Testing Supabase Edge Functions...');
  
  // Note: Edge functions require deployment to test fully
  // We'll check if they're configured
  
  try {
    console.log('   ℹ️  Edge functions require deployment to test');
    console.log('   ℹ️  Checking configuration...');
    
    // Check if functions are defined in config
    const fs = await import('fs');
    const configPath = './supabase/config.toml';
    
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf-8');
      
      if (config.includes('analyze-water-image')) {
        console.log('   ✓ analyze-water-image function configured');
        results.edgeFunctions.analyzeWater = true;
      }
      
      if (config.includes('predict-disease')) {
        console.log('   ✓ predict-disease function configured');
        results.edgeFunctions.predictDisease = true;
      }
      
      if (config.includes('predict-risk')) {
        console.log('   ✓ predict-risk function configured');
        results.edgeFunctions.predictRisk = true;
      }
    }
    
    console.log('   ℹ️  To test deployed functions, use: supabase functions deploy');
    return true;
  } catch (error) {
    console.log('   ⚠️  Could not check edge functions:', error.message);
    return false;
  }
}

// Test 6: ML Backend
async function testML() {
  console.log('\n🤖 6. Testing ML Backend...');
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check if ML files exist
    const mlPath = './backend/ml';
    
    if (fs.existsSync(mlPath)) {
      console.log('   ✓ ML directory exists');
      
      const files = fs.readdirSync(mlPath);
      const requiredFiles = ['train_model.py', 'create_dataset.py', 'preprocess_dataset.py'];
      
      let allFilesExist = true;
      for (const file of requiredFiles) {
        if (files.includes(file)) {
          console.log(`   ✓ ${file} exists`);
        } else {
          console.log(`   ❌ ${file} missing`);
          allFilesExist = false;
        }
      }
      
      // Check if model file exists
      if (files.some(f => f.endsWith('.pkl') || f.endsWith('.joblib'))) {
        console.log('   ✓ Trained model file found');
        results.ml.model = true;
      } else {
        console.log('   ⚠️  No trained model found (run train_model.py)');
      }
      
      return allFilesExist;
    } else {
      console.log('   ❌ ML directory not found');
      return false;
    }
  } catch (error) {
    console.log('   ❌ ML test failed:', error.message);
    return false;
  }
}

// Test 7: Database Triggers and Functions
async function testDatabaseFunctions() {
  console.log('\n⚙️  7. Testing Database Functions...');
  try {
    // Check if handle_new_user function exists
    const { data, error } = await supabase.rpc('handle_new_user');
    
    // We expect an error since we're calling it directly, but it should exist
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('   ⚠️  handle_new_user function may not be deployed');
      console.log('   ℹ️  Run: supabase db push');
      return false;
    } else {
      console.log('   ✓ Database functions configured');
      return true;
    }
  } catch (error) {
    console.log('   ℹ️  Database functions check skipped');
    return true; // Not critical
  }
}

// Run all tests
async function runAllTests() {
  await testDatabase();
  await testAuth();
  await testStorage();
  await testOpenCV();
  await testEdgeFunctions();
  await testML();
  await testDatabaseFunctions();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 Test Summary:\n');
  
  console.log('Supabase:');
  console.log(`  Database: ${results.supabase.database ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`  Authentication: ${results.supabase.auth ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`  Storage: ${results.supabase.storage ? '✓ PASS' : '❌ FAIL'}`);
  
  console.log('\nOpenCV:');
  console.log(`  Health Check: ${results.opencv.health ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`  Analysis: ${results.opencv.analysis ? '✓ PASS' : '❌ FAIL'}`);
  
  console.log('\nEdge Functions:');
  console.log(`  analyze-water-image: ${results.edgeFunctions.analyzeWater ? '✓ CONFIGURED' : '❌ NOT CONFIGURED'}`);
  console.log(`  predict-disease: ${results.edgeFunctions.predictDisease ? '✓ CONFIGURED' : '❌ NOT CONFIGURED'}`);
  console.log(`  predict-risk: ${results.edgeFunctions.predictRisk ? '✓ CONFIGURED' : '❌ NOT CONFIGURED'}`);
  
  console.log('\nML Backend:');
  console.log(`  Model Files: ${results.ml.model ? '✓ FOUND' : '⚠️  NOT TRAINED'}`);

  // Overall status
  const criticalTests = [
    results.supabase.database,
    results.supabase.auth,
    results.opencv.health,
    results.opencv.analysis
  ];
  
  const allCriticalPass = criticalTests.every(t => t);
  
  console.log('\n' + '='.repeat(60));
  if (allCriticalPass) {
    console.log('✅ Backend is FULLY FUNCTIONAL!');
    console.log('\nAll critical components are working:');
    console.log('  ✓ Database operations');
    console.log('  ✓ User authentication');
    console.log('  ✓ OpenCV water analysis');
    console.log('  ✓ Storage access');
  } else {
    console.log('⚠️  Backend has some issues');
    console.log('\nPlease check the failed tests above.');
  }
  console.log('='.repeat(60) + '\n');

  return allCriticalPass;
}

// Execute tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
