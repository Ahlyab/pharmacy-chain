import React from 'react';
import { Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const stats = [
    {
      name: 'Products in Stock',
      value: '847',
      icon: Package,
      color: 'bg-blue-500',
      change: '+23 this week'
    },
    {
      name: 'Today\'s Sales',
      value: '42',
      icon: ShoppingCart,
      color: 'bg-green-500',
      change: '+8 from yesterday'
    },
    {
      name: 'Today\'s Revenue',
      value: '$1,247',
      icon: DollarSign,
      color: 'bg-purple-500',
      change: '+15% from yesterday'
    },
    {
      name: 'Low Stock Items',
      value: '12',
      icon: AlertTriangle,
      color: 'bg-orange-500',
      change: '3 critical'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Manager Dashboard</h2>
        <p className="text-gray-600">Downtown Branch Overview</p>
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
            <h3 className="text-lg font-medium text-gray-900">Recent Sales</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { customer: 'John Smith', items: '3 items', amount: '$45.97', time: '2 min ago' },
                { customer: 'Sarah Johnson', items: '2 items', amount: '$28.50', time: '15 min ago' },
                { customer: 'Mike Wilson', items: '1 item', amount: '$15.99', time: '32 min ago' }
              ].map((sale, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sale.customer}</p>
                    <p className="text-sm text-gray-500">{sale.items} • {sale.time}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{sale.amount}</span>
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
                { product: 'Paracetamol 500mg', stock: '5 units', status: 'Critical' },
                { product: 'Vitamin D3', stock: '8 units', status: 'Low' },
                { product: 'Cough Syrup', stock: '12 units', status: 'Low' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.product}</p>
                    <p className="text-sm text-gray-500">{item.stock} remaining</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.status === 'Critical' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">New Sale</span>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
            <Package className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <span className="text-sm font-medium text-gray-900">Add Stock</span>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <span className="text-sm font-medium text-gray-900">View Reports</span>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <span className="text-sm font-medium text-gray-900">Stock Alerts</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;