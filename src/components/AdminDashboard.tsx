import React, { useState, useEffect } from 'react';
import GreenProgressBar from './GreenProgressBar';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BranchManagement from './admin/BranchManagement';
import ManagerManagement from './admin/ManagerManagement';
import InventoryOverview from './admin/InventoryOverview';
import AdminInventoryManagement from './admin/AdminInventoryManagement';
import TransactionHistory from './admin/TransactionHistory';
import Dashboard from './admin/Dashboard';
import SupplierManagement from './admin/SupplierManagement';
import WarehouseManagement from './admin/WarehouseManagement';
import AuditManagement from './admin/AuditManagement';
import Report from './admin/Report';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();

  console.log('AdminDashboard - User:', user);
  console.log('AdminDashboard - Loading:', authLoading);
  console.log('AdminDashboard - Role:', user?.role);

  const menuItems = [
      { name: 'Dashboard', path: '/admin', icon: 'BarChart3' },
      { name: 'Branches', path: '/admin/branches', icon: 'Building2' },
      { name: 'Users & Permissions', path: '/admin/managers', icon: 'Users' },
      { name: 'Inventory Overview', path: '/admin/inventory', icon: 'Package' },
      { name: 'Branch Inventory', path: '/admin/branch-inventory', icon: 'Package' },
      { name: 'Transactions', path: '/admin/transactions', icon: 'Receipt' },
      { name: 'Suppliers', path: '/admin/suppliers', icon: 'ShoppingCart' },
      { name: 'Warehouse', path: '/admin/warehouse', icon: 'FileText' },
      { name: 'Report', path: '/admin/report', icon: 'BarChart3' },
      { name: 'Audit Logs', path: '/admin/audit', icon: 'Shield' },
    ];

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // If user is not available or not an admin, show loading or redirect
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role.toLowerCase() !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        menuItems={menuItems} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
          <GreenProgressBar loading={loading}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/branches" element={<BranchManagement />} />
              <Route path="/managers" element={<ManagerManagement />} />
              <Route path="/inventory" element={<InventoryOverview />} />
              <Route path="/branch-inventory" element={<AdminInventoryManagement />} />
              <Route path="/transactions" element={<TransactionHistory />} />
              <Route path="/suppliers" element={<SupplierManagement />} />
              <Route path="/warehouse" element={<WarehouseManagement />} />
              <Route path="/report" element={<Report />} />
              <Route path="/audit" element={<AuditManagement />} />
              <Route path="*" element={<Navigate to="/admin" />} />
            </Routes>
          </GreenProgressBar>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;