// Import Jest globals
const { beforeEach, afterAll } = require('@jest/globals');
const mongoose = require('mongoose');

// Mock express-fileupload
jest.mock('express-fileupload', () => ({
  __esModule: true,
  default: () => (req, res, next) => {
    // Mock file object that would be attached to req.files
    req.files = req.files || {};
    next();
  },
  // Add any other exports that might be needed
}));

// Mock other modules if needed
jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
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
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  })
}));

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global test teardown
afterAll(async () => {
  // Close any open handles or connections
  if (mongoose.connection) {
    await mongoose.connection.close();
  }
});
