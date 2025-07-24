import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  incidentNumber: {
    type: String,
    unique: true,
    required: true
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  type: {
    type: String,
    enum: [
      'accident',
      'breakdown',
      'theft',
      'vandalism',
      'mechanical_failure',
      'electrical_issue',
      'tire_puncture',
      'overheating',
      'battery_dead',
      'fuel_issue',
      'warning_light',
      'strange_noise',
      'performance_issue',
      'other'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'major', 'critical'],
    default: 'moderate'
  },
  status: {
    type: String,
    enum: ['reported', 'investigating', 'in_progress', 'resolved', 'closed'],
    default: 'reported'
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    landmark: String
  },
  dateTime: {
    occurred: {
      type: Date,
      required: true
    },
    reported: {
      type: Date,
      default: Date.now
    }
  },
  weather: {
    conditions: {
      type: String,
      enum: ['clear', 'cloudy', 'rainy', 'foggy', 'snowy', 'windy', 'unknown']
    },
    temperature: String,
    visibility: String
  },
  images: [{
    url: String,
    description: String,
    type: {
      type: String,
      enum: ['damage', 'location', 'evidence', 'other']
    },
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
  witnesses: [{
    name: String,
    phone: String,
    email: String,
    statement: String
  }],
  policeReport: {
    reportNumber: String,
    officerName: String,
    stationName: String,
    reportDate: Date,
    reportCopy: String // URL to uploaded document
  },
  insurance: {
    claimNumber: String,
    provider: String,
    agentName: String,
    agentPhone: String,
    claimStatus: {
      type: String,
      enum: ['pending', 'approved', 'denied', 'processing', 'closed']
    },
    claimAmount: Number,
    deductible: Number
  },
  involvedParties: [{
    type: {
      type: String,
      enum: ['driver', 'passenger', 'third_party', 'pedestrian', 'property_owner']
    },
    name: String,
    phone: String,
    email: String,
    insuranceProvider: String,
    policyNumber: String,
    vehicleDetails: {
      make: String,
      model: String,
      year: Number,
      licensePlate: String,
      color: String
    },
    driverLicense: String,
    injuries: {
      type: String,
      enum: ['none', 'minor', 'moderate', 'serious', 'critical']
    },
    medicalAttention: Boolean
  }],
  damages: {
    vehicleDamage: {
      estimated: Number,
      actual: Number,
      description: String,
      repairable: Boolean
    },
    propertyDamage: {
      estimated: Number,
      actual: Number,
      description: String
    },
    personalInjury: {
      medical_costs: Number,
      description: String
    },
    totalCost: Number
  },
  response: {
    emergencyServices: {
      police: Boolean,
      ambulance: Boolean,
      fireService: Boolean,
      towing: Boolean
    },
    towingService: {
      company: String,
      driverName: String,
      phone: String,
      cost: Number,
      destination: String
    },
    assignedInvestigator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    investigationNotes: String,
    actionsTaken: [String]
  },
  followUp: {
    requiredActions: [String],
    nextReviewDate: Date,
    responsiblePerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completed: {
      type: Boolean,
      default: false
    }
  },
  communication: {
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
      isVisibleToReporter: {
        type: Boolean,
        default: true
      }
    }],
    notifications: [{
      type: {
        type: String,
        enum: ['status_update', 'investigation_update', 'insurance_update', 'resolution']
      },
      sentAt: Date,
      method: {
        type: String,
        enum: ['email', 'sms', 'push', 'in_app']
      },
      recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },
  resolution: {
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolution: String,
    finalCost: Number,
    customerSatisfaction: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      feedback: String
    },
    lessonsLearned: String,
    preventiveMeasures: String
  },
  relatedServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate incident number on creation
incidentSchema.pre('save', function(next) {
  if (this.isNew && !this.incidentNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    this.incidentNumber = `INC${year}${month}${day}${random}`;
  }
  next();
});

// Add status update
incidentSchema.methods.addStatusUpdate = function(message, updatedBy, isVisibleToReporter = true) {
  this.communication.updates.push({
    message,
    updatedBy,
    isVisibleToReporter,
    timestamp: new Date()
  });
};

// Calculate total damages
incidentSchema.methods.calculateTotalDamages = function() {
  const vehicleDamage = this.damages.vehicleDamage.actual || this.damages.vehicleDamage.estimated || 0;
  const propertyDamage = this.damages.propertyDamage.actual || this.damages.propertyDamage.estimated || 0;
  const medicalCosts = this.damages.personalInjury.medical_costs || 0;
  
  this.damages.totalCost = vehicleDamage + propertyDamage + medicalCosts;
  return this.damages.totalCost;
};

// Check if incident is overdue for review
incidentSchema.methods.isOverdueForReview = function() {
  if (this.followUp.nextReviewDate && !this.followUp.completed) {
    return new Date() > this.followUp.nextReviewDate;
  }
  return false;
};

// Get incident summary
incidentSchema.methods.getSummary = function() {
  return {
    id: this._id,
    incidentNumber: this.incidentNumber,
    type: this.type,
    severity: this.severity,
    status: this.status,
    title: this.title,
    occurredAt: this.dateTime.occurred,
    totalCost: this.damages.totalCost,
    isOverdue: this.isOverdueForReview()
  };
};

// Check if emergency response is needed
incidentSchema.methods.needsEmergencyResponse = function() {
  return this.severity === 'critical' || 
         this.type === 'accident' || 
         this.involvedParties.some(party => party.injuries && party.injuries !== 'none');
};

// Indexes for better performance
incidentSchema.index({ incidentNumber: 1 });
incidentSchema.index({ reporter: 1 });
incidentSchema.index({ vehicle: 1 });
incidentSchema.index({ type: 1 });
incidentSchema.index({ severity: 1 });
incidentSchema.index({ status: 1 });
incidentSchema.index({ 'dateTime.occurred': -1 });
incidentSchema.index({ 'followUp.nextReviewDate': 1 });
incidentSchema.index({ createdAt: -1 });

const Incident = mongoose.model('Incident', incidentSchema);

export default Incident;