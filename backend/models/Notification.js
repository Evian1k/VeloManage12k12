import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'service_created',
      'service_updated',
      'service_assigned',
      'service_completed',
      'pickup_scheduled',
      'pickup_arrived',
      'payment_received',
      'system_alert',
      'maintenance_reminder',
      'promotional',
      'emergency'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  channels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    }
  },
  data: {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    pickupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PickupRequest'
    },
    truckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Truck'
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    url: String,
    actionRequired: Boolean,
    expiryDate: Date
  },
  deliveryStatus: {
    inApp: {
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    },
    email: {
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    },
    sms: {
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    },
    push: {
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    }
  },
  readAt: Date,
  archivedAt: Date
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ 'data.serviceId': 1 });

// Methods
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.archive = function() {
  this.status = 'archived';
  this.archivedAt = new Date();
  return this.save();
};

notificationSchema.methods.markDelivered = function(channel) {
  if (this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].delivered = true;
    this.deliveryStatus[channel].deliveredAt = new Date();
    return this.save();
  }
};

// Static methods
notificationSchema.statics.createServiceNotification = async function(serviceId, type, recipientId, title, message, data = {}) {
  return this.create({
    recipient: recipientId,
    title,
    message,
    type,
    priority: type === 'emergency' ? 'urgent' : 'normal',
    data: {
      serviceId,
      ...data
    },
    channels: {
      inApp: true,
      email: ['service_created', 'service_completed'].includes(type),
      sms: type === 'emergency',
      push: true
    }
  });
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ recipient: userId, status: 'unread' });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;