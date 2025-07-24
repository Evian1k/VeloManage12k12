import express from 'express';
import { body, validationResult } from 'express-validator';
import Vehicle from '../models/Vehicle.js';
import Service from '../models/Service.js';
import Incident from '../models/Incident.js';
import User from '../models/User.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/v1/vehicles
// @desc    Get all vehicles for the authenticated user or all vehicles for admin
// @access  Private
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    // If not admin, only show user's vehicles
    if (!req.user.isAdminUser()) {
      query.owner = req.user._id;
    }
    
    // Apply filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.make) {
      query.make = new RegExp(req.query.make, 'i');
    }
    
    if (req.query.model) {
      query.model = new RegExp(req.query.model, 'i');
    }
    
    if (req.query.year) {
      query.year = req.query.year;
    }
    
    if (req.query.maintenanceDue === 'true') {
      query['maintenance.nextService'] = { $lte: new Date() };
    }
    
    const vehicles = await Vehicle.find(query)
      .populate('owner', 'name email phone')
      .populate('location.preferred_service_center', 'name address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Vehicle.countDocuments(query);
    
    const vehiclesWithSummary = vehicles.map(vehicle => ({
      ...vehicle.toObject(),
      summary: vehicle.getSummary(),
      isMaintenanceDue: vehicle.isMaintenanceDue()
    }));
    
    res.json({
      success: true,
      data: vehiclesWithSummary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving vehicles',
      error: error.message
    });
  }
});

// @route   GET /api/v1/vehicles/:id
// @desc    Get specific vehicle
// @access  Private
router.get('/:id', requireAuth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // If not admin, only show user's vehicles
    if (!req.user.isAdminUser()) {
      query.owner = req.user._id;
    }
    
    const vehicle = await Vehicle.findOne(query)
      .populate('owner', 'name email phone')
      .populate('location.preferred_service_center', 'name address contact')
      .populate({
        path: 'serviceHistory',
        populate: {
          path: 'assignedTechnician',
          select: 'name email'
        },
        options: { sort: { createdAt: -1 }, limit: 10 }
      })
      .populate({
        path: 'incidents',
        options: { sort: { createdAt: -1 }, limit: 5 }
      });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        ...vehicle.toObject(),
        summary: vehicle.getSummary(),
        isMaintenanceDue: vehicle.isMaintenanceDue()
      }
    });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving vehicle',
      error: error.message
    });
  }
});

// @route   POST /api/v1/vehicles
// @desc    Add new vehicle
// @access  Private
router.post('/', [
  requireAuth,
  body('make').notEmpty().withMessage('Make is required'),
  body('model').notEmpty().withMessage('Model is required'),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Valid year is required'),
  body('licensePlate').notEmpty().withMessage('License plate is required'),
  body('color').optional().trim(),
  body('engineType').optional().isIn(['petrol', 'diesel', 'hybrid', 'electric', 'other']),
  body('transmission').optional().isIn(['manual', 'automatic', 'cvt'])
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
    
    const vehicleData = {
      ...req.body,
      owner: req.user._id,
      licensePlate: req.body.licensePlate.toUpperCase()
    };
    
    // Check if license plate already exists
    const existingVehicle = await Vehicle.findOne({ 
      licensePlate: vehicleData.licensePlate 
    });
    
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle with this license plate already exists'
      });
    }
    
    const vehicle = new Vehicle(vehicleData);
    await vehicle.save();
    
    // Update user's vehicle count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { vehicleCount: 1 }
    });
    
    await vehicle.populate('owner', 'name email phone');
    
    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: {
        ...vehicle.toObject(),
        summary: vehicle.getSummary()
      }
    });
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding vehicle',
      error: error.message
    });
  }
});

// @route   PUT /api/v1/vehicles/:id
// @desc    Update vehicle
// @access  Private
router.put('/:id', [
  requireAuth,
  body('make').optional().notEmpty(),
  body('model').optional().notEmpty(),
  body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('licensePlate').optional().notEmpty(),
  body('color').optional().trim(),
  body('engineType').optional().isIn(['petrol', 'diesel', 'hybrid', 'electric', 'other']),
  body('transmission').optional().isIn(['manual', 'automatic', 'cvt'])
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
    
    let query = { _id: req.params.id };
    
    // If not admin, only allow updating user's vehicles
    if (!req.user.isAdminUser()) {
      query.owner = req.user._id;
    }
    
    const updateData = { ...req.body };
    if (updateData.licensePlate) {
      updateData.licensePlate = updateData.licensePlate.toUpperCase();
      
      // Check if new license plate already exists (excluding current vehicle)
      const existingVehicle = await Vehicle.findOne({ 
        licensePlate: updateData.licensePlate,
        _id: { $ne: req.params.id }
      });
      
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle with this license plate already exists'
        });
      }
    }
    
    const vehicle = await Vehicle.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).populate('owner', 'name email phone');
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or unauthorized'
      });
    }
    
    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: {
        ...vehicle.toObject(),
        summary: vehicle.getSummary()
      }
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vehicle',
      error: error.message
    });
  }
});

// @route   PUT /api/v1/vehicles/:id/mileage
// @desc    Update vehicle mileage
// @access  Private
router.put('/:id/mileage', [
  requireAuth,
  body('mileage').isNumeric().withMessage('Valid mileage is required')
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
    
    let query = { _id: req.params.id };
    
    if (!req.user.isAdminUser()) {
      query.owner = req.user._id;
    }
    
    const vehicle = await Vehicle.findOne(query);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or unauthorized'
      });
    }
    
    vehicle.mileage.current = req.body.mileage;
    vehicle.mileage.lastUpdated = new Date();
    
    // Recalculate next service if needed
    if (vehicle.maintenance.serviceInterval) {
      vehicle.calculateNextService();
    }
    
    await vehicle.save();
    
    res.json({
      success: true,
      message: 'Mileage updated successfully',
      data: {
        mileage: vehicle.mileage,
        nextService: vehicle.maintenance.nextService,
        isMaintenanceDue: vehicle.isMaintenanceDue()
      }
    });
  } catch (error) {
    console.error('Update mileage error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating mileage',
      error: error.message
    });
  }
});

// @route   PUT /api/v1/vehicles/:id/location
// @desc    Update vehicle location
// @access  Private
router.put('/:id/location', [
  requireAuth,
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('address').optional().trim()
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
    
    let query = { _id: req.params.id };
    
    if (!req.user.isAdminUser()) {
      query.owner = req.user._id;
    }
    
    const vehicle = await Vehicle.findOne(query);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or unauthorized'
      });
    }
    
    vehicle.location.current = {
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      address: req.body.address || '',
      lastUpdated: new Date()
    };
    
    await vehicle.save();
    
    res.json({
      success: true,
      message: 'Location updated successfully',
      data: vehicle.location.current
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
});

// @route   GET /api/v1/vehicles/:id/maintenance-schedule
// @desc    Get vehicle maintenance schedule
// @access  Private
router.get('/:id/maintenance-schedule', requireAuth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    if (!req.user.isAdminUser()) {
      query.owner = req.user._id;
    }
    
    const vehicle = await Vehicle.findOne(query);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or unauthorized'
      });
    }
    
    const schedule = {
      nextService: vehicle.maintenance.nextService,
      nextOilChange: vehicle.maintenance.nextOilChange,
      nextInspection: vehicle.maintenance.nextInspection,
      nextTireRotation: vehicle.maintenance.tireRotation.next,
      isMaintenanceDue: vehicle.isMaintenanceDue(),
      serviceInterval: vehicle.maintenance.serviceInterval,
      currentMileage: vehicle.mileage.current
    };
    
    // Calculate upcoming maintenance items
    const upcomingItems = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    if (schedule.nextService && schedule.nextService <= thirtyDaysFromNow) {
      upcomingItems.push({
        type: 'service',
        date: schedule.nextService,
        description: 'Regular maintenance service',
        priority: schedule.nextService <= now ? 'overdue' : 'due_soon'
      });
    }
    
    if (schedule.nextOilChange && schedule.nextOilChange <= thirtyDaysFromNow) {
      upcomingItems.push({
        type: 'oil_change',
        date: schedule.nextOilChange,
        description: 'Oil change required',
        priority: schedule.nextOilChange <= now ? 'overdue' : 'due_soon'
      });
    }
    
    if (schedule.nextInspection && schedule.nextInspection <= thirtyDaysFromNow) {
      upcomingItems.push({
        type: 'inspection',
        date: schedule.nextInspection,
        description: 'Vehicle inspection',
        priority: schedule.nextInspection <= now ? 'overdue' : 'due_soon'
      });
    }
    
    res.json({
      success: true,
      data: {
        ...schedule,
        upcomingItems: upcomingItems.sort((a, b) => new Date(a.date) - new Date(b.date))
      }
    });
  } catch (error) {
    console.error('Get maintenance schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving maintenance schedule',
      error: error.message
    });
  }
});

// @route   DELETE /api/v1/vehicles/:id
// @desc    Delete vehicle
// @access  Private
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // If not admin, only allow deleting user's vehicles
    if (!req.user.isAdminUser()) {
      query.owner = req.user._id;
    }
    
    const vehicle = await Vehicle.findOne(query);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or unauthorized'
      });
    }
    
    // Check if vehicle has active services
    const activeServices = await Service.countDocuments({
      vehicle: req.params.id,
      status: { $in: ['pending', 'approved', 'scheduled', 'in_progress'] }
    });
    
    if (activeServices > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vehicle with active services'
      });
    }
    
    // Soft delete - mark as inactive
    vehicle.isActive = false;
    vehicle.status = 'inactive';
    await vehicle.save();
    
    // Update user's vehicle count
    await User.findByIdAndUpdate(vehicle.owner, {
      $inc: { vehicleCount: -1 }
    });
    
    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting vehicle',
      error: error.message
    });
  }
});

// @route   GET /api/v1/vehicles/maintenance/due
// @desc    Get vehicles with maintenance due
// @access  Private (Admin only)
router.get('/maintenance/due', requireAdmin, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({
      $or: [
        { 'maintenance.nextService': { $lte: new Date() } },
        { 'maintenance.nextOilChange': { $lte: new Date() } },
        { 'maintenance.nextInspection': { $lte: new Date() } },
        { 'maintenance.tireRotation.next': { $lte: new Date() } }
      ],
      isActive: true
    })
    .populate('owner', 'name email phone')
    .sort({ 'maintenance.nextService': 1 });
    
    const vehiclesWithDetails = vehicles.map(vehicle => ({
      ...vehicle.toObject(),
      summary: vehicle.getSummary(),
      isMaintenanceDue: vehicle.isMaintenanceDue()
    }));
    
    res.json({
      success: true,
      data: vehiclesWithDetails,
      count: vehiclesWithDetails.length
    });
  } catch (error) {
    console.error('Get maintenance due vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving maintenance due vehicles',
      error: error.message
    });
  }
});

export default router;