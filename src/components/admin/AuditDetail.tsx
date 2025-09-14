import React from 'react';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Building, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Package,
  Receipt,
  FileText,
  Tag,
  Globe,
  Monitor,
  Info
} from 'lucide-react';

interface AuditLog {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  userName: string;
  userRole: string;
  branchId?: {
    _id: string;
    name: string;
  };
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  details?: any;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionTimestamp: string;
  createdAt: string;
  updatedAt: string;
  ipAddress?: string;
  userAgent?: string;
  tags?: string[];
  inventoryChanges?: {
    previousStock?: number;
    newStock?: number;
    quantityChanged?: number;
    previousPrice?: number;
    newPrice?: number;
    previousExpiry?: string;
    newExpiry?: string;
  };
  transactionDetails?: {
    transactionId?: string;
    totalAmount?: number;
    paymentMethod?: string;
    customerName?: string;
    itemsCount?: number;
  };
  bulkOperationDetails?: {
    fileName?: string;
    totalRecords?: number;
    successCount?: number;
    errorCount?: number;
    errors?: string[];
  };
  error?: {
    message?: string;
    code?: string;
    stack?: string;
  };
}

interface AuditDetailProps {
  auditLog: AuditLog;
  onBack: () => void;
}

const AuditDetail: React.FC<AuditDetailProps> = ({ auditLog, onBack }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'PARTIAL':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'product':
      case 'inventory':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'transaction':
      case 'sale':
      case 'invoice':
        return <Receipt className="w-5 h-5 text-green-500" />;
      case 'user':
      case 'manager':
        return <User className="w-5 h-5 text-purple-500" />;
      case 'branch':
      case 'warehouse':
        return <Building className="w-5 h-5 text-orange-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const renderInventoryChanges = () => {
    if (!auditLog.inventoryChanges) return null;

    const changes = auditLog.inventoryChanges;
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
          <Package className="w-5 h-5 mr-2" />
          Inventory Changes
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {changes.previousStock !== undefined && changes.newStock !== undefined && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Stock Changes</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Previous Stock:</span>
                  <span className="font-medium">{changes.previousStock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">New Stock:</span>
                  <span className="font-medium">{changes.newStock}</span>
                </div>
                {changes.quantityChanged && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity Changed:</span>
                    <span className={`font-medium ${changes.quantityChanged > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {changes.quantityChanged > 0 ? '+' : ''}{changes.quantityChanged}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          {changes.previousPrice !== undefined && changes.newPrice !== undefined && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Price Changes</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Previous Price:</span>
                  <span className="font-medium">#${changes.previousPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">New Price:</span>
                  <span className="font-medium">#${changes.newPrice}</span>
                </div>
              </div>
            </div>
          )}
          {changes.previousExpiry && changes.newExpiry && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Expiry Changes</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Previous Expiry:</span>
                  <span className="font-medium">{formatDate(changes.previousExpiry)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">New Expiry:</span>
                  <span className="font-medium">{formatDate(changes.newExpiry)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTransactionDetails = () => {
    if (!auditLog.transactionDetails) return null;

    const details = auditLog.transactionDetails;
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
          <Receipt className="w-5 h-5 mr-2" />
          Transaction Details
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {details.transactionId && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Transaction ID</h5>
              <p className="text-sm text-gray-600 font-mono">{details.transactionId}</p>
            </div>
          )}
          {details.totalAmount && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Total Amount</h5>
              <p className="text-sm text-gray-600 font-medium">#${details.totalAmount}</p>
            </div>
          )}
          {details.paymentMethod && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Payment Method</h5>
              <p className="text-sm text-gray-600">{details.paymentMethod}</p>
            </div>
          )}
          {details.customerName && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Customer Name</h5>
              <p className="text-sm text-gray-600">{details.customerName}</p>
            </div>
          )}
          {details.itemsCount && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Items Count</h5>
              <p className="text-sm text-gray-600">{details.itemsCount}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBulkOperationDetails = () => {
    if (!auditLog.bulkOperationDetails) return null;

    const details = auditLog.bulkOperationDetails;
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Bulk Operation Details
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {details.fileName && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">File Name</h5>
              <p className="text-sm text-gray-600">{details.fileName}</p>
            </div>
          )}
          {details.totalRecords && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Total Records</h5>
              <p className="text-sm text-gray-600">{details.totalRecords}</p>
            </div>
          )}
          {details.successCount && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Success Count</h5>
              <p className="text-sm text-green-600 font-medium">{details.successCount}</p>
            </div>
          )}
          {details.errorCount && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Error Count</h5>
              <p className="text-sm text-red-600 font-medium">{details.errorCount}</p>
            </div>
          )}
        </div>
        {details.errors && details.errors.length > 0 && (
          <div className="mt-4 bg-white p-3 rounded border">
            <h5 className="font-medium text-gray-900 mb-2">Errors</h5>
            <ul className="text-sm text-red-600 space-y-1">
              {details.errors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderErrorDetails = () => {
    if (!auditLog.error) return null;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
          <XCircle className="w-5 h-5 mr-2" />
          Error Details
        </h4>
        <div className="space-y-3">
          {auditLog.error.message && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Error Message</h5>
              <p className="text-sm text-red-600">{auditLog.error.message}</p>
            </div>
          )}
          {auditLog.error.code && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Error Code</h5>
              <p className="text-sm text-gray-600 font-mono">{auditLog.error.code}</p>
            </div>
          )}
          {auditLog.error.stack && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Stack Trace</h5>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                {auditLog.error.stack}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdditionalDetails = (details: any) => {
    // Check if it's inventory-related details with stock changes
    if (details.previousStock !== undefined || details.newStock !== undefined || details.changes) {
      return (
        <div className="space-y-6">
          {/* Stock Changes */}
          {(details.previousStock !== undefined || details.newStock !== undefined) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Stock Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {details.previousStock !== undefined && (
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900 mb-2">Previous Stock</h5>
                    <p className="text-2xl font-bold text-gray-700">{details.previousStock}</p>
                  </div>
                )}
                {details.newStock !== undefined && (
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900 mb-2">New Stock</h5>
                    <p className="text-2xl font-bold text-blue-600">{details.newStock}</p>
                  </div>
                )}
                {details.quantityChanged !== undefined && (
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900 mb-2">Quantity Changed</h5>
                    <p className={`text-2xl font-bold ${details.quantityChanged > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {details.quantityChanged > 0 ? '+' : ''}{details.quantityChanged}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Price Information */}
          {(details.previousPrice !== undefined || details.newPrice !== undefined) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                <Receipt className="w-5 h-5 mr-2" />
                Price Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {details.previousPrice !== undefined && (
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900 mb-2">Previous Price</h5>
                    <p className="text-2xl font-bold text-gray-700">#${details.previousPrice}</p>
                  </div>
                )}
                {details.newPrice !== undefined && (
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900 mb-2">New Price</h5>
                    <p className="text-2xl font-bold text-green-600">#${details.newPrice}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Min Stock Information */}
          {(details.previousMinStock !== undefined || details.newMinStock !== undefined) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Minimum Stock Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {details.previousMinStock !== undefined && (
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900 mb-2">Previous Min Stock</h5>
                    <p className="text-2xl font-bold text-gray-700">{details.previousMinStock}</p>
                  </div>
                )}
                {details.newMinStock !== undefined && (
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900 mb-2">New Min Stock</h5>
                    <p className="text-2xl font-bold text-yellow-600">{details.newMinStock}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Expiry Information */}
          {(details.previousExpiry || details.newExpiry) && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Expiry Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {details.previousExpiry && (
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900 mb-2">Previous Expiry</h5>
                    <p className="text-sm font-medium text-gray-700">{formatDate(details.previousExpiry)}</p>
                  </div>
                )}
                {details.newExpiry && (
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900 mb-2">New Expiry</h5>
                    <p className="text-sm font-medium text-purple-600">{formatDate(details.newExpiry)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Changes Summary */}
          {details.changes && Array.isArray(details.changes) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Fields Modified
              </h4>
              <div className="bg-white p-4 rounded border">
                <div className="flex flex-wrap gap-2">
                  {details.changes.map((field: string, index: number) => (
                    <span 
                      key={index}
                      className="inline-flex px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full"
                    >
                      {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  <strong>{details.changes.length}</strong> field{details.changes.length !== 1 ? 's' : ''} modified
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // For other types of details, show a formatted JSON view
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Raw Data
        </h4>
        <pre className="text-sm text-gray-600 whitespace-pre-wrap overflow-x-auto bg-white p-4 rounded border">
          {JSON.stringify(details, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Audit Logs
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Log Details</h1>
            <p className="text-gray-600">Complete audit trail information</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusIcon(auditLog.status)}
          <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getPriorityColor(auditLog.priority)}`}>
            {auditLog.priority}
          </span>
        </div>
      </div>

      {/* Main Information */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Timestamp</p>
                  <p className="text-sm text-gray-900">{formatDate(auditLog.actionTimestamp)}</p>
                </div>
              </div>
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">User</p>
                  <p className="text-sm text-gray-900">{auditLog.userName}</p>
                  <p className="text-xs text-gray-500">{auditLog.userRole}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Action</p>
                  <p className="text-sm text-gray-900">{formatAction(auditLog.action)}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                {getEntityIcon(auditLog.entityType)}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Entity Type</p>
                  <p className="text-sm text-gray-900">{auditLog.entityType}</p>
                  {auditLog.entityName && (
                    <p className="text-xs text-gray-500">{auditLog.entityName}</p>
                  )}
                </div>
              </div>
              {auditLog.branchId && (
                <div className="flex items-center">
                  <Building className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Branch</p>
                    <p className="text-sm text-gray-900">{auditLog.branchId.name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center">
                <Info className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-sm text-gray-900">{auditLog.status}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {auditLog.ipAddress && (
                <div className="flex items-center">
                  <Globe className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">IP Address</p>
                    <p className="text-sm text-gray-900 font-mono">{auditLog.ipAddress}</p>
                  </div>
                </div>
              )}
              {auditLog.userAgent && (
                <div className="flex items-center">
                  <Monitor className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">User Agent</p>
                    <p className="text-xs text-gray-600 break-all">{auditLog.userAgent}</p>
                  </div>
                </div>
              )}
              {auditLog.tags && auditLog.tags.length > 0 && (
                <div className="flex items-start">
                  <Tag className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tags</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {auditLog.tags.map((tag, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Description</h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-gray-700">{auditLog.description}</p>
        </div>
      </div>

      {/* Additional Details */}
      {auditLog.details && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Additional Details</h2>
          </div>
          <div className="px-6 py-4">
            {renderAdditionalDetails(auditLog.details)}
          </div>
        </div>
      )}

      {/* Specialized Details */}
      {renderInventoryChanges()}
      {renderTransactionDetails()}
      {renderBulkOperationDetails()}
      {renderErrorDetails()}

      {/* Timestamps */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Timestamps</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Action Timestamp</p>
              <p className="text-sm text-gray-900">{formatDate(auditLog.actionTimestamp)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Created At</p>
              <p className="text-sm text-gray-900">{formatDate(auditLog.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Updated At</p>
              <p className="text-sm text-gray-900">{formatDate(auditLog.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditDetail;
