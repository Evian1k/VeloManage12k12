import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  vin: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  engineType: {
    type: String,
    enum: ['petrol', 'diesel', 'hybrid', 'electric', 'other'],
    default: 'petrol'
  },
  transmission: {
    type: String,
    enum: ['manual', 'automatic', 'cvt'],
    default: 'manual'
  },
  mileage: {
    current: {
      type: Number,
      default: 0,
      min: 0
    },
    unit: {
      type: String,
      enum: ['km', 'miles'],
      default: 'km'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  maintenance: {
    lastService: {
      type: Date
    },
    nextService: {
      type: Date
    },
    serviceInterval: {
      type: Number,
      default: 3000 // Default 3000km
    },
    lastOilChange: {
      type: Date
    },
    nextOilChange: {
      type: Date
    },
    lastInspection: {
      type: Date
    },
    nextInspection: {
      type: Date
    },
    tireRotation: {
      last: Date,
      next: Date,
      interval: {
        type: Number,
        default: 10000 // Default 10000km
      }
    }
  },
  insurance: {
    provider: String,
    policyNumber: String,
    expiryDate: Date,
    coverageType: {
      type: String,
      enum: ['comprehensive', 'third_party', 'collision', 'other']
    }
  },
  registration: {
    registrationNumber: String,
    expiryDate: Date,
    registeredState: String
  },
  images: [{
    url: String,
    type: {
      type: String,
      enum: ['exterior', 'interior', 'engine', 'damage', 'other'],
      default: 'exterior'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  documents: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['registration', 'insurance', 'inspection', 'other']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'in_service', 'maintenance', 'inactive', 'sold'],
    default: 'active'
  },
  location: {
    current: {
      latitude: Number,
      longitude: Number,
      address: String,
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    },
    preferred_service_center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    }
  },
  serviceHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  incidents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident'
  }],
  qrCode: {
    code: String,
    generatedAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  notifications: {
    maintenanceReminders: {
      type: Boolean,
      default: true
    },
    insuranceReminders: {
      type: Boolean,
      default: true
    },
    registrationReminders: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate QR code on creation
vehicleSchema.pre('save', function(next) {
  if (this.isNew && !this.qrCode.code) {
    this.qrCode.code = `AC-${this.licensePlate}-${Date.now()}`;
    this.qrCode.generatedAt = new Date();
  }
  next();
});

// Calculate next service date based on mileage and time
vehicleSchema.methods.calculateNextService = function() {
  if (this.maintenance.lastService && this.maintenance.serviceInterval) {
    const nextServiceByMileage = this.mileage.current + this.maintenance.serviceInterval;
    const nextServiceByTime = new Date(this.maintenance.lastService);
    nextServiceByTime.setMonth(nextServiceByTime.getMonth() + 6); // 6 months default
    
    this.maintenance.nextService = nextServiceByTime;
    return this.maintenance.nextService;
  }
  return null;
};

// Check if maintenance is due
vehicleSchema.methods.isMaintenanceDue = function() {
  const now = new Date();
  const mileageDue = this.mileage.current >= (this.maintenance.lastService?.mileage || 0) + this.maintenance.serviceInterval;
  const timeDue = this.maintenance.nextService && this.maintenance.nextService <= now;
  
  return mileageDue || timeDue;
};

// Get vehicle summary
vehicleSchema.methods.getSummary = function() {
  return {
    id: this._id,
    displayName: `${this.year} ${this.make} ${this.model}`,
    licensePlate: this.licensePlate,
    status: this.status,
    mileage: this.mileage.current,
    isMaintenanceDue: this.isMaintenanceDue(),
    nextService: this.maintenance.nextService,
    qrCode: this.qrCode.code
  };
};

// Indexes for better performance
vehicleSchema.index({ owner: 1 });
vehicleSchema.index({ licensePlate: 1 });
vehicleSchema.index({ vin: 1 });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ 'maintenance.nextService': 1 });
vehicleSchema.index({ createdAt: -1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;