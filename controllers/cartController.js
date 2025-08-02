import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../middleware/async.js';

// @desc    Get user's cart
// @route   GET /api/v1/cart
// @access  Private
export const getCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.getOrCreateCart(req.user.id);
  
  res.status(200).json({
    success: true,
    data: cart
  });
});

// @desc    Add item to cart
// @route   POST /api/v1/cart/items
// @access  Private
export const addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;
  
  if (!productId) {
    return next(new ErrorResponse('Please provide a product ID', 400));
  }
  
  // Get or create cart for user
  const cart = await Cart.getOrCreateCart(req.user.id);
  
  // Add item to cart
  await cart.addItem(productId, quantity);
  
  // Return updated cart
  const updatedCart = await Cart.getOrCreateCart(req.user.id);
  
  res.status(200).json({
    success: true,
    data: updatedCart
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/items/:productId
// @access  Private
export const updateCartItem = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  
  if (quantity === undefined || quantity === null) {
    return next(new ErrorResponse('Please provide a quantity', 400));
  }
  
  // Get or create cart for user
  const cart = await Cart.getOrCreateCart(req.user.id);
  
  // Update item quantity
  await cart.updateItemQuantity(productId, quantity);
  
  // Return updated cart
  const updatedCart = await Cart.getOrCreateCart(req.user.id);
  
  res.status(200).json({
    success: true,
    data: updatedCart
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/items/:productId
// @access  Private
export const removeFromCart = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  
  // Get or create cart for user
  const cart = await Cart.getOrCreateCart(req.user.id);
  
  // Remove item from cart
  await cart.removeItem(productId);
  
  // Return updated cart
  const updatedCart = await Cart.getOrCreateCart(req.user.id);
  
  res.status(200).json({
    success: true,
    data: updatedCart
  });
});

// @desc    Clear cart
// @route   DELETE /api/v1/cart
// @access  Private
export const clearCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.getOrCreateCart(req.user.id);
  
  // Clear cart
  await cart.clearCart();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get cart summary
// @route   GET /api/v1/cart/summary
// @access  Private
export const getCartSummary = asyncHandler(async (req, res, next) => {
  const cart = await Cart.getOrCreateCart(req.user.id);
  
  res.status(200).json({
    success: true,
    data: {
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      items: cart.items.length
    }
  });
});

// @desc    Merge user's temporary cart with their account cart after login
// @route   POST /api/v1/cart/merge
// @access  Private
export const mergeCarts = asyncHandler(async (req, res, next) => {
  const { guestCart } = req.body;
  
  if (!guestCart || !Array.isArray(guestCart.items)) {
    return next(new ErrorResponse('Invalid guest cart data', 400));
  }
  
  // Get or create user cart
  const userCart = await Cart.getOrCreateCart(req.user.id);
  
  // Add each item from guest cart to user cart
  for (const item of guestCart.items) {
    try {
      await userCart.addItem(item.product, item.quantity);
    } catch (error) {
      // Skip items that cause errors (e.g., product not found)
      console.error(`Error merging cart item ${item.product}:`, error.message);
    }
  }
  
  // Return updated cart
  const updatedCart = await Cart.getOrCreateCart(req.user.id);
  
  res.status(200).json({
    success: true,
    data: updatedCart
  });
});
