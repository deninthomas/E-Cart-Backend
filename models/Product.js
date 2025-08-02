import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price must be a positive number'],
    set: val => Math.round(val * 100) / 100 // Ensure 2 decimal places
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String
  }],
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: {
      values: [
        'Electronics',
        'Clothing',
        'Home & Kitchen',
        'Books',
        'Toys',
        'Sports',
        'Beauty',
        'Other'
      ],
      message: 'Please select a valid category'
    }
  },
  stock: {
    type: Number,
    required: [true, 'Please enter product stock'],
    max: [10000, 'Product stock cannot exceed 10000'],
    default: 0
  },
  ratings: {
    type: Number,
    default: 0
  },
  numOfReviews: {
    type: Number,
    default: 0
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create text index for search
productSchema.index({ name: 'text', description: 'text' });

// Virtual for getting the average rating
productSchema.virtual('averageRating').get(function() {
  if (this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, item) => item.rating + acc, 0);
  return sum / this.reviews.length;
});

// Update the ratings and numOfReviews when a review is added
productSchema.pre('save', function(next) {
  if (this.reviews && this.reviews.length > 0) {
    const sum = this.reviews.reduce((acc, item) => item.rating + acc, 0);
    this.ratings = sum / this.reviews.length;
    this.numOfReviews = this.reviews.length;
  }
  next();
});

// Cascade delete reviews when a product is deleted
productSchema.pre('remove', async function(next) {
  await this.model('Review').deleteMany({ product: this._id });
  next();
});

// Create and export the Product model
export default mongoose.model('Product', productSchema);
