import express from 'express';
import { body, validationResult } from 'express-validator';
import Service from '../models/Service.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/v1/services
// @desc    Get service requests
// @access  Private
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    // If not admin, only show user's services
    if (!req.user.isAdminUser()) {
      query.customer = req.user._id;
    }
    
    // Apply filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.serviceType) {
      query.serviceType = req.query.serviceType;
    }
    
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    
    if (req.query.vehicle) {
      query.vehicle = req.query.vehicle;
    }
    
    if (req.query.assignedTechnician) {
      query.assignedTechnician = req.query.assignedTechnician;
    }
    
    if (req.query.overdue === 'true') {
      query['scheduling.scheduledDate'] = { $lt: new Date() };
      query.status = { $nin: ['completed', 'cancelled'] };
    }
    
    const services = await Service.find(query)
      .populate('customer', 'name email phone')
      .populate('vehicle', 'make model year licensePlate')
      .populate('assignedTechnician', 'name email')
      .populate('branch', 'name address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Service.countDocuments(query);
    
    const servicesWithSummary = services.map(service => ({
      ...service.toObject(),
      summary: service.getSummary(),
      isOverdue: service.isOverdue()
    }));
    
    res.json({
      success: true,
      data: servicesWithSummary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving service requests',
      error: error.message
    });
  }
});

// @route   GET /api/v1/services/:id
// @desc    Get specific service request
// @access  Private
router.get('/:id', requireAuth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // If not admin, only show user's services
    if (!req.user.isAdminUser()) {
      query.customer = req.user._id;
    }
    
    const service = await Service.findOne(query)
      .populate('customer', 'name email phone')
      .populate('vehicle', 'make model year licensePlate color mileage')
      .populate('assignedTechnician', 'name email phone role')
      .populate('branch', 'name address contact')
      .populate('communication.updates.updatedBy', 'name role');
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        ...service.toObject(),
        summary: service.getSummary(),
        isOverdue: service.isOverdue(),
        duration: service.getServiceDuration()
      }
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving service request',
      error: error.message
    });
  }
});

// @route   POST /api/v1/services
// @desc    Create service request
// @access  Private
router.post('/', [
  requireAuth,
  body('vehicle').isMongoId().withMessage('Valid vehicle ID is required'),
  body('serviceType').isIn([
    'maintenance', 'repair', 'inspection', 'oil_change', 'tire_rotation',
    'brake_service', 'engine_diagnostic', 'transmission_service', 'battery_service',
    'air_conditioning', 'wheel_alignment', 'car_wash', 'detailing', 'emergency', 'other'
  ]).withMessage('Valid service type is required'),
  body('category').isIn([
    'routine_maintenance', 'preventive_maintenance', 'corrective_maintenance',
    'emergency_repair', 'cosmetic', 'diagnostic', 'inspection'
  ]).withMessage('Valid category is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('requestedDate').optional().isISO8601().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    // Verify vehicle ownership
    const vehicle = await Vehicle.findOne({
      _id: req.body.vehicle,
      owner: req.user._id
    });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or not owned by user'
      });
    }
    
    const serviceData = {
      ...req.body,
      customer: req.user._id,
      scheduling: {
        requestedDate: req.body.requestedDate ? new Date(req.body.requestedDate) : new Date(),
        timeSlot: req.body.timeSlot || 'flexible'
      }
    };
    
    const service = new Service(serviceData);
    await service.save();
    
    // Add to vehicle's service history
    vehicle.serviceHistory.push(service._id);
    await vehicle.save();
    
    // Populate the response
    await service.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'vehicle', select: 'make model year licensePlate' }
    ]);
    
    // Emit socket event for real-time updates
    const io = req.app.get('socketio');
    if (io) {
      io.to('admin-room').emit('new-service-request', {
        service: service.getSummary(),
        customer: service.customer,
        vehicle: service.vehicle
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: {
        ...service.toObject(),
        summary: service.getSummary()
      }
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service request',
      error: error.message
    });
  }
});

// @route   PUT /api/v1/services/:id/status
// @desc    Update service status
// @access  Private (Admin or assigned technician)
router.put('/:id/status', [
  requireAuth,
  body('status').isIn([
    'pending', 'approved', 'scheduled', 'in_progress', 'waiting_parts',
    'quality_check', 'completed', 'cancelled', 'rejected'
  ]).withMessage('Valid status is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const service = await Service.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('vehicle', 'make model licensePlate');
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    // Check permissions
    const canUpdate = req.user.isAdminUser() || 
                     (service.assignedTechnician && service.assignedTechnician.toString() === req.user._id.toString());
    
    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this service'
      });
    }
    
    const oldStatus = service.status;
    service.status = req.body.status;
    
    // Add status update to communication
    const statusMessage = `Status updated from ${oldStatus} to ${req.body.status}${req.body.notes ? ': ' + req.body.notes : ''}`;
    service.addStatusUpdate(statusMessage, req.user._id, true);
    
    // Handle status-specific logic
    if (req.body.status === 'in_progress' && !service.scheduling.actualStartTime) {
      service.scheduling.actualStartTime = new Date();
    }
    
    if (req.body.status === 'completed') {
      service.scheduling.actualEndTime = new Date();
      
      // Update vehicle's last service date
      const vehicle = await Vehicle.findById(service.vehicle);
      if (vehicle) {
        vehicle.maintenance.lastService = new Date();
        vehicle.calculateNextService();
        await vehicle.save();
      }
    }
    
    await service.save();
    
    // Emit socket event for real-time updates
    const io = req.app.get('socketio');
    if (io) {
      io.to(`user-${service.customer._id}`).emit('service-status-updated', {
        serviceId: service._id,
        status: service.status,
        message: statusMessage
      });
    }
    
    res.json({
      success: true,
      message: 'Service status updated successfully',
      data: {
        status: service.status,
        updates: service.communication.updates.slice(-1)[0]
      }
    });
  } catch (error) {
    console.error('Update service status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service status',
      error: error.message
    });
  }
});

// @route   PUT /api/v1/services/:id/assign
// @desc    Assign technician to service
// @access  Private (Admin only)
router.put('/:id/assign', [
  requireAdmin,
  body('technicianId').isMongoId().withMessage('Valid technician ID is required'),
  body('scheduledDate').optional().isISO8601().withMessage('Valid scheduled date is required'),
  body('estimatedDuration').optional().isInt({ min: 30 }).withMessage('Estimated duration must be at least 30 minutes')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    // Verify technician exists and has appropriate role
    const technician = await User.findOne({
      _id: req.body.technicianId,
      role: { $in: ['mechanic', 'admin', 'manager'] }
    });
    
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found or invalid role'
      });
    }
    
    service.assignedTechnician = req.body.technicianId;
    service.status = 'scheduled';
    
    if (req.body.scheduledDate) {
      service.scheduling.scheduledDate = new Date(req.body.scheduledDate);
    }
    
    if (req.body.estimatedDuration) {
      service.scheduling.estimatedDuration = req.body.estimatedDuration;
    }
    
    // Add assignment update
    service.addStatusUpdate(
      `Service assigned to ${technician.name}${req.body.scheduledDate ? ' for ' + new Date(req.body.scheduledDate).toLocaleDateString() : ''}`,
      req.user._id,
      true
    );
    
    await service.save();
    
    // Populate for response
    await service.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'assignedTechnician', select: 'name email phone' }
    ]);
    
    // Emit socket events
    const io = req.app.get('socketio');
    if (io) {
      // Notify customer
      io.to(`user-${service.customer._id}`).emit('service-assigned', {
        serviceId: service._id,
        technician: service.assignedTechnician,
        scheduledDate: service.scheduling.scheduledDate
      });
      
      // Notify technician
      io.to(`user-${service.assignedTechnician._id}`).emit('service-assigned-to-you', {
        service: service.getSummary(),
        customer: service.customer
      });
    }
    
    res.json({
      success: true,
      message: 'Technician assigned successfully',
      data: {
        assignedTechnician: service.assignedTechnician,
        scheduledDate: service.scheduling.scheduledDate,
        status: service.status
      }
    });
  } catch (error) {
    console.error('Assign technician error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning technician',
      error: error.message
    });
  }
});

// @route   POST /api/v1/services/:id/feedback
// @desc    Submit customer feedback for completed service
// @access  Private (Customer only)
router.post('/:id/feedback', [
  requireAuth,
  body('overall').isInt({ min: 1, max: 5 }).withMessage('Overall rating must be between 1 and 5'),
  body('serviceQuality').optional().isInt({ min: 1, max: 5 }),
  body('timeliness').optional().isInt({ min: 1, max: 5 }),
  body('communication').optional().isInt({ min: 1, max: 5 }),
  body('value').optional().isInt({ min: 1, max: 5 }),
  body('review').optional().trim(),
  body('recommendToOthers').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    const service = await Service.findOne({
      _id: req.params.id,
      customer: req.user._id,
      status: 'completed'
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Completed service not found'
      });
    }
    
    if (service.feedback.submittedAt) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already submitted for this service'
      });
    }
    
    service.feedback = {
      customerRating: {
        overall: req.body.overall,
        serviceQuality: req.body.serviceQuality || req.body.overall,
        timeliness: req.body.timeliness || req.body.overall,
        communication: req.body.communication || req.body.overall,
        value: req.body.value || req.body.overall
      },
      customerReview: req.body.review,
      recommendToOthers: req.body.recommendToOthers,
      submittedAt: new Date()
    };
    
    await service.save();
    
    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: service.feedback
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback',
      error: error.message
    });
  }
});

// @route   GET /api/v1/services/analytics/summary
// @desc    Get service analytics summary
// @access  Private (Admin only)
router.get('/analytics/summary', requireAdmin, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [
      totalServices,
      completedServices,
      pendingServices,
      overdueServices,
      avgRating,
      recentServices
    ] = await Promise.all([
      Service.countDocuments(),
      Service.countDocuments({ status: 'completed' }),
      Service.countDocuments({ status: { $in: ['pending', 'approved', 'scheduled'] } }),
      Service.countDocuments({
        'scheduling.scheduledDate': { $lt: new Date() },
        status: { $nin: ['completed', 'cancelled'] }
      }),
      Service.aggregate([
        { $match: { 'feedback.customerRating.overall': { $exists: true } } },
        { $group: { _id: null, avgRating: { $avg: '$feedback.customerRating.overall' } } }
      ]),
      Service.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    ]);
    
    // Service type distribution
    const serviceTypeStats = await Service.aggregate([
      { $group: { _id: '$serviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Monthly service trends
    const monthlyTrends = await Service.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalServices,
          completedServices,
          pendingServices,
          overdueServices,
          recentServices,
          avgRating: avgRating[0]?.avgRating || 0,
          completionRate: totalServices > 0 ? (completedServices / totalServices * 100).toFixed(1) : 0
        },
        serviceTypeStats,
        monthlyTrends: monthlyTrends.reverse()
      }
    });
  } catch (error) {
    console.error('Get service analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving service analytics',
      error: error.message
    });
  }
});

export default router;