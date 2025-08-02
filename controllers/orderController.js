import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../middleware/async.js';
import { v4 as uuidv4 } from 'uuid';

// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res, next) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return next(new ErrorResponse('No order items', 400));
  }

  // Verify all products exist and are in stock
  const productIds = orderItems.map(item => item.product);
  const products = await Product.find({ _id: { $in: productIds } });

  if (products.length !== orderItems.length) {
    return next(new ErrorResponse('One or more products not found', 404));
  }

  // Check stock and calculate prices
  let calculatedItemsPrice = 0;
  const orderItemsWithDetails = [];

  for (const item of orderItems) {
    const product = products.find(p => p._id.toString() === item.product);
    
    if (product.stock < item.quantity) {
      return next(
        new ErrorResponse(`Not enough stock for ${product.name}`, 400)
      );
    }

    calculatedItemsPrice += item.price * item.quantity;

    orderItemsWithDetails.push({
      product: item.product,
      name: product.name,
      quantity: item.quantity,
      image: item.image || product.images[0]?.url || '',
      price: item.price,
    });
  }

  // Verify calculated prices match provided prices
  if (calculatedItemsPrice !== itemsPrice) {
    return next(new ErrorResponse('Cart items have been updated', 400));
  }

  // Calculate tax if not provided
  const calculatedTaxPrice = taxPrice || Number((0.15 * itemsPrice).toFixed(2));
  const calculatedShippingPrice = shippingPrice || (itemsPrice > 100 ? 0 : 10);
  const calculatedTotalPrice = (
    itemsPrice +
    calculatedTaxPrice +
    calculatedShippingPrice
  ).toFixed(2);

  if (calculatedTotalPrice !== totalPrice) {
    return next(new ErrorResponse('Order total does not match', 400));
  }

  // Create order
  const order = new Order({
    orderItems: orderItemsWithDetails,
    user: req.user._id,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice: calculatedTaxPrice,
    shippingPrice: calculatedShippingPrice,
    totalPrice: calculatedTotalPrice,
    trackingUpdates: [
      {
        date: new Date(),
        status: 'Order Placed',
        location: 'Processing Center',
        details: 'Your order has been received',
      },
    ],
  });

  const createdOrder = await order.save();

  // Clear the user's cart
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    await cart.clearCart();
  }

  res.status(201).json({
    success: true,
    data: createdOrder,
  });
});

// @desc    Get order by ID
// @route   GET /api/v1/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email'
  );

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Check if user is authorized to view this order
  if (
    order.user._id.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(
      new ErrorResponse('Not authorized to view this order', 401)
    );
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Update order to paid
// @route   PUT /api/v1/orders/:id/pay
// @access  Private
export const updateOrderToPaid = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Check if user is authorized to update this order
  if (
    order.user.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(
      new ErrorResponse('Not authorized to update this order', 401)
    );
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: req.body.id || uuidv4(),
    status: req.body.status || 'COMPLETED',
    update_time: req.body.update_time || new Date().toISOString(),
    email_address: req.body.email_address || req.user.email,
  };

  // Add tracking update
  order.trackingUpdates.unshift({
    date: new Date(),
    status: 'Processing',
    location: 'Processing Center',
    details: 'Payment received. Preparing for shipment.',
  });

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    data: updatedOrder,
  });
});

// @desc    Update order to delivered
// @route   PUT /api/v1/orders/:id/deliver
// @access  Private/Admin
export const updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  order.orderStatus = 'Delivered';

  // Add tracking update
  order.trackingUpdates.unshift({
    date: new Date(),
    status: 'Delivered',
    location: order.shippingAddress.city,
    details: 'Your order has been delivered successfully.',
  });

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    data: updatedOrder,
  });
});

// @desc    Update order status
// @route   PUT /api/v1/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status, trackingNumber, location, details } = req.body;

  if (!status) {
    return next(new ErrorResponse('Status is required', 400));
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Update order status
  order.orderStatus = status;
  
  // Update tracking number if provided
  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
  }

  // Add tracking update
  order.trackingUpdates.unshift({
    date: new Date(),
    status,
    location: location || 'Processing Center',
    details: details || `Order status updated to ${status}`,
  });

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    data: updatedOrder,
  });
});

// @desc    Get logged in user orders
// @route   GET /api/v1/orders/myorders
// @access  Private
export const getMyOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

// @desc    Get all orders
// @route   GET /api/v1/orders
// @access  Private/Admin
export const getOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find({})
    .populate('user', 'id name')
    .sort({ createdAt: -1 });
    
  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

// @desc    Get monthly sales
// @route   GET /api/v1/orders/monthly-sales
// @access  Private/Admin
export const getMonthlySales = asyncHandler(async (req, res, next) => {
  const monthlySales = await Order.aggregate([
    {
      $match: {
        isPaid: true,
        paidAt: {
          $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$paidAt' },
        totalSales: { $sum: '$totalPrice' },
        numOrders: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  res.status(200).json({
    success: true,
    data: monthlySales,
  });
});

// @desc    Get order statistics
// @route   GET /api/v1/orders/stats
// @access  Private/Admin
export const getOrderStats = asyncHandler(async (req, res, next) => {
  const stats = await Order.aggregate([
    {
      $match: { isPaid: true },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$totalPrice' },
        totalOrders: { $sum: 1 },
        avgOrderValue: { $avg: '$totalPrice' },
        minOrderValue: { $min: '$totalPrice' },
        maxOrderValue: { $max: '$totalPrice' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: stats[0] || {},
  });
});
