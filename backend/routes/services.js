import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import Truck from '../models/Truck.js';
import Branch from '../models/Branch.js';

const router = express.Router();

// @route   GET /api/v1/services/types
// @desc    Get available service types
// @access  Public
router.get('/types', (req, res) => {
  const serviceTypes = [
    { value: 'brake_repair', label: 'Brake Repair', category: 'repair', duration: 3 },
    { value: 'oil_change', label: 'Oil Change', category: 'maintenance', duration: 1 },
    { value: 'engine_diagnostic', label: 'Engine Diagnostic', category: 'diagnostic', duration: 2 },
    { value: 'routine_3000km', label: '3000km Routine Maintenance', category: 'maintenance', duration: 4 },
    { value: 'tire_replacement', label: 'Tire Replacement', category: 'maintenance', duration: 2 },
    { value: 'transmission_service', label: 'Transmission Service', category: 'maintenance', duration: 3 },
    { value: 'ac_repair', label: 'AC Repair', category: 'repair', duration: 2 },
    { value: 'battery_replacement', label: 'Battery Replacement', category: 'maintenance', duration: 1 },
    { value: 'suspension_repair', label: 'Suspension Repair', category: 'repair', duration: 4 },
    { value: 'electrical_repair', label: 'Electrical Repair', category: 'repair', duration: 3 },
    { value: 'vehicle_pickup', label: 'Vehicle Pickup', category: 'pickup', duration: 1 },
    { value: 'emergency_service', label: 'Emergency Service', category: 'emergency', duration: 2 }
  ];

  res.json({
    success: true,
    data: serviceTypes
  });
});

// @route   GET /api/v1/services
// @desc    Get service requests
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, serviceType, page = 1, limit = 10 } = req.query;
    const query = {};
    
    // Filter by user role
    if (!req.user.isAdmin) {
      query.customer = req.user.id;
    }
    
    // Apply filters
    if (status) query.status = status;
    if (serviceType) query.serviceType = serviceType;
    
    const services = await Service.find(query)
      .populate('customer', 'name email phone')
      .populate('assignedTechnician', 'name email')
      .populate('assignedTruck', 'truckNumber driverName')
      .populate('branch', 'name address')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Service.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        services,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error retrieving services:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving service requests'
    });
  }
});

// @route   POST /api/v1/services
// @desc    Create service request
// @access  Private
router.post('/', [
  authenticateToken,
  body('serviceType').isIn([
    'brake_repair', 'oil_change', 'engine_diagnostic', 'routine_3000km',
    'tire_replacement', 'transmission_service', 'ac_repair', 'battery_replacement',
    'suspension_repair', 'electrical_repair', 'vehicle_pickup', 'emergency_service'
  ]).withMessage('Invalid service type'),
  body('vehicle.make').notEmpty().withMessage('Vehicle make is required'),
  body('vehicle.model').notEmpty().withMessage('Vehicle model is required'),
  body('vehicle.year').notEmpty().withMessage('Vehicle year is required'),
  body('vehicle.licensePlate').notEmpty().withMessage('License plate is required'),
  body('description').notEmpty().withMessage('Service description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const {
      serviceType,
      vehicle,
      description,
      urgency = 'normal',
      preferredDate,
      location,
      spareParts = [],
      isRecurring = false,
      recurringConfig
    } = req.body;

    // Determine service category
    const categoryMap = {
      brake_repair: 'repair',
      oil_change: 'maintenance',
      engine_diagnostic: 'diagnostic',
      routine_3000km: 'maintenance',
      tire_replacement: 'maintenance',
      transmission_service: 'maintenance',
      ac_repair: 'repair',
      battery_replacement: 'maintenance',
      suspension_repair: 'repair',
      electrical_repair: 'repair',
      vehicle_pickup: 'pickup',
      emergency_service: 'emergency'
    };

    // Create service steps based on type
    const getServiceSteps = (type) => {
      const stepTemplates = {
        brake_repair: [
          { name: 'Initial Inspection', description: 'Inspect brake system components' },
          { name: 'Remove Old Parts', description: 'Remove worn brake pads/discs' },
          { name: 'Install New Parts', description: 'Install new brake components' },
          { name: 'System Testing', description: 'Test brake system functionality' },
          { name: 'Quality Check', description: 'Final inspection and road test' }
        ],
        oil_change: [
          { name: 'Drain Old Oil', description: 'Drain existing engine oil' },
          { name: 'Replace Filter', description: 'Install new oil filter' },
          { name: 'Add New Oil', description: 'Add fresh engine oil' },
          { name: 'System Check', description: 'Check oil levels and leaks' }
        ],
        routine_3000km: [
          { name: 'Initial Inspection', description: 'Comprehensive vehicle inspection' },
          { name: 'Oil Change', description: 'Change engine oil and filter' },
          { name: 'Filter Replacement', description: 'Replace air and fuel filters' },
          { name: 'Fluid Check', description: 'Check and top up all fluids' },
          { name: 'Safety Check', description: 'Inspect brakes, tires, and lights' },
          { name: 'Final Testing', description: 'Road test and quality assurance' }
        ],
        engine_diagnostic: [
          { name: 'Connect Diagnostic Tools', description: 'Connect OBD scanner' },
          { name: 'Read Error Codes', description: 'Retrieve diagnostic trouble codes' },
          { name: 'System Analysis', description: 'Analyze engine performance data' },
          { name: 'Component Testing', description: 'Test specific engine components' },
          { name: 'Report Generation', description: 'Generate diagnostic report' }
        ]
      };
      
      return stepTemplates[type] || [
        { name: 'Service Preparation', description: 'Prepare for service' },
        { name: 'Service Execution', description: 'Perform requested service' },
        { name: 'Quality Check', description: 'Final inspection' }
      ];
    };

    const service = new Service({
      serviceNumber: `SRV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customer: req.user.id,
      serviceType,
      serviceCategory: categoryMap[serviceType],
      vehicle,
      description,
      urgency,
      schedule: {
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        estimatedDuration: getServiceEstimatedDuration(serviceType)
      },
      location: location ? {
        coordinates: [location.longitude, location.latitude],
        address: location.address,
        isPickupLocation: serviceType === 'vehicle_pickup'
      } : undefined,
      spareParts: spareParts.map(part => ({
        ...part,
        totalPrice: part.quantity * part.unitPrice
      })),
      progress: {
        steps: getServiceSteps(serviceType),
        completionPercentage: 0
      },
      isRecurring,
      recurringConfig: isRecurring ? recurringConfig : undefined
    });

    // Calculate totals
    service.calculateTotals();
    
    await service.save();

    // Populate the response
    await service.populate('customer', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: service
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service request'
    });
  }
});

// @route   GET /api/v1/services/:id
// @desc    Get single service request
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('assignedTechnician', 'name email phone')
      .populate('assignedTruck', 'truckNumber driverName location')
      .populate('branch', 'name address phone');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Check access permissions
    if (!req.user.isAdmin && service.customer._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error retrieving service:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving service request'
    });
  }
});

// @route   PUT /api/v1/services/:id/status
// @desc    Update service status
// @access  Admin
router.put('/:id/status', [
  requireAdmin,
  body('status').isIn(['pending', 'approved', 'assigned', 'in_progress', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { status, notes } = req.body;
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    service.status = status;
    
    // Add internal note
    if (notes) {
      service.communication.internalNotes.push({
        author: req.user.id,
        note: `Status updated to ${status}: ${notes}`
      });
    }

    // Update progress based on status
    if (status === 'completed') {
      service.progress.completionPercentage = 100;
      service.progress.steps.forEach(step => {
        if (step.status !== 'completed') {
          step.status = 'completed';
          step.endTime = new Date();
        }
      });
    }

    await service.save();
    await service.populate('customer', 'name email phone');

    res.json({
      success: true,
      message: 'Service status updated successfully',
      data: service
    });
  } catch (error) {
    console.error('Error updating service status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service status'
    });
  }
});

// @route   PUT /api/v1/services/:id/assign
// @desc    Assign technician and truck to service
// @access  Admin
router.put('/:id/assign', [
  requireAdmin,
  body('technicianId').isMongoId().withMessage('Valid technician ID required'),
  body('truckId').optional().isMongoId().withMessage('Valid truck ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { technicianId, truckId, scheduledDate, branchId } = req.body;
    
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Verify technician exists and has proper role
    const technician = await User.findById(technicianId);
    if (!technician || !['mechanic', 'admin', 'manager'].includes(technician.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid technician selected'
      });
    }

    service.assignedTechnician = technicianId;
    if (truckId) service.assignedTruck = truckId;
    if (branchId) service.branch = branchId;
    if (scheduledDate) service.schedule.scheduledDate = new Date(scheduledDate);
    
    service.status = 'assigned';
    service.communication.internalNotes.push({
      author: req.user.id,
      note: `Service assigned to ${technician.name}`
    });

    await service.save();
    await service.populate(['customer', 'assignedTechnician', 'assignedTruck', 'branch']);

    res.json({
      success: true,
      message: 'Service assigned successfully',
      data: service
    });
  } catch (error) {
    console.error('Error assigning service:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning service'
    });
  }
});

// Helper function to get estimated duration
function getServiceEstimatedDuration(serviceType) {
  const durations = {
    brake_repair: 3,
    oil_change: 1,
    engine_diagnostic: 2,
    routine_3000km: 4,
    tire_replacement: 2,
    transmission_service: 3,
    ac_repair: 2,
    battery_replacement: 1,
    suspension_repair: 4,
    electrical_repair: 3,
    vehicle_pickup: 1,
    emergency_service: 2
  };
  
  return durations[serviceType] || 2;
}

export default router;