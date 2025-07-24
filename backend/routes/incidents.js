import express from 'express';
import { body, validationResult } from 'express-validator';
import Incident from '../models/Incident.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/v1/incidents
// @desc    Get incidents
// @access  Private
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    // If not admin, only show user's incidents
    if (!req.user.isAdminUser()) {
      query.reporter = req.user._id;
    }
    
    // Apply filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.type) {
      query.type = req.query.type;
    }
    
    if (req.query.severity) {
      query.severity = req.query.severity;
    }
    
    if (req.query.vehicle) {
      query.vehicle = req.query.vehicle;
    }
    
    if (req.query.overdue === 'true') {
      query['followUp.nextReviewDate'] = { $lt: new Date() };
      query['followUp.completed'] = false;
    }
    
    const incidents = await Incident.find(query)
      .populate('reporter', 'name email phone')
      .populate('vehicle', 'make model year licensePlate')
      .populate('response.assignedInvestigator', 'name email')
      .sort({ 'dateTime.occurred': -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Incident.countDocuments(query);
    
    const incidentsWithSummary = incidents.map(incident => ({
      ...incident.toObject(),
      summary: incident.getSummary(),
      isOverdue: incident.isOverdueForReview(),
      needsEmergencyResponse: incident.needsEmergencyResponse()
    }));
    
    res.json({
      success: true,
      data: incidentsWithSummary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving incidents',
      error: error.message
    });
  }
});

// @route   GET /api/v1/incidents/:id
// @desc    Get specific incident
// @access  Private
router.get('/:id', requireAuth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // If not admin, only show user's incidents
    if (!req.user.isAdminUser()) {
      query.reporter = req.user._id;
    }
    
    const incident = await Incident.findOne(query)
      .populate('reporter', 'name email phone')
      .populate('vehicle', 'make model year licensePlate color')
      .populate('response.assignedInvestigator', 'name email phone role')
      .populate('followUp.responsiblePerson', 'name email')
      .populate('communication.updates.updatedBy', 'name role')
      .populate('resolution.resolvedBy', 'name role');
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        ...incident.toObject(),
        summary: incident.getSummary(),
        isOverdue: incident.isOverdueForReview(),
        needsEmergencyResponse: incident.needsEmergencyResponse(),
        totalDamages: incident.calculateTotalDamages()
      }
    });
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving incident',
      error: error.message
    });
  }
});

// @route   POST /api/v1/incidents
// @desc    Report new incident
// @access  Private
router.post('/', [
  requireAuth,
  body('vehicle').isMongoId().withMessage('Valid vehicle ID is required'),
  body('type').isIn([
    'accident', 'breakdown', 'theft', 'vandalism', 'mechanical_failure',
    'electrical_issue', 'tire_puncture', 'overheating', 'battery_dead',
    'fuel_issue', 'warning_light', 'strange_noise', 'performance_issue', 'other'
  ]).withMessage('Valid incident type is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('occurred').isISO8601().withMessage('Valid occurrence date is required'),
  body('severity').optional().isIn(['minor', 'moderate', 'major', 'critical']),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 })
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
    
    const incidentData = {
      ...req.body,
      reporter: req.user._id,
      dateTime: {
        occurred: new Date(req.body.occurred),
        reported: new Date()
      }
    };
    
    // Add location if provided
    if (req.body.latitude && req.body.longitude) {
      incidentData.location = {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        address: req.body.address || '',
        landmark: req.body.landmark || ''
      };
    }
    
    const incident = new Incident(incidentData);
    await incident.save();
    
    // Add to vehicle's incidents
    vehicle.incidents.push(incident._id);
    await vehicle.save();
    
    // Populate the response
    await incident.populate([
      { path: 'reporter', select: 'name email phone' },
      { path: 'vehicle', select: 'make model year licensePlate' }
    ]);
    
    // Emit socket event for real-time updates
    const io = req.app.get('socketio');
    if (io) {
      io.to('admin-room').emit('new-incident-reported', {
        incident: incident.getSummary(),
        reporter: incident.reporter,
        vehicle: incident.vehicle,
        needsEmergencyResponse: incident.needsEmergencyResponse()
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Incident reported successfully',
      data: {
        ...incident.toObject(),
        summary: incident.getSummary()
      }
    });
  } catch (error) {
    console.error('Report incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reporting incident',
      error: error.message
    });
  }
});

// @route   PUT /api/v1/incidents/:id/status
// @desc    Update incident status
// @access  Private (Admin or assigned investigator)
router.put('/:id/status', [
  requireAuth,
  body('status').isIn(['reported', 'investigating', 'in_progress', 'resolved', 'closed']).withMessage('Valid status is required'),
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
    
    const incident = await Incident.findById(req.params.id)
      .populate('reporter', 'name email phone');
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    // Check permissions
    const canUpdate = req.user.isAdminUser() || 
                     (incident.response.assignedInvestigator && 
                      incident.response.assignedInvestigator.toString() === req.user._id.toString());
    
    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this incident'
      });
    }
    
    const oldStatus = incident.status;
    incident.status = req.body.status;
    
    // Add status update to communication
    const statusMessage = `Status updated from ${oldStatus} to ${req.body.status}${req.body.notes ? ': ' + req.body.notes : ''}`;
    incident.addStatusUpdate(statusMessage, req.user._id, true);
    
    // Handle status-specific logic
    if (req.body.status === 'resolved' && !incident.resolution.resolvedAt) {
      incident.resolution.resolvedAt = new Date();
      incident.resolution.resolvedBy = req.user._id;
      incident.followUp.completed = true;
    }
    
    await incident.save();
    
    // Emit socket event for real-time updates
    const io = req.app.get('socketio');
    if (io) {
      io.to(`user-${incident.reporter._id}`).emit('incident-status-updated', {
        incidentId: incident._id,
        status: incident.status,
        message: statusMessage
      });
    }
    
    res.json({
      success: true,
      message: 'Incident status updated successfully',
      data: {
        status: incident.status,
        updates: incident.communication.updates.slice(-1)[0]
      }
    });
  } catch (error) {
    console.error('Update incident status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating incident status',
      error: error.message
    });
  }
});

// @route   PUT /api/v1/incidents/:id/assign
// @desc    Assign investigator to incident
// @access  Private (Admin only)
router.put('/:id/assign', [
  requireAdmin,
  body('investigatorId').isMongoId().withMessage('Valid investigator ID is required'),
  body('nextReviewDate').optional().isISO8601().withMessage('Valid review date is required')
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
    
    const incident = await Incident.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    // Verify investigator exists and has appropriate role
    const investigator = await User.findOne({
      _id: req.body.investigatorId,
      role: { $in: ['admin', 'manager', 'investigator'] }
    });
    
    if (!investigator) {
      return res.status(404).json({
        success: false,
        message: 'Investigator not found or invalid role'
      });
    }
    
    incident.response.assignedInvestigator = req.body.investigatorId;
    incident.status = 'investigating';
    
    if (req.body.nextReviewDate) {
      incident.followUp.nextReviewDate = new Date(req.body.nextReviewDate);
    }
    
    incident.followUp.responsiblePerson = req.body.investigatorId;
    
    // Add assignment update
    incident.addStatusUpdate(
      `Incident assigned to ${investigator.name} for investigation`,
      req.user._id,
      true
    );
    
    await incident.save();
    
    // Populate for response
    await incident.populate([
      { path: 'reporter', select: 'name email phone' },
      { path: 'response.assignedInvestigator', select: 'name email phone' }
    ]);
    
    // Emit socket events
    const io = req.app.get('socketio');
    if (io) {
      // Notify reporter
      io.to(`user-${incident.reporter._id}`).emit('incident-assigned', {
        incidentId: incident._id,
        investigator: incident.response.assignedInvestigator
      });
      
      // Notify investigator
      io.to(`user-${incident.response.assignedInvestigator._id}`).emit('incident-assigned-to-you', {
        incident: incident.getSummary(),
        reporter: incident.reporter
      });
    }
    
    res.json({
      success: true,
      message: 'Investigator assigned successfully',
      data: {
        assignedInvestigator: incident.response.assignedInvestigator,
        status: incident.status,
        nextReviewDate: incident.followUp.nextReviewDate
      }
    });
  } catch (error) {
    console.error('Assign investigator error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning investigator',
      error: error.message
    });
  }
});

// @route   PUT /api/v1/incidents/:id/damages
// @desc    Update incident damages assessment
// @access  Private (Admin or assigned investigator)
router.put('/:id/damages', [
  requireAuth,
  body('vehicleDamage.estimated').optional().isNumeric(),
  body('vehicleDamage.actual').optional().isNumeric(),
  body('vehicleDamage.description').optional().trim(),
  body('propertyDamage.estimated').optional().isNumeric(),
  body('propertyDamage.actual').optional().isNumeric(),
  body('personalInjury.medical_costs').optional().isNumeric()
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
    
    const incident = await Incident.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    // Check permissions
    const canUpdate = req.user.isAdminUser() || 
                     (incident.response.assignedInvestigator && 
                      incident.response.assignedInvestigator.toString() === req.user._id.toString());
    
    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this incident'
      });
    }
    
    // Update damages
    if (req.body.vehicleDamage) {
      incident.damages.vehicleDamage = {
        ...incident.damages.vehicleDamage.toObject(),
        ...req.body.vehicleDamage
      };
    }
    
    if (req.body.propertyDamage) {
      incident.damages.propertyDamage = {
        ...incident.damages.propertyDamage.toObject(),
        ...req.body.propertyDamage
      };
    }
    
    if (req.body.personalInjury) {
      incident.damages.personalInjury = {
        ...incident.damages.personalInjury.toObject(),
        ...req.body.personalInjury
      };
    }
    
    // Recalculate total damages
    const totalDamages = incident.calculateTotalDamages();
    
    // Add update to communication
    incident.addStatusUpdate(
      `Damages assessment updated. Total estimated cost: $${totalDamages}`,
      req.user._id,
      true
    );
    
    await incident.save();
    
    res.json({
      success: true,
      message: 'Damages assessment updated successfully',
      data: {
        damages: incident.damages,
        totalDamages
      }
    });
  } catch (error) {
    console.error('Update damages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating damages assessment',
      error: error.message
    });
  }
});

// @route   GET /api/v1/incidents/analytics/summary
// @desc    Get incidents analytics summary
// @access  Private (Admin only)
router.get('/analytics/summary', requireAdmin, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [
      totalIncidents,
      resolvedIncidents,
      pendingIncidents,
      overdueIncidents,
      recentIncidents,
      totalDamages
    ] = await Promise.all([
      Incident.countDocuments(),
      Incident.countDocuments({ status: 'resolved' }),
      Incident.countDocuments({ status: { $in: ['reported', 'investigating', 'in_progress'] } }),
      Incident.countDocuments({
        'followUp.nextReviewDate': { $lt: new Date() },
        'followUp.completed': false
      }),
      Incident.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Incident.aggregate([
        { $group: { _id: null, total: { $sum: '$damages.totalCost' } } }
      ])
    ]);
    
    // Incident type distribution
    const incidentTypeStats = await Incident.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Severity distribution
    const severityStats = await Incident.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Monthly incident trends
    const monthlyTrends = await Incident.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$dateTime.occurred' },
            month: { $month: '$dateTime.occurred' }
          },
          count: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalIncidents,
          resolvedIncidents,
          pendingIncidents,
          overdueIncidents,
          recentIncidents,
          totalDamages: totalDamages[0]?.total || 0,
          resolutionRate: totalIncidents > 0 ? (resolvedIncidents / totalIncidents * 100).toFixed(1) : 0
        },
        incidentTypeStats,
        severityStats,
        monthlyTrends: monthlyTrends.reverse()
      }
    });
  } catch (error) {
    console.error('Get incidents analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving incidents analytics',
      error: error.message
    });
  }
});

export default router;