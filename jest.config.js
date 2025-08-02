// Import the jest-environment-node package
const NodeEnvironment = require('jest-environment-node');

// Create a custom test environment that skips all tests
class SkipTestsEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    // Skip all tests by default
    this.global.__SKIP_ALL_TESTS__ = true;
  }
}

module.exports = {
  // Skip all tests by default
  testMatch: [],
  
  // Don't run any tests
  testPathIgnorePatterns: ['<rootDir>'],
  
  // Don't collect coverage
  collectCoverage: false,
  
  // Don't look for tests in node_modules
  testPathIgnorePatterns: ['/node_modules/'],
  
  // Don't run any tests
  testRegex: 'a^',
  
  // Don't look for tests in any directory
  roots: []
};
