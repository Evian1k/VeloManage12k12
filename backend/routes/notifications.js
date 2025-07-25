import express from 'express';
import { body, validationResult } from 'express-validator';
import Notification from '../models/Notification.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { io } from '../server.js';
import mongoose from 'mongoose';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// @route   GET /api/v1/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { 
      status = 'unread', 
      type, 
      priority, 
      page = 1, 
      limit = 20 
    } = req.query;

    const filter = { recipient: req.user.id };
    
    if (status !== 'all') filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    const notifications = await Notification.find(filter)
      .populate('sender', 'name email avatar')
      .populate('data.serviceId', 'serviceNumber serviceType status')
      .populate('data.truckId', 'truckId driver')
      .populate('data.branchId', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notifications'
    });
  }
});

// @route   GET /api/v1/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    
    res.json({
      success: true,
      data: { count }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving unread count'
    });
  }
});

// @route   PUT /api/v1/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns the notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this notification'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });

  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification'
    });
  }
});

// @route   PUT /api/v1/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, status: 'unread' },
      { 
        status: 'read', 
        readAt: new Date() 
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notifications'
    });
  }
});

// @route   DELETE /api/v1/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns the notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification'
    });
  }
});

// @route   POST /api/v1/notifications/broadcast
// @desc    Send broadcast notification (Admin only)
// @access  Admin
router.post('/broadcast', requireRole(['admin']), [
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').isIn([
    'system_alert', 'maintenance_reminder', 'promotional', 'emergency'
  ]).withMessage('Invalid notification type'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { 
      title, 
      message, 
      type, 
      priority = 'normal',
      targetRole,
      targetBranch,
      channels = { inApp: true, email: false, sms: false, push: true }
    } = req.body;

    // Get target users
    const User = mongoose.model('User');
    let userFilter = { isActive: true };
    
    if (targetRole) userFilter.role = targetRole;
    if (targetBranch) userFilter.branch = targetBranch;

    const users = await User.find(userFilter).select('_id');
    
    // Create notifications for all target users
    const notifications = await Promise.all(
      users.map(user => 
        Notification.create({
          recipient: user._id,
          sender: req.user.id,
          title,
          message,
          type,
          priority,
          channels
        })
      )
    );

    // Send real-time notifications
    users.forEach(user => {
      io.to(user._id.toString()).emit('notification', {
        title,
        message,
        type,
        priority,
        timestamp: new Date()
      });
    });

    res.json({
      success: true,
      message: `Broadcast notification sent to ${users.length} users`,
      data: { recipientCount: users.length }
    });

  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending broadcast notification'
    });
  }
});

// @route   GET /api/v1/notifications/stats
// @desc    Get notification statistics (Admin only)
// @access  Admin
router.get('/stats', requireRole(['admin']), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const stats = await Promise.all([
      // Total notifications
      Notification.countDocuments({ createdAt: { $gte: startDate } }),
      
      // By status
      Notification.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      // By type
      Notification.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      
      // By priority
      Notification.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      
      // Delivery rates
      Notification.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $project: {
            inAppDelivered: '$deliveryStatus.inApp.delivered',
            emailDelivered: '$deliveryStatus.email.delivered',
            smsDelivered: '$deliveryStatus.sms.delivered',
            pushDelivered: '$deliveryStatus.push.delivered'
          }
        },
        {
          $group: {
            _id: null,
            inAppDeliveryRate: { $avg: { $cond: ['$inAppDelivered', 1, 0] } },
            emailDeliveryRate: { $avg: { $cond: ['$emailDelivered', 1, 0] } },
            smsDeliveryRate: { $avg: { $cond: ['$smsDelivered', 1, 0] } },
            pushDeliveryRate: { $avg: { $cond: ['$pushDelivered', 1, 0] } }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        period,
        totalNotifications: stats[0],
        byStatus: stats[1],
        byType: stats[2],
        byPriority: stats[3],
        deliveryRates: stats[4][0] || {}
      }
    });

  } catch (error) {
    console.error('Notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notification statistics'
    });
  }
});

export default router;