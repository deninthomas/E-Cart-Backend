import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate cart total price
cartSchema.virtual('totalPrice').get(function() {
  return this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
});

// Calculate total items in cart
cartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => {
    return total + item.quantity;
  }, 0);
});

// Update the updatedAt timestamp before saving
cartSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get or create user's cart
cartSchema.statics.getOrCreateCart = async function(userId) {
  let cart = await this.findOne({ user: userId });
  
  if (!cart) {
    cart = await this.create({ user: userId, items: [] });
  }
  
  return cart.populate('items.product', 'name price images stock');
};

// Method to add item to cart
cartSchema.methods.addItem = async function(productId, quantity = 1) {
  const product = await mongoose.model('Product').findById(productId);
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  if (product.stock < quantity) {
    throw new Error('Not enough stock available');
  }
  
  const itemIndex = this.items.findIndex(
    item => item.product.toString() === productId
  );
  
  if (itemIndex > -1) {
    // Item exists in cart, update quantity
    this.items[itemIndex].quantity += quantity;
  } else {
    // Add new item to cart
    this.items.push({
      product: productId,
      name: product.name,
      price: product.price,
      image: product.images[0]?.url || '',
      quantity: quantity
    });
  }
  
  return this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(
    item => item.product.toString() !== productId
  );
  
  return this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function(productId, quantity) {
  if (quantity < 1) {
    return this.removeItem(productId);
  }
  
  const item = this.items.find(
    item => item.product.toString() === productId
  );
  
  if (item) {
    item.quantity = quantity;
  }
  
  return this.save();
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

// Create index for user field
cartSchema.index({ user: 1 }, { unique: true });

// Create and export the Cart model
export default mongoose.model('Cart', cartSchema);
