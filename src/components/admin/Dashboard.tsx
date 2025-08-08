import React from 'react';
import { Building2, Users, Package, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const stats = [
    {
      name: 'Total Branches',
      value: '12',
      icon: Building2,
      color: 'bg-blue-500',
      change: '+2 this month'
    },
    {
      name: 'Active Managers',
      value: '12',
      icon: Users,
      color: 'bg-green-500',
      change: '+1 this week'
    },
    {
      name: 'Total Products',
      value: '2,847',
      icon: Package,
      color: 'bg-purple-500',
      change: '+127 this month'
    },
    {
      name: 'Monthly Revenue',
      value: '$45,231',
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: '+12% from last month'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <p className="text-gray-600">Overview of your pharmacy chain</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">{stat.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Branches</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { name: 'Downtown Branch', manager: 'John Smith', status: 'Active' },
                { name: 'Mall Branch', manager: 'Sarah Johnson', status: 'Active' },
                { name: 'Airport Branch', manager: 'Mike Wilson', status: 'Pending' }
              ].map((branch, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{branch.name}</p>
                    <p className="text-sm text-gray-500">Manager: {branch.manager}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    branch.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {branch.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Low Stock Alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { product: 'Paracetamol 500mg', branch: 'Downtown', stock: '5 units' },
                { product: 'Amoxicillin 250mg', branch: 'Mall Branch', stock: '8 units' },
                { product: 'Vitamin D3', branch: 'Airport Branch', stock: '3 units' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.product}</p>
                    <p className="text-sm text-gray-500">{item.branch}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    {item.stock}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;