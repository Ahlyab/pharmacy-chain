import AuditLog from "../models/AuditLog.js";

/**
 * Audit Logger Utility
 * Provides easy-to-use functions for logging different types of actions
 */

// Helper function to get client IP address
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         'unknown';
};

// Helper function to get user agent
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Log product/inventory related actions
 */
export const logInventoryAction = async (req, action, entityId, entityName, details = {}) => {
  try {
    const user = req.user; // Assuming user is attached to req by auth middleware
    
    // Debug logging
    console.log('Audit logging - req.user:', user);
    console.log('Audit logging - user.id:', user?.id);
    console.log('Audit logging - user._id:', user?._id);
    
    // Safety check
    if (!user || !user.id) {
      console.error('Audit logging failed: No user or user.id found in request');
      return;
    }
    
    await AuditLog.logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      action: action,
      entityType: "Inventory",
      entityId: entityId,
      entityName: entityName,
      description: `${user.name} ${action.toLowerCase().replace('_', ' ')} ${entityName}`,
      details: details,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      tags: ["inventory", "product"],
      priority: "MEDIUM"
    });
  } catch (error) {
    console.error("Failed to log inventory action:", error);
  }
};

/**
 * Log transaction/sale related actions
 */
export const logTransactionAction = async (req, action, entityId, entityName, transactionDetails = {}) => {
  try {
    const user = req.user;
    
    // Safety check
    if (!user || !user.id) {
      console.error('Audit logging failed: No user or user.id found in request');
      return;
    }
    
    await AuditLog.logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      action: action,
      entityType: "Transaction",
      entityId: entityId,
      entityName: entityName,
      description: `${user.name} ${action.toLowerCase().replace('_', ' ')} ${entityName}`,
      transactionDetails: transactionDetails,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      tags: ["transaction", "sale", "invoice"],
      priority: "HIGH"
    });
  } catch (error) {
    console.error("Failed to log transaction action:", error);
  }
};

/**
 * Log bulk operations (imports, exports)
 */
export const logBulkOperation = async (req, action, fileName, totalRecords, successCount, errorCount, errors = []) => {
  try {
    const user = req.user;
    
    // Safety check
    if (!user || !user.id) {
      console.error('Audit logging failed: No user or user.id found in request');
      return;
    }
    
    await AuditLog.logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      action: action,
      entityType: "BulkOperation",
      entityName: fileName,
      description: `${user.name} performed bulk operation: ${fileName}`,
      bulkOperationDetails: {
        fileName,
        totalRecords,
        successCount,
        errorCount,
        errors
      },
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      tags: ["bulk", "import", "export"],
      priority: "HIGH"
    });
  } catch (error) {
    console.error("Failed to log bulk operation:", error);
  }
};

/**
 * Log user management actions
 */
export const logUserAction = async (req, action, entityId, entityName, details = {}) => {
  try {
    const user = req.user;
    console.log("[+] user", user);
    
    // Safety check
    if (!user || !user.id) {
      console.error('Audit logging failed: No user or user.id found in request');
      return;
    }
    
    await AuditLog.logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      action: action,
      entityType: "User",
      entityId: entityId,
      entityName: entityName,
      description: `${user.name} ${action.toLowerCase().replace('_', ' ')} user: ${entityName}`,
      details: details,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      tags: ["user", "management"],
      priority: "HIGH"
    });
  } catch (error) {
    console.error("Failed to log user action:", error);
  }
};

/**
 * Log branch/warehouse actions
 */
export const logBranchAction = async (req, action, entityId, entityName, details = {}) => {
  try {
    const user = req.user;
    
    // Safety check
    if (!user || !user.id) {
      console.error('Audit logging failed: No user or user.id found in request');
      return;
    }
    
    await AuditLog.logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      action: action,
      entityType: "Branch",
      entityId: entityId,
      entityName: entityName,
      description: `${user.name} ${action.toLowerCase().replace('_', ' ')} branch: ${entityName}`,
      details: details,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      tags: ["branch", "warehouse"],
      priority: "MEDIUM"
    });
  } catch (error) {
    console.error("Failed to log branch action:", error);
  }
};

/**
 * Log supplier actions
 */
export const logSupplierAction = async (req, action, entityId, entityName, details = {}) => {
  try {
    const user = req.user;
    
    // Safety check
    if (!user || !user.id) {
      console.error('Audit logging failed: No user or user.id found in request');
      return;
    }
    
    await AuditLog.logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      action: action,
      entityType: "Supplier",
      entityId: entityId,
      entityName: entityName,
      description: `${user.name} ${action.toLowerCase().replace('_', ' ')} supplier: ${entityName}`,
      details: details,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      tags: ["supplier", "vendor"],
      priority: "MEDIUM"
    });
  } catch (error) {
    console.error("Failed to log supplier action:", error);
  }
};

/**
 * Log system actions
 */
export const logSystemAction = async (req, action, description, details = {}) => {
  try {
    const user = req.user;
    
    // Safety check
    if (!user || !user.id) {
      console.error('Audit logging failed: No user or user.id found in request');
      return;
    }
    
    await AuditLog.logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      action: action,
      entityType: "System",
      description: description,
      details: details,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      tags: ["system", "admin"],
      priority: "CRITICAL"
    });
  } catch (error) {
    console.error("Failed to log system action:", error);
  }
};

/**
 * Log login/logout actions
 */
export const logAuthAction = async (req, action, success = true, error = null) => {
  try {
    const user = req.user;
    
    // Safety check
    if (!user || !user.id) {
      console.error('Audit logging failed: No user or user.id found in request');
      return;
    }
    
    await AuditLog.logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      action: action,
      entityType: "User",
      description: `${user.name} ${action.toLowerCase()}`,
      status: success ? "SUCCESS" : "FAILED",
      error: error ? {
        message: error.message,
        code: error.code
      } : undefined,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      tags: ["authentication", "security"],
      priority: "HIGH"
    });
  } catch (error) {
    console.error("Failed to log auth action:", error);
  }
};

/**
 * Generic action logger for custom actions
 */
export const logCustomAction = async (req, action, entityType, entityId, entityName, description, details = {}) => {
  try {
    const user = req.user;
    
    // Safety check
    if (!user || !user.id) {
      console.error('Audit logging failed: No user or user.id found in request');
      return;
    }
    
    await AuditLog.logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      action: action,
      entityType: entityType,
      entityId: entityId,
      entityName: entityName,
      description: description,
      details: details,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      tags: ["custom"],
      priority: "MEDIUM"
    });
  } catch (error) {
    console.error("Failed to log custom action:", error);
  }
};

/**
 * Log failed actions with error details
 */
export const logFailedAction = async (req, action, entityType, entityId, entityName, description, error, details = {}) => {
  try {
    const user = req.user;
    
    // Safety check
    if (!user || !user.id) {
      console.error('Audit logging failed: No user or user.id found in request');
      return;
    }
    
    await AuditLog.logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      action: action,
      entityType: entityType,
      entityId: entityId,
      entityName: entityName,
      description: description,
      details: details,
      status: "FAILED",
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      tags: ["error", "failed"],
      priority: "HIGH"
    });
  } catch (logError) {
    console.error("Failed to log failed action:", logError);
  }
};

export default {
  logInventoryAction,
  logTransactionAction,
  logBulkOperation,
  logUserAction,
  logBranchAction,
  logSupplierAction,
  logSystemAction,
  logAuthAction,
  logCustomAction,
  logFailedAction
};
