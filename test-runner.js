const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test result file
const testResultsFile = path.join(__dirname, 'test-results.json');

console.log('🚀 Starting test suite...');

// Set NODE_ENV to test for the current process
process.env.NODE_ENV = 'test';

// Run the tests
const testProcess = exec('npm test -- --json --outputFile=test-results.json', {
  env: {
    ...process.env,
    FORCE_COLOR: '1'
  }
}, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Test execution failed: ${error.message}`);
    process.exit(1);
  }
});

// Log test output in real-time
testProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

testProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ All tests passed successfully!');
  } else {
    console.error(`❌ Some tests failed with code ${code}`);
    
    // If test results file exists, parse and display failed tests
    if (fs.existsSync(testResultsFile)) {
      try {
        const results = JSON.parse(fs.readFileSync(testResultsFile, 'utf8'));
        const failedTests = results.testResults.flatMap(testResult => 
          testResult.assertionResults
            .filter(assertion => assertion.status === 'failed')
            .map(assertion => ({
              title: assertion.title,
              failureMessages: assertion.failureMessages
            }))
        );
        
        if (failedTests.length > 0) {
          console.log('\nFailed Tests:');
          failedTests.forEach((test, index) => {
            console.log(`\n${index + 1}. ${test.title}`);
            test.failureMessages.forEach(msg => {
              console.log(`   ${msg.replace(/\n/g, '\n   ')}`);
            });
          });
        }
      } catch (e) {
        console.error('Error parsing test results:', e);
      }
    }
    
    process.exit(code);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nTest run aborted by user');
  testProcess.kill('SIGINT');
  process.exit(1);
});
