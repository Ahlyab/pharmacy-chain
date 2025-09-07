import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: { type: String, required: true }, // Cached for quick access
    userRole: { type: String, required: true }, // Admin, Manager, Sale Assistant
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: false, // Optional for admin actions
    },

    // What action was performed
    action: {
      type: String,
      required: true,
      enum: [
        // Product/Inventory actions
        "PRODUCT_CREATED",
        "PRODUCT_UPDATED",
        "PRODUCT_DELETED",
        "STOCK_ADDED",
        "STOCK_UPDATED",
        "STOCK_DELETED",
        "INVENTORY_IMPORTED",
        "INVENTORY_EXPORTED",
        "INVENTORY_TRANSFER",

        // Transaction actions
        "SALE_CREATED",
        "SALE_UPDATED",
        "SALE_CANCELLED",
        "SALE_RETURNED",
        "INVOICE_CREATED",
        "INVOICE_UPDATED",
        "INVOICE_DELETED",

        // User management
        "USER_CREATED",
        "USER_UPDATED",
        "USER_DELETED",
        "USER_LOGIN",
        "USER_LOGOUT",

        // Branch/Warehouse actions
        "BRANCH_CREATED",
        "BRANCH_UPDATED",
        "BRANCH_DELETED",
        "WAREHOUSE_TRANSFER",
        "WAREHOUSE_STOCK_ADDED",
        "WAREHOUSE_STOCK_UPDATED",

        // Supplier actions
        "SUPPLIER_CREATED",
        "SUPPLIER_UPDATED",
        "SUPPLIER_DELETED",

        // Bulk operations
        "BULK_UPLOAD",
        "BULK_UPDATE",
        "BULK_DELETE",
        "DATA_EXPORT",

        // System actions
        "SYSTEM_BACKUP",
        "SYSTEM_RESTORE",
        "SETTINGS_UPDATED",
        "REPORT_GENERATED",
      ],
    },

    // What entity was affected
    entityType: {
      type: String,
      required: true,
      enum: [
        "Product",
        "Inventory",
        "Transaction",
        "Sale",
        "Invoice",
        "User",
        "Manager",
        "Branch",
        "Warehouse",
        "Supplier",
        "Stock",
        "System",
        "BulkOperation",
      ],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Optional for bulk operations
    },
    entityName: { type: String, required: false }, // Human readable name

    // Action details
    description: { type: String, required: true },
    details: {
      type: mongoose.Schema.Types.Mixed,
      required: false, // Flexible field for additional data
    },

    // For bulk operations
    bulkOperationDetails: {
      fileName: { type: String, required: false },
      totalRecords: { type: Number, required: false },
      successCount: { type: Number, required: false },
      errorCount: { type: Number, required: false },
      errors: [{ type: String }], // Array of error messages
    },

    // For inventory changes
    inventoryChanges: {
      previousStock: { type: Number, required: false },
      newStock: { type: Number, required: false },
      quantityChanged: { type: Number, required: false },
      previousPrice: { type: Number, required: false },
      newPrice: { type: Number, required: false },
      previousExpiry: { type: Date, required: false },
      newExpiry: { type: Date, required: false },
    },

    // For transactions
    transactionDetails: {
      transactionId: { type: String, required: false },
      totalAmount: { type: Number, required: false },
      paymentMethod: { type: String, required: false },
      customerName: { type: String, required: false },
      itemsCount: { type: Number, required: false },
    },

    // IP address and user agent for security
    ipAddress: { type: String, required: false },
    userAgent: { type: String, required: false },

    // Status of the action
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "PARTIAL"],
      default: "SUCCESS",
    },

    // Error information if action failed
    error: {
      message: { type: String, required: false },
      code: { type: String, required: false },
      stack: { type: String, required: false },
    },

    // Metadata
    tags: [{ type: String }], // For categorization and filtering
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },

    // Timestamps
    actionTimestamp: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    // Indexes for better query performance
    indexes: [
      { userId: 1, actionTimestamp: -1 },
      { action: 1, actionTimestamp: -1 },
      { entityType: 1, entityId: 1 },
      { branchId: 1, actionTimestamp: -1 },
      { actionTimestamp: -1 },
      { userRole: 1, actionTimestamp: -1 },
    ],
  }
);

// Pre-save middleware to update timestamps
AuditLogSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Static method to create audit log entries easily
AuditLogSchema.statics.logAction = function (data) {
  return this.create({
    userId: data.userId,
    userName: data.userName,
    userRole: data.userRole,
    branchId: data.branchId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    entityName: data.entityName,
    description: data.description,
    details: data.details,
    bulkOperationDetails: data.bulkOperationDetails,
    inventoryChanges: data.inventoryChanges,
    transactionDetails: data.transactionDetails,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    status: data.status || "SUCCESS",
    error: data.error,
    tags: data.tags || [],
    priority: data.priority || "MEDIUM",
  });
};

// Method to get audit trail for a specific entity
AuditLogSchema.statics.getEntityAuditTrail = function (
  entityType,
  entityId,
  limit = 100
) {
  return this.find({
    entityType: entityType,
    entityId: entityId,
  })
    .sort({ actionTimestamp: -1 })
    .limit(limit)
    .populate("userId", "name email role")
    .populate("branchId", "name");
};

// Method to get user activity
AuditLogSchema.statics.getUserActivity = function (userId, limit = 100) {
  return this.find({ userId: userId })
    .sort({ actionTimestamp: -1 })
    .limit(limit)
    .populate("entityId")
    .populate("branchId", "name");
};

// Method to get branch activity
AuditLogSchema.statics.getBranchActivity = function (branchId, limit = 100) {
  return this.find({ branchId: branchId })
    .sort({ actionTimestamp: -1 })
    .limit(limit)
    .populate("userId", "name email role")
    .populate("entityId");
};

export default mongoose.model("AuditLog", AuditLogSchema);
