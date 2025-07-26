import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  serviceNumber: {
    type: String,
    unique: true,
    default: function() {
      return `SRV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicle: {
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: String, required: true },
    licensePlate: { type: String, required: true },
    vin: String,
    mileage: Number
  },
  serviceType: {
    type: String,
    enum: [
      'brake_repair',
      'oil_change', 
      'engine_diagnostic',
      'routine_3000km',
      'tire_replacement',
      'transmission_service',
      'ac_repair',
      'battery_replacement',
      'suspension_repair',
      'electrical_repair',
      'vehicle_pickup',
      'emergency_service'
    ],
    required: true
  },
  serviceCategory: {
    type: String,
    enum: ['maintenance', 'repair', 'diagnostic', 'emergency', 'pickup'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  assignedTechnician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedTruck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Truck'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  schedule: {
    preferredDate: Date,
    scheduledDate: Date,
    startTime: Date,
    endTime: Date,
    estimatedDuration: { type: Number, default: 2 }, // hours
    actualDuration: Number
  },
  spareParts: [{
    name: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    partNumber: String,
    supplier: String
  }],
  labor: {
    hours: Number,
    rate: Number,
    total: Number
  },
  pricing: {
    partsTotal: { type: Number, default: 0 },
    laborTotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 }
  },
  progress: {
    currentStep: String,
    steps: [{
      name: String,
      description: String,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
      },
      startTime: Date,
      endTime: Date,
      notes: String
    }],
    completionPercentage: { type: Number, default: 0 }
  },
  quality: {
    inspection: {
      performed: { type: Boolean, default: false },
      inspector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: Date,
      notes: String,
      passed: Boolean
    },
    customerSatisfaction: {
      rating: Number, // 1-5
      feedback: String,
      date: Date
    }
  },
  communication: {
    customerNotifications: [{
      type: { type: String, enum: ['sms', 'email', 'push'] },
      message: String,
      sentAt: Date,
      status: String
    }],
    internalNotes: [{
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      note: String,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  warranty: {
    period: Number, // months
    startDate: Date,
    endDate: Date,
    terms: String
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringConfig: {
    interval: { type: String, enum: ['monthly', 'quarterly', 'annually'] },
    nextServiceDate: Date,
    reminderDays: { type: Number, default: 7 }
  }
}, {
  timestamps: true
});

// Indexes for better performance
serviceSchema.index({ customer: 1 });
serviceSchema.index({ serviceType: 1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ 'schedule.scheduledDate': 1 });
serviceSchema.index({ createdAt: -1 });

// Generate service number
serviceSchema.pre('save', async function(next) {
  if (!this.serviceNumber) {
    try {
      const count = await this.constructor.countDocuments();
      this.serviceNumber = `SRV-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating service number:', error);
      this.serviceNumber = `SRV-${Date.now()}`;
    }
  }
  next();
});

// Calculate totals
serviceSchema.methods.calculateTotals = function() {
  this.pricing.partsTotal = this.spareParts.reduce((total, part) => total + (part.totalPrice || 0), 0);
  this.pricing.laborTotal = this.labor.total || 0;
  this.pricing.grandTotal = this.pricing.partsTotal + this.pricing.laborTotal + this.pricing.taxAmount - this.pricing.discountAmount;
};

// Update progress percentage
serviceSchema.methods.updateProgress = function() {
  const completedSteps = this.progress.steps.filter(step => step.status === 'completed').length;
  const totalSteps = this.progress.steps.length;
  this.progress.completionPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
};

// Get service type details
serviceSchema.methods.getServiceTypeDetails = function() {
  const serviceTypes = {
    brake_repair: {
      name: 'Brake Repair',
      category: 'repair',
      estimatedDuration: 3,
      commonParts: ['Brake Pads', 'Brake Discs', 'Brake Fluid']
    },
    oil_change: {
      name: 'Oil Change',
      category: 'maintenance',
      estimatedDuration: 1,
      commonParts: ['Engine Oil', 'Oil Filter']
    },
    engine_diagnostic: {
      name: 'Engine Diagnostic',
      category: 'diagnostic',
      estimatedDuration: 2,
      commonParts: ['Spark Plugs', 'Engine Oil']
    },
    routine_3000km: {
      name: '3000km Routine Maintenance',
      category: 'maintenance',
      estimatedDuration: 4,
      commonParts: ['Engine Oil', 'Oil Filter', 'Air Filter', 'Fuel Filter']
    },
    tire_replacement: {
      name: 'Tire Replacement',
      category: 'maintenance',
      estimatedDuration: 2,
      commonParts: ['Tires', 'Wheel Weights']
    },
    transmission_service: {
      name: 'Transmission Service',
      category: 'maintenance',
      estimatedDuration: 3,
      commonParts: ['Transmission Fluid', 'Transmission Filter']
    },
    ac_repair: {
      name: 'AC Repair',
      category: 'repair',
      estimatedDuration: 2,
      commonParts: ['AC Refrigerant', 'AC Filter', 'AC Compressor']
    },
    vehicle_pickup: {
      name: 'Vehicle Pickup',
      category: 'pickup',
      estimatedDuration: 1,
      commonParts: []
    }
  };
  
  return serviceTypes[this.serviceType] || {};
};

const Service = mongoose.model('Service', serviceSchema);

export default Service;