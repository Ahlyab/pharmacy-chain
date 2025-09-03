import React, { useState } from 'react';
import AuditLogs from './AuditLogs';
import AuditDetail from './AuditDetail';

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

const AuditManagement: React.FC = () => {
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  const handleViewDetails = (auditLog: AuditLog) => {
    setSelectedAuditLog(auditLog);
  };

  const handleBackToList = () => {
    setSelectedAuditLog(null);
  };

  if (selectedAuditLog) {
    return <AuditDetail auditLog={selectedAuditLog} onBack={handleBackToList} />;
  }

  return <AuditLogs onViewDetails={handleViewDetails as unknown as any} />;
};

export default AuditManagement;
