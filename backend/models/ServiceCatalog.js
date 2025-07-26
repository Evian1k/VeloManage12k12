import mongoose from 'mongoose';

const serviceCatalogSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['maintenance', 'repair', 'inspection', 'emergency', 'diagnostic', 'cleaning', 'fuel', 'towing'],
    required: true
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'KES',
    enum: ['KES', 'USD', 'EUR', 'GBP']
  },
  duration: {
    estimated: {
      type: Number, // in minutes
      required: true
    },
    unit: {
      type: String,
      default: 'minutes',
      enum: ['minutes', 'hours', 'days']
    }
  },
  branchPricing: [{
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    specialOffers: [{
      name: String,
      discount: Number, // percentage
      validFrom: Date,
      validTo: Date,
      conditions: String
    }]
  }],
  requirements: [{
    name: String,
    description: String,
    isOptional: {
      type: Boolean,
      default: false
    }
  }],
  includedItems: [String],
  additionalServices: [{
    name: String,
    price: Number,
    description: String
  }],
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  popularity: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  availability: {
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    timeSlots: [{
      start: String, // HH:MM format
      end: String,   // HH:MM format
      maxBookings: Number
    }]
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
serviceCatalogSchema.index({ category: 1, isActive: 1 });
serviceCatalogSchema.index({ 'branchPricing.branch': 1 });
serviceCatalogSchema.index({ tags: 1 });
serviceCatalogSchema.index({ popularity: -1 });
serviceCatalogSchema.index({ 'rating.average': -1 });

// Get price for specific branch
serviceCatalogSchema.methods.getPriceForBranch = function(branchId) {
  const branchPricing = this.branchPricing.find(bp => 
    bp.branch.toString() === branchId.toString() && bp.isActive
  );
  return branchPricing ? branchPricing.price : this.basePrice;
};

// Get active special offers for branch
serviceCatalogSchema.methods.getActiveOffersForBranch = function(branchId) {
  const branchPricing = this.branchPricing.find(bp => 
    bp.branch.toString() === branchId.toString()
  );
  
  if (!branchPricing) return [];
  
  const now = new Date();
  return branchPricing.specialOffers.filter(offer => 
    (!offer.validFrom || offer.validFrom <= now) &&
    (!offer.validTo || offer.validTo >= now)
  );
};

// Calculate final price with offers
serviceCatalogSchema.methods.calculateFinalPrice = function(branchId, quantity = 1) {
  const basePrice = this.getPriceForBranch(branchId);
  const offers = this.getActiveOffersForBranch(branchId);
  
  let finalPrice = basePrice * quantity;
  
  // Apply best discount
  if (offers.length > 0) {
    const bestDiscount = Math.max(...offers.map(offer => offer.discount));
    finalPrice = finalPrice * (1 - bestDiscount / 100);
  }
  
  return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
};

// Static method to get services by branch
serviceCatalogSchema.statics.getServicesByBranch = function(branchId) {
  return this.find({
    isActive: true,
    $or: [
      { 'branchPricing.branch': branchId, 'branchPricing.isActive': true },
      { branchPricing: { $size: 0 } } // Services without branch-specific pricing
    ]
  }).sort({ popularity: -1, 'rating.average': -1 });
};

// Update rating
serviceCatalogSchema.methods.updateRating = function(newRating) {
  const totalRating = this.rating.average * this.rating.count + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

const ServiceCatalog = mongoose.model('ServiceCatalog', serviceCatalogSchema);

export default ServiceCatalog;