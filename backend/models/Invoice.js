import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  type: {
    type: String,
    enum: ['service', 'parts', 'labor', 'emergency', 'maintenance', 'inspection', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft'
  },
  billingDetails: {
    billTo: {
      name: String,
      email: String,
      phone: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
      },
      company: String,
      taxId: String
    },
    billFrom: {
      name: String,
      email: String,
      phone: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
      },
      company: String,
      taxId: String,
      logo: String
    }
  },
  lineItems: [{
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['labor', 'parts', 'materials', 'diagnostics', 'inspection', 'other']
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    taxable: {
      type: Boolean,
      default: true
    },
    partNumber: String,
    laborHours: Number,
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  costs: {
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'none'],
      default: 'none'
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    additionalCharges: [{
      description: String,
      amount: Number
    }],
    additionalChargesTotal: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      default: 0
    }
  },
  dates: {
    issued: {
      type: Date,
      default: Date.now
    },
    due: {
      type: Date,
      required: true
    },
    sent: Date,
    viewed: Date,
    paid: Date,
    cancelled: Date
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'mobile_money', 'stripe', 'paypal', 'other']
    },
    transactions: [{
      transactionId: String,
      amount: Number,
      method: String,
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded']
      },
      processedAt: Date,
      reference: String,
      gateway: String,
      fees: Number
    }],
    totalPaid: {
      type: Number,
      default: 0
    },
    remainingBalance: {
      type: Number,
      default: 0
    },
    paymentTerms: {
      type: String,
      enum: ['immediate', 'net_15', 'net_30', 'net_45', 'net_60', 'custom'],
      default: 'net_30'
    },
    customTerms: String
  },
  reminders: {
    sent: [{
      type: {
        type: String,
        enum: ['due_soon', 'overdue', 'second_notice', 'final_notice']
      },
      sentAt: Date,
      method: {
        type: String,
        enum: ['email', 'sms', 'phone', 'mail']
      },
      recipient: String
    }],
    nextReminderDate: Date,
    reminderCount: {
      type: Number,
      default: 0
    }
  },
  notes: {
    internal: String,
    customer: String,
    terms: String,
    footer: String
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  audit: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifications: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      modifiedAt: {
        type: Date,
        default: Date.now
      },
      modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: String
    }]
  },
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly']
    },
    nextInvoiceDate: Date,
    endDate: Date,
    totalOccurrences: Number,
    currentOccurrence: {
      type: Number,
      default: 1
    }
  },
  pdf: {
    generated: {
      type: Boolean,
      default: false
    },
    url: String,
    generatedAt: Date,
    template: {
      type: String,
      enum: ['standard', 'detailed', 'minimal', 'custom'],
      default: 'standard'
    }
  },
  communication: {
    emailsSent: [{
      to: String,
      subject: String,
      sentAt: Date,
      opened: Boolean,
      openedAt: Date
    }],
    customerViews: [{
      viewedAt: Date,
      ipAddress: String,
      userAgent: String
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate invoice number on creation
invoiceSchema.pre('save', function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    this.invoiceNumber = `INV${year}${month}${day}${random}`;
  }
  next();
});

// Calculate totals before saving
invoiceSchema.pre('save', function(next) {
  // Calculate subtotal
  this.costs.subtotal = this.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // Calculate discount
  if (this.costs.discountType === 'percentage') {
    this.costs.discountAmount = (this.costs.subtotal * this.costs.discountValue) / 100;
  } else if (this.costs.discountType === 'fixed') {
    this.costs.discountAmount = this.costs.discountValue;
  } else {
    this.costs.discountAmount = 0;
  }
  
  // Calculate additional charges total
  this.costs.additionalChargesTotal = this.costs.additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
  
  // Calculate tax on subtotal minus discount plus additional charges
  const taxableAmount = this.costs.subtotal - this.costs.discountAmount + this.costs.additionalChargesTotal;
  this.costs.taxAmount = (taxableAmount * this.costs.taxRate) / 100;
  
  // Calculate total
  this.costs.total = this.costs.subtotal - this.costs.discountAmount + this.costs.additionalChargesTotal + this.costs.taxAmount;
  
  // Calculate remaining balance
  this.payment.remainingBalance = Math.max(0, this.costs.total - this.payment.totalPaid);
  
  next();
});

// Add payment transaction
invoiceSchema.methods.addPayment = function(transactionData) {
  this.payment.transactions.push(transactionData);
  this.payment.totalPaid = this.payment.transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  
  this.payment.remainingBalance = Math.max(0, this.costs.total - this.payment.totalPaid);
  
  // Update payment status
  if (this.payment.remainingBalance === 0) {
    this.payment.status = 'completed';
    this.status = 'paid';
    this.dates.paid = new Date();
  } else if (this.payment.totalPaid > 0) {
    this.payment.status = 'partial';
    this.status = 'partial';
  }
};

// Check if invoice is overdue
invoiceSchema.methods.isOverdue = function() {
  return this.status !== 'paid' && 
         this.status !== 'cancelled' && 
         this.status !== 'refunded' && 
         new Date() > this.dates.due;
};

// Get days overdue
invoiceSchema.methods.getDaysOverdue = function() {
  if (!this.isOverdue()) return 0;
  
  const today = new Date();
  const dueDate = new Date(this.dates.due);
  return Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
};

// Add reminder
invoiceSchema.methods.addReminder = function(type, method, recipient) {
  this.reminders.sent.push({
    type,
    method,
    recipient,
    sentAt: new Date()
  });
  this.reminders.reminderCount += 1;
  
  // Set next reminder date based on type
  const nextDate = new Date();
  switch (type) {
    case 'due_soon':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'overdue':
      nextDate.setDate(nextDate.getDate() + 3);
      break;
    case 'second_notice':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'final_notice':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
  }
  
  if (this.reminders.reminderCount < 4) {
    this.reminders.nextReminderDate = nextDate;
  }
};

// Get invoice summary
invoiceSchema.methods.getSummary = function() {
  return {
    id: this._id,
    invoiceNumber: this.invoiceNumber,
    customerName: this.billingDetails.billTo.name,
    total: this.costs.total,
    status: this.status,
    dueDate: this.dates.due,
    isOverdue: this.isOverdue(),
    daysOverdue: this.getDaysOverdue(),
    remainingBalance: this.payment.remainingBalance
  };
};

// Generate PDF
invoiceSchema.methods.generatePDF = async function() {
  // This would integrate with a PDF generation service
  this.pdf.generated = true;
  this.pdf.generatedAt = new Date();
  // Implementation would depend on chosen PDF library
};

// Indexes for better performance
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ service: 1 });
invoiceSchema.index({ vehicle: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ 'dates.due': 1 });
invoiceSchema.index({ 'dates.issued': -1 });
invoiceSchema.index({ 'payment.status': 1 });
invoiceSchema.index({ createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;