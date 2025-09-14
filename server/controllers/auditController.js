import AuditLog from "../models/AuditLog.js";

/**
 * Audit Controller
 * Handles audit log retrieval and management
 */

// Get audit trail for a specific entity
export const getEntityAuditTrail = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = 100, page = 1 } = req.query;
    
    const skip = (page - 1) * limit;
    
    const auditTrail = await AuditLog.find({
      entityType: entityType,
      entityId: entityId
    })
    .sort({ actionTimestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("userId", "name email role")
    .populate("branchId", "name");
    
    const total = await AuditLog.countDocuments({
      entityType: entityType,
      entityId: entityId
    });
    
    res.json({
      success: true,
      data: auditTrail,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting entity audit trail:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve audit trail",
      error: error.message
    });
  }
};

// Get user activity
export const getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, page = 1, action, entityType, startDate, endDate } = req.query;
    
    const skip = (page - 1) * limit;
    
    let query = { userId: userId };
    
    // Add filters
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (startDate || endDate) {
      query.actionTimestamp = {};
      if (startDate) query.actionTimestamp.$gte = new Date(startDate);
      if (endDate) query.actionTimestamp.$lte = new Date(endDate);
    }
    
    const userActivity = await AuditLog.find(query)
    .sort({ actionTimestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("entityId")
    .populate("branchId", "name");
    
    const total = await AuditLog.countDocuments(query);
    
    res.json({
      success: true,
      data: userActivity,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting user activity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user activity",
      error: error.message
    });
  }
};

// Get branch activity
export const getBranchActivity = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { limit = 100, page = 1, action, entityType, startDate, endDate, userRole } = req.query;
    
    const skip = (page - 1) * limit;
    
    let query = { branchId: branchId };
    
    // Add filters
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (userRole) query.userRole = userRole;
    if (startDate || endDate) {
      query.actionTimestamp = {};
      if (startDate) query.actionTimestamp.$gte = new Date(startDate);
      if (endDate) query.actionTimestamp.$lte = new Date(endDate);
    }
    
    const branchActivity = await AuditLog.find(query)
    .sort({ actionTimestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("userId", "name email role")
    .populate("entityId");
    
    const total = await AuditLog.countDocuments(query);
    
    res.json({
      success: true,
      data: branchActivity,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting branch activity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve branch activity",
      error: error.message
    });
  }
};

// Get system-wide audit logs with filters
export const getSystemAuditLogs = async (req, res) => {
  try {
    console.log('getSystemAuditLogs called with user:', req.user);
    console.log('Query params:', req.query);
    
    const { 
      limit = 100, 
      page = 1, 
      action, 
      entityType, 
      userRole, 
      branchId,
      status,
      priority,
      startDate, 
      endDate,
      tags 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    let query = {};
    
    // Add filters
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (userRole) query.userRole = userRole;
    if (branchId) query.branchId = branchId;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (tags) query.tags = { $in: tags.split(',') };
    if (startDate || endDate) {
      query.actionTimestamp = {};
      if (startDate) query.actionTimestamp.$gte = new Date(startDate);
      if (endDate) query.actionTimestamp.$lte = new Date(endDate);
    }
    
    const auditLogs = await AuditLog.find(query)
    .sort({ actionTimestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("userId", "name email role")
    .populate("branchId", "name")
    .populate("entityId");
    
    const total = await AuditLog.countDocuments(query);
    
    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting system audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve system audit logs",
      error: error.message
    });
  }
};

// Get audit statistics
export const getAuditStatistics = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.actionTimestamp = {};
      if (startDate) dateFilter.actionTimestamp.$gte = new Date(startDate);
      if (endDate) dateFilter.actionTimestamp.$lte = new Date(endDate);
    }
    
    if (branchId) dateFilter.branchId = branchId;
    
    // Get action counts
    const actionStats = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get entity type counts
    const entityStats = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$entityType", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get user role counts
    const roleStats = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$userRole", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get status counts
    const statusStats = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get priority counts
    const priorityStats = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get daily activity for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyActivity = await AuditLog.aggregate([
      { 
        $match: { 
          ...dateFilter,
          actionTimestamp: { $gte: thirtyDaysAgo } 
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$actionTimestamp" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        actionStats,
        entityStats,
        roleStats,
        statusStats,
        priorityStats,
        dailyActivity
      }
    });
  } catch (error) {
    console.error("Error getting audit statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve audit statistics",
      error: error.message
    });
  }
};

// Export audit logs to CSV/Excel (basic structure)
export const exportAuditLogs = async (req, res) => {
  try {
    const { 
      action, 
      entityType, 
      userRole, 
      branchId,
      status,
      priority,
      startDate, 
      endDate,
      format = 'csv'
    } = req.query;
    
    let query = {};
    
    // Add filters
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (userRole) query.userRole = userRole;
    if (branchId) query.branchId = branchId;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (startDate || endDate) {
      query.actionTimestamp = {};
      if (startDate) query.actionTimestamp.$gte = new Date(startDate);
      if (endDate) query.actionTimestamp.$lte = new Date(endDate);
    }
    
    const auditLogs = await AuditLog.find(query)
    .sort({ actionTimestamp: -1 })
    .populate("userId", "name email role")
    .populate("branchId", "name");
    
    // For now, return JSON. You can implement CSV/Excel export later
    res.json({
      success: true,
      message: "Export functionality to be implemented",
      data: auditLogs,
      total: auditLogs.length
    });
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export audit logs",
      error: error.message
    });
  }
};

// Delete old audit logs (admin only)
export const deleteOldAuditLogs = async (req, res) => {
  try {
    const { days = 365 } = req.body; // Default to 1 year
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await AuditLog.deleteMany({
      actionTimestamp: { $lt: cutoffDate }
    });
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} audit logs older than ${days} days`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error deleting old audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete old audit logs",
      error: error.message
    });
  }
};
