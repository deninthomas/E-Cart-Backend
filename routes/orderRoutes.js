import express from 'express';
import {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  updateOrderStatus,
  getMyOrders,
  getOrders,
  getMonthlySales,
  getOrderStats,
} from '../controllers/orderController.js';

import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// User routes
router.route('/')
  .post(createOrder)
  .get(authorize('admin'), getOrders);

router.get('/myorders', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/pay', updateOrderToPaid);

// Admin routes
router.use(authorize('admin'));
router.put('/:id/deliver', updateOrderToDelivered);
router.put('/:id/status', updateOrderStatus);
router.get('/monthly-sales', getMonthlySales);
router.get('/stats', getOrderStats);

// Export the router as default
export default router;
