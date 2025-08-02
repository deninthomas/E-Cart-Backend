import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  image: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  }
});

const shippingInfoSchema = new mongoose.Schema({
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  city: {
    type: String,
    required: [true, 'City is required']
  },
  state: {
    type: String,
    required: [true, 'State is required']
  },
  country: {
    type: String,
    required: [true, 'Country is required']
  },
  postalCode: {
    type: String,
    required: [true, 'Postal code is required']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  }
});

const paymentInfoSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  update_time: {
    type: String,
    required: true
  },
  email_address: {
    type: String,
    required: true
  }
});

const trackingUpdateSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: [
      'Order Placed',
      'Processing',
      'Shipped',
      'In Transit',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
      'Returned'
    ]
  },
  location: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderItems: [orderItemSchema],
  shippingInfo: shippingInfoSchema,
  paymentInfo: paymentInfoSchema,
  itemsPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  orderStatus: {
    type: String,
    required: true,
    default: 'Processing',
    enum: [
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled',
      'Returned'
    ]
  },
  deliveredAt: Date,
  trackingNumber: {
    type: String,
    default: ''
  },
  trackingUpdates: [trackingUpdateSchema],
  isPaid: {
    type: Boolean,
    required: true,
    default: false
  },
  paidAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Update product stock when order is placed
orderSchema.pre('save', async function(next) {
  if (this.isModified('orderStatus') && this.orderStatus === 'Processing') {
    const bulkOps = this.orderItems.map(item => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { stock: -item.quantity } }
      }
    }));
    
    await mongoose.model('Product').bulkWrite(bulkOps);
  }
  next();
});

// Add tracking update when order status changes
orderSchema.pre('save', async function(next) {
  if (this.isModified('orderStatus')) {
    this.trackingUpdates.unshift({
      date: new Date(),
      status: this.orderStatus,
      location: this.shippingInfo.city,
      details: `Order status updated to ${this.orderStatus}`
    });
  }
  next();
});

// Static method to get monthly sales
orderSchema.statics.getMonthlySales = async function() {
  const monthlySales = await this.aggregate([
    {
      $match: {
        isPaid: true
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        totalSales: { $sum: '$totalPrice' },
        numOrders: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    },
    {
      $limit: 12
    }
  ]);

  return monthlySales;
};

// Create and export the Order model
export default mongoose.model('Order', orderSchema);
