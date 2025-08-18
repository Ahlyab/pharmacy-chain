import React, { useEffect, useState } from 'react';
import { Building2, Users, Package, TrendingUp } from 'lucide-react';

type Branch = {
  name: string;
  address: string;
  phone: string;
  manager: string;
  status: string;
};
type Manager = {
  name: string;
  email: string;
  phone: string;
  branch: string;
  status: string;
};
type Product = {
  name: string;
  stock: number;
  minStock: number;
};
type Transaction = {
  date: string;
  totalAmount: number;
};

const Dashboard: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/branch').then(res => res.json()),
      fetch('/manager').then(res => res.json()),
      fetch('/inventory').then(res => res.json()),
      fetch('/transaction').then(res => res.json()),
    ]).then(([branchData, managerData, productData, transactionData]) => {
      setBranches(branchData || []);
      setManagers(managerData || []);
      setProducts(productData || []);
      setTransactions(transactionData || []);
      setLoading(false);
    });
  }, []);

  // Calculate monthly revenue
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyRevenue = transactions
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

  const stats = [
    {
      name: 'Total Branches',
      value: loading ? '...' : branches.length,
      icon: Building2,
      color: 'bg-blue-500',
      change: ''
    },
    {
      name: 'Active Managers',
      value: loading ? '...' : managers.filter(m => m.status === 'Active').length,
      icon: Users,
      color: 'bg-green-500',
      change: ''
    },
    {
      name: 'Total Products',
      value: loading ? '...' : products.length,
      icon: Package,
      color: 'bg-purple-500',
      change: ''
    },
    {
      name: 'Monthly Revenue',
      value: loading ? '...' : `$${monthlyRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: ''
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
              {loading ? (
                <p>Loading...</p>
              ) : (
                branches.slice(-3).reverse().map((branch, index) => (
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
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Low Stock Alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {loading ? (
                <p>Loading...</p>
              ) : (
                products.filter(p => p.stock <= p.minStock).slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">Stock: {item.stock}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      {item.stock} units
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;