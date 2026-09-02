// Test script for OpenCV Water Quality Analysis Service
// Run with: node test-opencv-service.js

const OPENCV_SERVICE_URL = 'http://localhost:8000';

console.log('🧪 Testing OpenCV Water Quality Analysis Service\n');
console.log('='.repeat(50));

async function testHealthEndpoint() {
  console.log('\n1. Testing health endpoint...');
  try {
    const response = await fetch(`${OPENCV_SERVICE_URL}/health`);
    const data = await response.json();
    
    if (data.status === 'healthy') {
      console.log('   ✓ Health check passed');
      return true;
    } else {
      console.log('   ❌ Health check failed:', data);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
    return false;
  }
}

async function testAnalyzeEndpoint() {
  console.log('\n2. Testing analyze endpoint...');
  
  // Test with a sample water image URL
  // Using a placeholder image for testing
  const testImageUrl = 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400';
  
  try {
    const response = await fetch(`${OPENCV_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: testImageUrl
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('   ✓ Analysis successful');
      console.log('   Results:');
      console.log(`     - pH: ${data.water_ph.toFixed(2)}`);
      console.log(`     - Turbidity: ${data.water_turbidity.toFixed(2)} NTU`);
      console.log(`     - Quality Level: ${data.quality_level}`);
      console.log(`     - Quality Score: ${data.quality_score.toFixed(1)}/100`);
      console.log(`     - Brightness: ${data.brightness.toFixed(1)}`);
      console.log(`     - Analysis: ${data.analysis}`);
      return true;
    } else {
      console.log('   ❌ Analysis failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Analysis failed:', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n3. Testing error handling...');
  
  try {
    // Test with missing imageUrl
    const response = await fetch(`${OPENCV_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    
    if (!data.success && data.error) {
      console.log('   ✓ Error handling works correctly');
      console.log(`     - Error message: ${data.error}`);
      return true;
    } else {
      console.log('   ❌ Error handling not working as expected');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error handling test failed:', error.message);
    return false;
  }
}

async function runTests() {
  const results = {
    health: false,
    analyze: false,
    errorHandling: false
  };
  
  results.health = await testHealthEndpoint();
  results.analyze = await testAnalyzeEndpoint();
  results.errorHandling = await testErrorHandling();
  
  console.log('\n' + '='.repeat(50));
  console.log('Test Results:');
  console.log(`  Health Check: ${results.health ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`  Analysis: ${results.analyze ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`  Error Handling: ${results.errorHandling ? '✓ PASS' : '❌ FAIL'}`);
  
  const allPassed = results.health && results.analyze && results.errorHandling;
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All tests passed! OpenCV service is fully functional.');
  } else {
    console.log('❌ Some tests failed. Check the output above for details.');
  }
  console.log('='.repeat(50) + '\n');
  
  return allPassed;
}

// Run tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
