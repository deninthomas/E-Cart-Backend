import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configure AWS SDK with credentials from environment variables
 * AWS_ACCESS_KEY_ID: Your AWS access key ID
 * AWS_SECRET_ACCESS_KEY: Your AWS secret access key
 * AWS_REGION: The AWS region where your S3 bucket is located
 */
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

/**
 * Uploads a file to S3
 * @param {Object} file - The file object from multer
 * @param {Buffer} file.buffer - The file data
 * @param {string} file.originalname - The original file name
 * @param {string} file.mimetype - The MIME type of the file
 * @returns {Promise<Object>} - S3 upload response with Location and Key
 */
const uploadFile = (file) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `${uuidv4()}-${file.originalname}`, // Unique filename
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read', // Makes the file publicly accessible
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        console.error('Error uploading to S3:', err);
        reject(err);
      }
      console.log('File uploaded successfully:', data.Location);
      resolve(data);
    });
  });
};

/**
 * Gets a file stream from S3
 * @param {string} fileKey - The key of the file in the S3 bucket
 * @returns {ReadableStream} - A readable stream of the file data
 */
const getFileStream = (fileKey) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileKey,
  };

  return s3.getObject(params).createReadStream();
};

/**
 * Deletes a file from S3
 * @param {string} fileKey - The key of the file to delete
 * @returns {Promise<Object>} - S3 delete response
 */
const deleteFile = (fileKey) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileKey,
  };

  return new Promise((resolve, reject) => {
    s3.deleteObject(params, (err, data) => {
      if (err) {
        console.error('Error deleting from S3:', err);
        reject(err);
      }
      console.log('File deleted successfully:', fileKey);
      resolve(data);
    });
  });
};

// Export the service functions
export { uploadFile, getFileStream, deleteFile };
