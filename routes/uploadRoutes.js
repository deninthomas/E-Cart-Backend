import express from 'express';
import upload from '../utils/multerConfig.js';
import { uploadImage, getImage } from '../controllers/uploadController.js';

const router = express.Router();

// @route   POST /api/upload
// @desc    Upload a file
// @access  Public
router.post('/upload', upload.single('file'), uploadImage);

// @route   GET /api/files/:key
// @desc    Get a file
// @access  Public
router.get('/files/:key', getImage);

// Export the router as default
export default router;
