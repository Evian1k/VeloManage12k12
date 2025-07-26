import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import Truck from '../models/Truck.js';
import Branch from '../models/Branch.js';
import PickupRequest from '../models/PickupRequest.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// @route   GET /api/v1/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private (Admin/Manager)
router.get('/dashboard', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { period = '30d', branchId } = req.query;
    
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
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build filter for branch-specific data
    const serviceFilter = { createdAt: { $gte: startDate } };
    const pickupFilter = { createdAt: { $gte: startDate } };
    
    if (branchId) {
      serviceFilter.branch = branchId;
      pickupFilter.branch = branchId;
    }

    // Get analytics data in parallel
    const [
      totalServices,
      servicesByStatus,
      servicesByType,
      servicesByPriority,
      averageCompletionTime,
      totalRevenue,
      customerSatisfaction,
      truckUtilization,
      activeCustomers,
      pendingPickups,
      completedPickups,
      dailyServiceTrends,
      topServices,
      branchPerformance,
      technicianPerformance,
      customerRetention
    ] = await Promise.all([
      // Total services
      Service.countDocuments(serviceFilter),
      
      // Services by status
      Service.aggregate([
        { $match: serviceFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      // Services by type
      Service.aggregate([
        { $match: serviceFilter },
        { $group: { _id: '$serviceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Services by priority
      Service.aggregate([
        { $match: serviceFilter },
        { $group: { _id: '$urgency', count: { $sum: 1 } } }
      ]),
      
      // Average completion time
      Service.aggregate([
        { $match: { ...serviceFilter, status: 'completed', 'schedule.endTime': { $exists: true } } },
        {
          $addFields: {
            completionTime: {
              $subtract: ['$schedule.endTime', '$schedule.startTime']
            }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$completionTime' }
          }
        }
      ]),
      
      // Total revenue
      Service.aggregate([
        { $match: { ...serviceFilter, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalCost' } } }
      ]),
      
      // Customer satisfaction (from feedback ratings)
      Service.aggregate([
        { 
          $match: { 
            ...serviceFilter, 
            'feedback.rating': { $exists: true, $ne: null } 
          } 
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$feedback.rating' },
            totalRatings: { $sum: 1 }
          }
        }
      ]),
      
      // Truck utilization
      Truck.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Active customers
      Service.aggregate([
        { $match: serviceFilter },
        { $group: { _id: '$customer' } },
        { $count: 'activeCustomers' }
      ]),
      
      // Pending pickups
      PickupRequest.countDocuments({ ...pickupFilter, status: 'pending' }),
      
      // Completed pickups
      PickupRequest.countDocuments({ ...pickupFilter, status: 'completed' }),
      
      // Daily service trends
      Service.aggregate([
        { $match: serviceFilter },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            services: { $sum: 1 },
            revenue: { $sum: '$totalCost' }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      
      // Top services
      Service.aggregate([
        { $match: serviceFilter },
        {
          $group: {
            _id: '$serviceType',
            count: { $sum: 1 },
            revenue: { $sum: '$totalCost' },
            avgRating: { $avg: '$feedback.rating' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      
      // Branch performance (if not filtering by specific branch)
      !branchId ? Service.aggregate([
        { $match: serviceFilter },
        {
          $lookup: {
            from: 'branches',
            localField: 'branch',
            foreignField: '_id',
            as: 'branchInfo'
          }
        },
        { $unwind: { path: '$branchInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$branch',
            branchName: { $first: '$branchInfo.name' },
            services: { $sum: 1 },
            revenue: { $sum: '$totalCost' },
            avgRating: { $avg: '$feedback.rating' }
          }
        },
        { $sort: { services: -1 } }
      ]) : Promise.resolve([]),
      
      // Technician performance
      Service.aggregate([
        { $match: { ...serviceFilter, assignedTechnician: { $exists: true } } },
        {
          $lookup: {
            from: 'users',
            localField: 'assignedTechnician',
            foreignField: '_id',
            as: 'techInfo'
          }
        },
        { $unwind: '$techInfo' },
        {
          $group: {
            _id: '$assignedTechnician',
            techName: { $first: '$techInfo.name' },
            services: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            avgRating: { $avg: '$feedback.rating' }
          }
        },
        {
          $addFields: {
            completionRate: {
              $multiply: [
                { $divide: ['$completed', '$services'] },
                100
              ]
            }
          }
        },
        { $sort: { services: -1 } },
        { $limit: 10 }
      ]),
      
      // Customer retention rate
      Service.aggregate([
        { $match: serviceFilter },
        {
          $group: {
            _id: '$customer',
            serviceCount: { $sum: 1 },
            firstService: { $min: '$createdAt' },
            lastService: { $max: '$createdAt' }
          }
        },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            returningCustomers: {
              $sum: { $cond: [{ $gt: ['$serviceCount', 1] }, 1, 0] }
            }
          }
        },
        {
          $addFields: {
            retentionRate: {
              $multiply: [
                { $divide: ['$returningCustomers', '$totalCustomers'] },
                100
              ]
            }
          }
        }
      ])
    ]);

    // Calculate key metrics
    const completedServices = servicesByStatus.find(s => s._id === 'completed')?.count || 0;
    const completionRate = totalServices > 0 ? (completedServices / totalServices) * 100 : 0;
    
    const avgCompletionHours = averageCompletionTime[0]?.avgTime 
      ? Math.round(averageCompletionTime[0].avgTime / (1000 * 60 * 60 * 24)) 
      : 0;

    const totalTrucks = truckUtilization.reduce((sum, truck) => sum + truck.count, 0);
    const activeTrucks = truckUtilization.find(t => t._id === 'available')?.count || 0;
    const truckUtilizationRate = totalTrucks > 0 ? (activeTrucks / totalTrucks) * 100 : 0;

    res.json({
      success: true,
      data: {
        period,
        overview: {
          totalServices,
          completedServices,
          completionRate: Math.round(completionRate),
          totalRevenue: totalRevenue[0]?.total || 0,
          activeCustomers: activeCustomers[0]?.activeCustomers || 0,
          averageCompletionTime: avgCompletionHours,
          customerSatisfaction: customerSatisfaction[0]?.avgRating || 0,
          totalRatings: customerSatisfaction[0]?.totalRatings || 0,
          pendingPickups,
          completedPickups,
          truckUtilizationRate: Math.round(truckUtilizationRate),
          customerRetentionRate: Math.round(customerRetention[0]?.retentionRate || 0)
        },
        breakdown: {
          servicesByStatus: servicesByStatus.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          servicesByType,
          servicesByPriority: servicesByPriority.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          truckUtilization: truckUtilization.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        trends: {
          dailyServices: dailyServiceTrends,
          topServices,
          branchPerformance,
          technicianPerformance
        },
        insights: {
          customerRetention: customerRetention[0] || {},
          recommendations: generateRecommendations({
            completionRate,
            customerSatisfaction: customerSatisfaction[0]?.avgRating || 0,
            truckUtilizationRate,
            totalServices
          })
        }
      }
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dashboard analytics'
    });
  }
});

// @route   GET /api/v1/analytics/revenue
// @desc    Get revenue analytics
// @access  Private (Admin/Manager)
router.get('/revenue', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { period = '30d', branchId, groupBy = 'day' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filter = { 
      createdAt: { $gte: startDate },
      status: 'completed'
    };
    
    if (branchId) filter.branch = branchId;

    // Group by format
    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00';
        break;
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%U';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const [
      totalRevenue,
      revenueByPeriod,
      revenueByService,
      revenueByBranch,
      revenueGrowth
    ] = await Promise.all([
      // Total revenue
      Service.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$totalCost' } } }
      ]),
      
      // Revenue by time period
      Service.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: '$createdAt'
              }
            },
            revenue: { $sum: '$totalCost' },
            services: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      
      // Revenue by service type
      Service.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$serviceType',
            revenue: { $sum: '$totalCost' },
            services: { $sum: 1 },
            avgRevenue: { $avg: '$totalCost' }
          }
        },
        { $sort: { revenue: -1 } }
      ]),
      
      // Revenue by branch
      !branchId ? Service.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'branches',
            localField: 'branch',
            foreignField: '_id',
            as: 'branchInfo'
          }
        },
        { $unwind: { path: '$branchInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$branch',
            branchName: { $first: '$branchInfo.name' },
            revenue: { $sum: '$totalCost' },
            services: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } }
      ]) : Promise.resolve([]),
      
      // Revenue growth calculation
      Service.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: '$createdAt'
              }
            },
            revenue: { $sum: '$totalCost' }
          }
        },
        { $sort: { '_id': 1 } }
      ])
    ]);

    // Calculate growth rate
    const growthRate = calculateGrowthRate(revenueGrowth);

    res.json({
      success: true,
      data: {
        period,
        groupBy,
        total: totalRevenue[0]?.total || 0,
        growthRate,
        trends: revenueByPeriod,
        breakdown: {
          byService: revenueByService,
          byBranch: revenueByBranch
        }
      }
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving revenue analytics'
    });
  }
});

// @route   GET /api/v1/analytics/performance
// @desc    Get performance analytics
// @access  Private (Admin/Manager)
router.get('/performance', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { period = '30d', branchId } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filter = { createdAt: { $gte: startDate } };
    if (branchId) filter.branch = branchId;

    const [
      serviceMetrics,
      technicianPerformance,
      branchPerformance,
      customerMetrics,
      qualityMetrics
    ] = await Promise.all([
      // Service performance metrics
      Service.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalServices: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
            avgCompletionTime: { $avg: '$schedule.actualDuration' },
            avgCost: { $avg: '$totalCost' }
          }
        }
      ]),
      
      // Technician performance
      Service.aggregate([
        { $match: { ...filter, assignedTechnician: { $exists: true } } },
        {
          $lookup: {
            from: 'users',
            localField: 'assignedTechnician',
            foreignField: '_id',
            as: 'techInfo'
          }
        },
        { $unwind: '$techInfo' },
        {
          $group: {
            _id: '$assignedTechnician',
            name: { $first: '$techInfo.name' },
            email: { $first: '$techInfo.email' },
            totalServices: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            avgRating: { $avg: '$feedback.rating' },
            totalRatings: { $sum: { $cond: [{ $ne: ['$feedback.rating', null] }, 1, 0] } },
            avgCompletionTime: { $avg: '$schedule.actualDuration' },
            totalRevenue: { $sum: '$totalCost' }
          }
        },
        {
          $addFields: {
            completionRate: { $multiply: [{ $divide: ['$completed', '$totalServices'] }, 100] },
            efficiency: {
              $cond: [
                { $gt: ['$avgCompletionTime', 0] },
                { $divide: ['$totalServices', '$avgCompletionTime'] },
                0
              ]
            }
          }
        },
        { $sort: { totalServices: -1 } }
      ]),
      
      // Branch performance
      !branchId ? Service.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'branches',
            localField: 'branch',
            foreignField: '_id',
            as: 'branchInfo'
          }
        },
        { $unwind: { path: '$branchInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$branch',
            name: { $first: '$branchInfo.name' },
            code: { $first: '$branchInfo.code' },
            totalServices: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            avgRating: { $avg: '$feedback.rating' },
            totalRevenue: { $sum: '$totalCost' },
            avgCompletionTime: { $avg: '$schedule.actualDuration' }
          }
        },
        {
          $addFields: {
            completionRate: { $multiply: [{ $divide: ['$completed', '$totalServices'] }, 100] }
          }
        },
        { $sort: { totalServices: -1 } }
      ]) : Promise.resolve([]),
      
      // Customer metrics
      Service.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'customer',
            foreignField: '_id',
            as: 'customerInfo'
          }
        },
        { $unwind: '$customerInfo' },
        {
          $group: {
            _id: '$customer',
            name: { $first: '$customerInfo.name' },
            email: { $first: '$customerInfo.email' },
            totalServices: { $sum: 1 },
            totalSpent: { $sum: '$totalCost' },
            avgRating: { $avg: '$feedback.rating' },
            lastService: { $max: '$createdAt' },
            firstService: { $min: '$createdAt' }
          }
        },
        {
          $addFields: {
            avgSpending: { $divide: ['$totalSpent', '$totalServices'] },
            daysSinceLastService: {
              $divide: [
                { $subtract: [new Date(), '$lastService'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 20 }
      ]),
      
      // Quality metrics
      Service.aggregate([
        { $match: { ...filter, 'feedback.rating': { $exists: true } } },
        {
          $group: {
            _id: '$serviceType',
            avgRating: { $avg: '$feedback.rating' },
            totalRatings: { $sum: 1 },
            ratings: { $push: '$feedback.rating' }
          }
        },
        {
          $addFields: {
            satisfaction: {
              $multiply: [
                { $divide: [{ $size: { $filter: { input: '$ratings', cond: { $gte: ['$$this', 4] } } } }, '$totalRatings'] },
                100
              ]
            }
          }
        },
        { $sort: { avgRating: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        period,
        serviceMetrics: serviceMetrics[0] || {},
        technicianPerformance,
        branchPerformance,
        topCustomers: customerMetrics,
        qualityMetrics
      }
    });

  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving performance analytics'
    });
  }
});

// Helper function to generate recommendations
function generateRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.completionRate < 80) {
    recommendations.push({
      type: 'warning',
      title: 'Low Completion Rate',
      message: 'Service completion rate is below 80%. Consider reviewing workflow and resource allocation.',
      priority: 'high'
    });
  }
  
  if (metrics.customerSatisfaction < 4.0) {
    recommendations.push({
      type: 'warning',
      title: 'Customer Satisfaction',
      message: 'Customer satisfaction is below 4.0. Focus on service quality improvements.',
      priority: 'high'
    });
  }
  
  if (metrics.truckUtilizationRate < 60) {
    recommendations.push({
      type: 'info',
      title: 'Truck Utilization',
      message: 'Truck utilization is low. Consider optimizing routes or reassigning vehicles.',
      priority: 'medium'
    });
  }
  
  if (metrics.totalServices > 100 && metrics.completionRate > 90) {
    recommendations.push({
      type: 'success',
      title: 'Excellent Performance',
      message: 'Great job! High service volume with excellent completion rate.',
      priority: 'low'
    });
  }
  
  return recommendations;
}

// Helper function to calculate growth rate
function calculateGrowthRate(revenueData) {
  if (revenueData.length < 2) return 0;
  
  const current = revenueData[revenueData.length - 1]?.revenue || 0;
  const previous = revenueData[revenueData.length - 2]?.revenue || 0;
  
  if (previous === 0) return 0;
  
  return Math.round(((current - previous) / previous) * 100);
}

export default router;