import express from "express";
import {
  getEntityAuditTrail,
  getUserActivity,
  getBranchActivity,
  getSystemAuditLogs,
  getAuditStatistics,
  exportAuditLogs,
  deleteOldAuditLogs
} from "../controllers/auditController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Get audit trail for a specific entity
router.get("/entity/:entityType/:entityId", authenticate, getEntityAuditTrail);

// Get user activity
router.get("/user/:userId", authenticate, getUserActivity);

// Get branch activity
router.get("/branch/:branchId", authenticate, getBranchActivity);

// Get system-wide audit logs with filters
router.get("/system", authenticate, authorize('Admin'), getSystemAuditLogs);

// Get audit statistics
router.get("/statistics", authenticate, authorize('Admin'), getAuditStatistics);

// Export audit logs
router.get("/export", authenticate, authorize('Admin'), exportAuditLogs);

// Delete old audit logs (admin only)
router.delete("/cleanup", authenticate, authorize('Admin'), deleteOldAuditLogs);

export default router;
