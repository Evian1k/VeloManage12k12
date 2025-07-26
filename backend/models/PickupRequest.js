import mongoose from 'mongoose';

const pickupRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userPhone: {
    type: String,
    required: true
  },
  vehicleDetails: {
    type: String,
    required: true
  },
  pickupLocation: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    address: {
      type: String,
      required: true,
      trim: true
    }
  },
  destination: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  serviceType: {
    type: String,
    enum: ['vehicle_pickup', 'emergency_pickup', 'scheduled_pickup', 'delivery'],
    default: 'vehicle_pickup'
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'dispatched', 'en-route', 'arrived', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  assignedTruck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Truck'
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  requestTime: {
    type: Date,
    default: Date.now
  },
  scheduledTime: Date,
  dispatchTime: Date,
  arrivalTime: Date,
  completionTime: Date,
  estimatedArrival: Date,
  estimatedDuration: Number, // in minutes
  distance: Number, // in kilometers
  notes: String,
  instructions: String,
  cost: {
    baseFare: { type: Number, default: 0 },
    distanceFee: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  customerRating: {
    score: { type: Number, min: 1, max: 5 },
    feedback: String,
    ratedAt: Date
  },
  driverRating: {
    score: { type: Number, min: 1, max: 5 },
    feedback: String,
    ratedAt: Date
  },
  history: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
pickupRequestSchema.index({ userId: 1 });
pickupRequestSchema.index({ status: 1 });
pickupRequestSchema.index({ assignedTruck: 1 });
pickupRequestSchema.index({ branch: 1 });
pickupRequestSchema.index({ requestTime: -1 });
pickupRequestSchema.index({ 'pickupLocation.latitude': 1, 'pickupLocation.longitude': 1 });

// Methods
pickupRequestSchema.methods.updateStatus = function(newStatus, updatedBy, notes = '') {
  this.status = newStatus;
  this.history.push({
    status: newStatus,
    updatedBy,
    notes
  });
  
  // Set timestamps based on status
  switch (newStatus) {
    case 'dispatched':
      this.dispatchTime = new Date();
      break;
    case 'arrived':
      this.arrivalTime = new Date();
      break;
    case 'completed':
      this.completionTime = new Date();
      break;
  }
  
  return this.save();
};

pickupRequestSchema.methods.calculateCost = function() {
  const baseFare = 500; // Base fare in KES
  const ratePerKm = 50; // Rate per kilometer
  const serviceFee = 100; // Service fee
  
  this.cost.baseFare = baseFare;
  this.cost.distanceFee = this.distance ? this.distance * ratePerKm : 0;
  this.cost.serviceFee = serviceFee;
  this.cost.totalCost = this.cost.baseFare + this.cost.distanceFee + this.cost.serviceFee;
  
  return this.cost.totalCost;
};

pickupRequestSchema.methods.assignTruck = function(truckId, driverId) {
  this.assignedTruck = truckId;
  this.assignedDriver = driverId;
  this.status = 'assigned';
  
  this.history.push({
    status: 'assigned',
    notes: `Truck assigned: ${truckId}`
  });
  
  return this.save();
};

// Static methods
pickupRequestSchema.statics.getActiveRequests = function() {
  return this.find({ 
    status: { $in: ['pending', 'assigned', 'dispatched', 'en-route'] },
    isActive: true 
  }).populate('assignedTruck assignedDriver branch userId', 'name phone truckId');
};

pickupRequestSchema.statics.getPendingRequests = function() {
  return this.find({ 
    status: 'pending',
    isActive: true 
  }).sort({ requestTime: 1 });
};

const PickupRequest = mongoose.model('PickupRequest', pickupRequestSchema);

export default PickupRequest;