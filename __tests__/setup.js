// Load environment variables for testing
require('dotenv').config({ path: '.env.test' });
const mongoose = require('mongoose');

// Mock console methods to keep test output clean
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Mock AWS S3 to prevent actual file uploads during tests
jest.mock('aws-sdk', () => {
  return {
    S3: jest.fn().mockImplementation(() => ({
      upload: jest.fn().mockImplementation(() => ({
        promise: jest.fn().mockResolvedValue({
          Location: 'https://test-bucket.s3.amazonaws.com/test.jpg',
          Key: 'test-key'
        })
      })),
      deleteObject: jest.fn().mockImplementation(() => ({
        promise: jest.fn().mockResolvedValue({})
      }))
    }))
  };
});

// Mock nodemailer to prevent actual emails during tests
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  })
}));

beforeAll(async () => {
  // Suppress console output during tests
  console.log = jest.fn();
  console.error = jest.fn();
  
  // Set test environment variables if not already set
  process.env.NODE_ENV = 'test';
  process.env.PORT = process.env.PORT || '5001';
  process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/ecommerce_test';
  process.env.JWT_SECRET = 'test_secret_key';
  process.env.JWT_EXPIRE = '1h';
  process.env.JWT_COOKIE_EXPIRE = '30';
  
  // Connect to the test database
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log('Connected to test database');
  } catch (error) {
    console.error('Test database connection error:', error);
    process.exit(1);
  }
});

afterEach(async () => {
  // Clear all test data after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  // Close the database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Restore original console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global test timeout
jest.setTimeout(60000); // 60 seconds
