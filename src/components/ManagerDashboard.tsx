import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import InventoryManagement from './manager/InventoryManagement';
import Billing from './manager/Billing';
import POS from './manager/POS';
import Transactions from './manager/Transactions';
import Dashboard from './manager/Dashboard';

const ManagerDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/manager', icon: 'BarChart3' },
    { name: 'Inventory', path: '/manager/inventory', icon: 'Package' },
    { name: 'POS', path: '/manager/pos', icon: 'ShoppingCart' },
    { name: 'Billing', path: '/manager/billing', icon: 'FileText' },
    { name: 'Transactions', path: '/manager/transactions', icon: 'Receipt' },
  ];



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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<InventoryManagement />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="*" element={<Navigate to="/manager" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default ManagerDashboard;