import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * Memory storage engine for multer that stores files in memory as Buffer objects.
 * This is used instead of disk storage to avoid writing files to disk and directly
 * stream them to S3, which is more efficient and secure.
 */
const storage = multer.memoryStorage();

/**
 * File filter function that determines which files are accepted.
 * @param {Object} req - Express request object
 * @param {Object} file - File object containing file information
 * @param {Function} cb - Callback function (error, acceptFile)
 */
const fileFilter = (req, file, cb) => {
  // Define allowed MIME types for images
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file with an error
    cb(new Error('Invalid file type. Only JPEG, JPG, and PNG files are allowed.'), false);
  }
};

/**
 * Configured multer middleware with the following settings:
 * - memoryStorage: Store files in memory as Buffer objects
 * - fileFilter: Only allow specific image MIME types
 * - limits: Enforce file size limits
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit (in bytes)
    // Other possible limits:
    // files: 1, // Maximum number of files
    // fields: 10, // Maximum number of non-file fields
    // fieldNameSize: 100, // Max field name size
    // fieldSize: 200, // Max field value size
  },
});

// Export the configured multer middleware
export default upload;
