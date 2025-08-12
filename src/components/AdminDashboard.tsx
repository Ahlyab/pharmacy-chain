import React, { useState, useEffect } from 'react';
import GreenProgressBar from './GreenProgressBar';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BranchManagement from './admin/BranchManagement';
import ManagerManagement from './admin/ManagerManagement';
import InventoryOverview from './admin/InventoryOverview';
import TransactionHistory from './admin/TransactionHistory';
import Dashboard from './admin/Dashboard';

const AdminDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: 'BarChart3' },
    { name: 'Branches', path: '/admin/branches', icon: 'Building2' },
    { name: 'Managers', path: '/admin/managers', icon: 'Users' },
    { name: 'Inventory Overview', path: '/admin/inventory', icon: 'Package' },
    { name: 'Transactions', path: '/admin/transactions', icon: 'Receipt' },
  ];

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

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
              <Route path="/transactions" element={<TransactionHistory />} />
              <Route path="*" element={<Navigate to="/admin" />} />
            </Routes>
          </GreenProgressBar>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;