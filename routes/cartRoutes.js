import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  mergeCarts,
} from '../controllers/cartController.js';

import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/v1/cart
router.route('/')
  .get(getCart)
  .delete(clearCart);

// POST /api/v1/cart/items
router.route('/items')
  .post(addToCart);

// PUT /api/v1/cart/items/:productId
router.route('/items/:productId')
  .put(updateCartItem)
  .delete(removeFromCart);

// GET /api/v1/cart/summary
router.get('/summary', getCartSummary);

// POST /api/v1/cart/merge
router.post('/merge', mergeCarts);

// Export the router as default
export default router;
