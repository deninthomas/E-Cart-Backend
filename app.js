import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import xss from 'xss-clean';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import fileupload from 'express-fileupload';

// Import routes
import uploadRoutes from './routes/uploadRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';

// Import middleware
import { errorHandler, notFound } from './middleware/error.js';

/**
 * Express application setup
 * This module configures the Express application with middleware, routes, and error handling.
 */
const app = express();

// Set security headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || true
    : true,
  credentials: true
}));

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 10 minutes'
});
app.use(limiter);

// Prevent http param pollution
app.use(hpp());

// Sanitize data
app.use(mongoSanitize());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// File uploading
app.use(fileupload());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/upload', uploadRoutes);

/**
 * Health Check Endpoint
 * Used by load balancers and monitoring tools to verify the service is running
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: process.uptime()
  });
});

// 404 handler
app.use(notFound);

// Error handler middleware
app.use(errorHandler);

/**
 * Error Handling Middleware
 * Centralized error handling for all routes
 */
app.use((err, req, res, next) => {
  // Log the error for debugging
  console.error('Error:', err.stack);
  
  // Handle specific error types
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ 
      success: false, 
      error: 'File too large. Maximum size is 5MB.' 
    });
  }
  
  if (err.message === 'Invalid file type. Only JPEG, JPG, and PNG files are allowed.') {
    return res.status(400).json({ 
      success: false, 
      error: err.message 
    });
  }
  
  // Default error response
  const errorResponse = {
    success: false,
    error: 'Internal Server Error'
  };
  
  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.message = err.message;
    errorResponse.stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;
  }
  
  res.status(500).json(errorResponse);
});

/**
 * 404 Handler
 * Catch-all for undefined routes
 */
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    documentation: process.env.API_DOCS_URL || 'No documentation available'
  });
});

// Export the Express app
export default app;
