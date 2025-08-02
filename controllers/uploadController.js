import { uploadFile, getFileStream } from '../services/s3Service.js';

/**
 * @desc    Upload a file to S3
 * @route   POST /api/upload
 * @access  Public
 * @param   {Object} req - Express request object
 * @param   {Object} req.file - The uploaded file from multer
 * @param   {Object} res - Express response object
 * @returns {Object} JSON response with upload result or error
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await uploadFile(req.file);
    
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        imageUrl: result.Location,
        key: result.Key
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error uploading file',
      details: error.message 
    });
  }
};

/**
 * @desc    Stream a file from S3
 * @route   GET /api/files/:key
 * @access  Public
 * @param   {Object} req - Express request object
 * @param   {string} req.params.key - The S3 object key
 * @param   {Object} res - Express response object
 * @returns {Stream} File stream or error response
 */
const getImage = (req, res) => {
  try {
    const key = req.params.key;
    const readStream = getFileStream(key);
    
    // Handle errors on the stream
    readStream.on('error', (error) => {
      console.error('Stream error:', error);
      res.status(404).json({ 
        success: false, 
        error: 'File not found' 
      });
    });
    
    // Pipe the file stream to the response
    readStream.pipe(res);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error retrieving file',
      details: error.message 
    });
  }
};

// Export the controller functions
export { uploadImage, getImage };
