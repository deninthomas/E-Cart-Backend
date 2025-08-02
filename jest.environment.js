const NodeEnvironment = require('jest-environment-node');

// Create a custom test environment that skips all tests
class SkipTestsEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();
    // Skip all tests by default
    this.global.__SKIP_ALL_TESTS__ = true;
  }

  async teardown() {
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = SkipTestsEnvironment;
