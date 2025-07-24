import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  serviceNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  serviceType: {
    type: String,
    enum: [
      'maintenance',
      'repair',
      'inspection',
      'oil_change',
      'tire_rotation',
      'brake_service',
      'engine_diagnostic',
      'transmission_service',
      'battery_service',
      'air_conditioning',
      'wheel_alignment',
      'car_wash',
      'detailing',
      'emergency',
      'other'
    ],
    required: true
  },
  category: {
    type: String,
    enum: [
      'routine_maintenance',
      'preventive_maintenance',
      'corrective_maintenance',
      'emergency_repair',
      'cosmetic',
      'diagnostic',
      'inspection'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: [
      'pending',
      'approved',
      'scheduled',
      'in_progress',
      'waiting_parts',
      'quality_check',
      'completed',
      'cancelled',
      'rejected'
    ],
    default: 'pending'
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  symptoms: [{
    type: String,
    maxlength: 200
  }],
  images: [{
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  videos: [{
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  assignedTechnician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  scheduling: {
    requestedDate: Date,
    scheduledDate: Date,
    estimatedDuration: Number, // in minutes
    actualStartTime: Date,
    actualEndTime: Date,
    timeSlot: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'flexible']
    }
  },
  workDetails: {
    diagnosis: String,
    workPerformed: String,
    partsUsed: [{
      name: String,
      partNumber: String,
      quantity: Number,
      unitCost: Number,
      totalCost: Number,
      supplier: String
    }],
    laborHours: Number,
    laborCost: Number,
    additionalCharges: [{
      description: String,
      amount: Number
    }]
  },
  cost: {
    laborCost: {
      type: Number,
      default: 0
    },
    partsCost: {
      type: Number,
      default: 0
    },
    additionalCosts: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      default: 0
    }
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'mobile_money', 'stripe']
    },
    transactionId: String,
    paidAmount: {
      type: Number,
      default: 0
    },
    paidAt: Date
  },
  communication: {
    customerNotes: String,
    technicianNotes: String,
    internalNotes: String,
    updates: [{
      message: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isVisibleToCustomer: {
        type: Boolean,
        default: true
      }
    }]
  },
  quality: {
    preServiceInspection: {
      completed: {
        type: Boolean,
        default: false
      },
      checklist: [{
        item: String,
        status: {
          type: String,
          enum: ['good', 'fair', 'poor', 'needs_attention']
        },
        notes: String
      }],
      images: [String]
    },
    postServiceInspection: {
      completed: {
        type: Boolean,
        default: false
      },
      checklist: [{
        item: String,
        status: {
          type: String,
          enum: ['completed', 'verified', 'pending']
        },
        notes: String
      }],
      images: [String]
    }
  },
  feedback: {
    customerRating: {
      overall: {
        type: Number,
        min: 1,
        max: 5
      },
      serviceQuality: {
        type: Number,
        min: 1,
        max: 5
      },
      timeliness: {
        type: Number,
        min: 1,
        max: 5
      },
      communication: {
        type: Number,
        min: 1,
        max: 5
      },
      value: {
        type: Number,
        min: 1,
        max: 5
      }
    },
    customerReview: String,
    technicianRating: {
      type: Number,
      min: 1,
      max: 5
    },
    recommendToOthers: Boolean,
    submittedAt: Date
  },
  notifications: {
    remindersSent: [{
      type: {
        type: String,
        enum: ['appointment', 'completion', 'payment', 'follow_up']
      },
      sentAt: Date,
      method: {
        type: String,
        enum: ['email', 'sms', 'push', 'in_app']
      }
    }],
    followUpScheduled: Date,
    followUpCompleted: Date
  },
  warranty: {
    isWarrantyWork: {
      type: Boolean,
      default: false
    },
    warrantyPeriod: Number, // in days
    warrantyExpiryDate: Date,
    warrantyTerms: String
  },
  checkIn: {
    qrCodeUsed: Boolean,
    checkInTime: Date,
    vehicleCondition: String,
    mileageAtCheckIn: Number,
    fuelLevel: {
      type: String,
      enum: ['empty', 'quarter', 'half', 'three_quarters', 'full']
    },
    personalItems: [String]
  },
  checkOut: {
    checkOutTime: Date,
    vehicleCondition: String,
    mileageAtCheckOut: Number,
    workCompletionConfirmed: Boolean,
    customerSignature: String,
    deliveryMethod: {
      type: String,
      enum: ['pickup', 'delivery', 'tow']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate service number on creation
serviceSchema.pre('save', function(next) {
  if (this.isNew && !this.serviceNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    this.serviceNumber = `AC${year}${month}${day}${random}`;
  }
  next();
});

// Calculate total cost
serviceSchema.methods.calculateTotalCost = function() {
  this.cost.totalCost = this.cost.laborCost + this.cost.partsCost + this.cost.additionalCosts;
  this.cost.finalAmount = this.cost.totalCost + this.cost.tax;
  return this.cost.finalAmount;
};

// Add status update
serviceSchema.methods.addStatusUpdate = function(message, updatedBy, isVisibleToCustomer = true) {
  this.communication.updates.push({
    message,
    updatedBy,
    isVisibleToCustomer,
    timestamp: new Date()
  });
};

// Check if service is overdue
serviceSchema.methods.isOverdue = function() {
  if (this.scheduling.scheduledDate && this.status !== 'completed' && this.status !== 'cancelled') {
    return new Date() > this.scheduling.scheduledDate;
  }
  return false;
};

// Get service duration
serviceSchema.methods.getServiceDuration = function() {
  if (this.scheduling.actualStartTime && this.scheduling.actualEndTime) {
    return Math.floor((this.scheduling.actualEndTime - this.scheduling.actualStartTime) / (1000 * 60)); // in minutes
  }
  return null;
};

// Get service summary
serviceSchema.methods.getSummary = function() {
  return {
    id: this._id,
    serviceNumber: this.serviceNumber,
    serviceType: this.serviceType,
    status: this.status,
    priority: this.priority,
    scheduledDate: this.scheduling.scheduledDate,
    totalCost: this.cost.finalAmount,
    isOverdue: this.isOverdue()
  };
};

// Indexes for better performance
serviceSchema.index({ serviceNumber: 1 });
serviceSchema.index({ customer: 1 });
serviceSchema.index({ vehicle: 1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ serviceType: 1 });
serviceSchema.index({ 'scheduling.scheduledDate': 1 });
serviceSchema.index({ assignedTechnician: 1 });
serviceSchema.index({ branch: 1 });
serviceSchema.index({ createdAt: -1 });

const Service = mongoose.model('Service', serviceSchema);

export default Service;