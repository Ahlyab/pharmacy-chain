# Audit Logging System

This document explains how to use the comprehensive audit logging system for tracking all actions in your pharmacy management system.

## Overview

The audit logging system records detailed information about:
- **Who** performed an action (user ID, name, role, branch)
- **What** action was performed (create, update, delete, etc.)
- **When** it happened (timestamp)
- **What entity** was affected (product, transaction, user, etc.)
- **Details** of the action (changes, quantities, amounts, etc.)
- **Security information** (IP address, user agent)

## Schema Structure

### AuditLog Model

The `AuditLog` model captures all the necessary information:

```javascript
{
  // User Information
  userId: ObjectId,           // Who performed the action
  userName: String,           // Cached user name
  userRole: String,           // Admin, Manager, Sale Assistant
  branchId: ObjectId,         // Branch where action occurred
  
  // Action Information
  action: String,             // What was done (PRODUCT_CREATED, etc.)
  entityType: String,         // What entity was affected
  entityId: ObjectId,         // ID of the affected entity
  entityName: String,         // Human-readable name
  
  // Details
  description: String,        // Human-readable description
  details: Mixed,             // Flexible additional data
  
  // Specialized Fields
  bulkOperationDetails: {},   // For bulk operations
  inventoryChanges: {},       // For inventory changes
  transactionDetails: {},     // For transactions
  
  // Security & Metadata
  ipAddress: String,          // Client IP
  userAgent: String,          // Browser/client info
  status: String,             // SUCCESS, FAILED, PARTIAL
  priority: String,           // LOW, MEDIUM, HIGH, CRITICAL
  tags: [String],             // For categorization
  
  // Timestamps
  actionTimestamp: Date,      // When action occurred
  createdAt: Date,            // When log was created
  updatedAt: Date             // When log was last updated
}
```

## Available Actions

### Product/Inventory Actions
- `PRODUCT_CREATED` - New product added
- `PRODUCT_UPDATED` - Product modified
- `PRODUCT_DELETED` - Product removed
- `STOCK_ADDED` - Stock quantity increased
- `STOCK_UPDATED` - Stock quantity changed
- `STOCK_DELETED` - Stock quantity decreased
- `INVENTORY_IMPORTED` - Bulk import
- `INVENTORY_EXPORTED` - Bulk export

### Transaction Actions
- `SALE_CREATED` - New sale
- `SALE_UPDATED` - Sale modified
- `SALE_CANCELLED` - Sale cancelled
- `SALE_RETURNED` - Sale returned
- `INVOICE_CREATED` - Invoice generated
- `INVOICE_UPDATED` - Invoice modified
- `INVOICE_DELETED` - Invoice removed

### User Management
- `USER_CREATED` - New user
- `USER_UPDATED` - User modified
- `USER_DELETED` - User removed
- `USER_LOGIN` - User logged in
- `USER_LOGOUT` - User logged out

### System Actions
- `SYSTEM_BACKUP` - System backup
- `SYSTEM_RESTORE` - System restore
- `SETTINGS_UPDATED` - Settings changed
- `REPORT_GENERATED` - Report created

## Usage Examples

### 1. Basic Inventory Action Logging

```javascript
import { logInventoryAction } from '../utils/auditLogger.js';

// When creating a new product
await logInventoryAction(
  req,
  "PRODUCT_CREATED",
  product._id,
  product.name,
  {
    category: product.category,
    stock: product.stock,
    price: product.price,
    supplier: product.supplier
  }
);

// When updating a product
await logInventoryAction(
  req,
  "PRODUCT_UPDATED",
  product._id,
  product.name,
  {
    previousStock: oldStock,
    newStock: newStock,
    quantityChanged: newStock - oldStock,
    changes: Object.keys(updateData)
  }
);
```

### 2. Transaction Logging

```javascript
import { logTransactionAction } from '../utils/auditLogger.js';

// When creating a sale
await logTransactionAction(
  req,
  "SALE_CREATED",
  transaction._id,
  `Sale #${transaction.transactionId}`,
  {
    transactionId: transaction.transactionId,
    totalAmount: transaction.totalAmount,
    paymentMethod: transaction.paymentMethod,
    customerName: transaction.customerName,
    itemsCount: transaction.items.length
  }
);
```

### 3. Bulk Operation Logging

```javascript
import { logBulkOperation } from '../utils/auditLogger.js';

// When importing products from Excel
await logBulkOperation(
  req,
  "BULK_UPLOAD",
  fileName,
  totalRecords,
  successCount,
  errorCount,
  errorMessages
);
```

### 4. Custom Action Logging

```javascript
import { logCustomAction } from '../utils/auditLogger.js';

// For any custom action
await logCustomAction(
  req,
  "CUSTOM_ACTION",
  "CustomEntity",
  entityId,
  entityName,
  "Description of what happened",
  { customData: "value" }
);
```

### 5. Failed Action Logging

```javascript
import { logFailedAction } from '../utils/auditLogger.js';

try {
  // Perform some action
  await someOperation();
} catch (error) {
  // Log the failure
  await logFailedAction(
    req,
    "OPERATION_FAILED",
    "EntityType",
    entityId,
    entityName,
    "Description of what failed",
    error,
    { additionalContext: "data" }
  );
  
  // Re-throw or handle error
  throw error;
}
```

## API Endpoints

### Get Entity Audit Trail
```
GET /api/audit/entity/:entityType/:entityId
```
Returns audit trail for a specific entity (e.g., product, transaction).

### Get User Activity
```
GET /api/audit/user/:userId
```
Returns all actions performed by a specific user.

### Get Branch Activity
```
GET /api/audit/branch/:branchId
```
Returns all actions performed in a specific branch.

### Get System Audit Logs
```
GET /api/audit/system
```
Returns system-wide audit logs with filtering options.

### Get Audit Statistics
```
GET /api/audit/statistics
```
Returns aggregated statistics about audit logs.

### Export Audit Logs
```
GET /api/audit/export
```
Exports audit logs (currently returns JSON, CSV/Excel to be implemented).

## Query Parameters

Most endpoints support these query parameters:

- `limit` - Number of records to return (default: 100)
- `page` - Page number for pagination (default: 1)
- `action` - Filter by specific action type
- `entityType` - Filter by entity type
- `userRole` - Filter by user role
- `branchId` - Filter by branch
- `status` - Filter by action status
- `priority` - Filter by priority level
- `startDate` - Filter from date (ISO string)
- `endDate` - Filter to date (ISO string)
- `tags` - Filter by tags (comma-separated)

## Integration Examples

### 1. Middleware Integration

You can create middleware to automatically log certain actions:

```javascript
// Middleware to log all inventory changes
const logInventoryChanges = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (req.method === 'POST' && req.path.includes('/inventory')) {
      // Log creation
      logInventoryAction(req, "PRODUCT_CREATED", data._id, data.name, data);
    } else if (req.method === 'PATCH' && req.path.includes('/inventory')) {
      // Log update
      logInventoryAction(req, "PRODUCT_UPDATED", req.params.id, data.name, data);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};
```

### 2. Controller Integration

Update your existing controllers to include audit logging:

```javascript
// Before (no audit logging)
router.post("/inventory", async (req, res) => {
  const inventory = new Inventory(req.body);
  await inventory.save();
  res.status(201).json(inventory);
});

// After (with audit logging)
router.post("/inventory", async (req, res) => {
  try {
    const inventory = new Inventory(req.body);
    await inventory.save();
    
    // Log the action
    await logInventoryAction(
      req,
      "PRODUCT_CREATED",
      inventory._id,
      inventory.name,
      {
        category: inventory.category,
        stock: inventory.stock,
        price: inventory.price
      }
    );
    
    res.status(201).json(inventory);
  } catch (error) {
    // Log failed action
    await logFailedAction(
      req,
      "PRODUCT_CREATED",
      "Inventory",
      null,
      req.body.name || "Unknown",
      "Failed to create inventory item",
      error,
      req.body
    );
    
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Error Handling

Always log failed actions to maintain a complete audit trail:

```javascript
try {
  // Perform action
  await someOperation();
  
  // Log success
  await logCustomAction(req, "ACTION_SUCCESS", "Entity", id, name, "Action completed");
} catch (error) {
  // Log failure
  await logFailedAction(req, "ACTION_FAILED", "Entity", id, name, "Action failed", error);
  
  // Handle error
  res.status(500).json({ error: error.message });
}
```

## Best Practices

### 1. Always Log Actions
- Log both successful and failed actions
- Include relevant context and details
- Use appropriate action types and priorities

### 2. Performance Considerations
- Audit logging is asynchronous and won't block operations
- Use appropriate indexes for query performance
- Consider archiving old logs for performance

### 3. Security
- Never log sensitive information (passwords, credit card numbers)
- Log IP addresses and user agents for security monitoring
- Use appropriate access controls for audit log endpoints

### 4. Data Retention
- Implement log rotation and archiving
- Consider compliance requirements for data retention
- Use the cleanup endpoint to remove old logs

### 5. Monitoring
- Set up alerts for critical actions
- Monitor failed actions for security issues
- Use statistics to understand system usage patterns

## Troubleshooting

### Common Issues

1. **Audit logs not being created**
   - Check that the user object is attached to `req.user`
   - Verify that the audit logger functions are being called
   - Check database connection and permissions

2. **Performance issues**
   - Ensure proper indexes are created
   - Consider pagination for large result sets
   - Monitor query performance

3. **Missing data**
   - Verify that all required fields are provided
   - Check that entity references are valid
   - Ensure proper error handling

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG_AUDIT=true
```

This will log additional information about audit operations.

## Future Enhancements

- CSV/Excel export functionality
- Real-time audit log streaming
- Advanced analytics and reporting
- Integration with external logging systems
- Automated alerting for suspicious activities
- Compliance reporting tools
