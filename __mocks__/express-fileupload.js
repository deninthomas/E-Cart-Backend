// Mock implementation of express-fileupload
const mockFileUpload = () => (req, res, next) => {
  // Mock file object that would be attached to req.files
  req.files = req.files || {};
  next();
};

// Add mock methods that are used in the application
mockFileUpload.mocks = {
  file: () => ({
    name: 'test.jpg',
    mimetype: 'image/jpeg',
    data: Buffer.from('test image data'),
    mv: jest.fn().mockImplementation((path, callback) => {
      callback(null);
    })
  })
};

module.exports = mockFileUpload;
