import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  productPhotoUpload,
  getProductsInRadius,
  createProductReview,
  getTopProducts,
} from '../controllers/productController.js';

import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/top', getTopProducts);
router.get('/:id', getProduct);
router.get('/radius/:zipcode/:distance', getProductsInRadius);

// Protected routes (require authentication)
router.use(protect);
router.post('/:id/reviews', createProductReview);

// Admin routes
router.use(authorize('admin'));
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.put('/:id/photo', productPhotoUpload);

// Export the router as default
export default router;
