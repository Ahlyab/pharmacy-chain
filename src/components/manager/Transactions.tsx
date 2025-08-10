import React, { useState, useEffect } from 'react';
import { Search, Calendar, DollarSign, Receipt, TrendingUp } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  customer: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  paymentMethod: string;
  status: 'Completed' | 'Pending' | 'Refunded';
}

const Transactions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [dateRange, setDateRange] = useState('7');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [billToPrint, setBillToPrint] = useState<Transaction | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
  const BASE_URL = 'http://localhost:5000/api';
  const res = await fetch(`${BASE_URL}/transaction`);
        if (!res.ok) throw new Error('Failed to fetch transactions');
        const data = await res.json();
        setTransactions(data.transactions || data); // adjust if API returns differently
      } catch (err: any) {
        setError(err.message || 'Error fetching transactions');
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const statuses = ['All', 'Completed', 'Pending', 'Refunded'];

  // Filter by search, status, and date range
  const now = new Date();
  const filteredTransactions = transactions.filter(transaction => {
    // Defensive: skip if transaction or required fields are missing
    if (!transaction || !transaction.id || !transaction.customer) return false;
    if (hiddenIds.includes(transaction.id)) return false;
    const matchesSearch = transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || transaction.status === selectedStatus;
    // Date filter
    const txnDate = new Date(transaction.date);
    const days = parseInt(dateRange, 10);
    const dateLimit = new Date(now);
    dateLimit.setDate(now.getDate() - days);
    const matchesDate = txnDate >= dateLimit;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Refunded':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalRevenue = filteredTransactions
    .filter(t => t.status === 'Completed')
    .reduce((sum, t) => sum + t.total, 0);

  const completedCount = filteredTransactions.filter(t => t.status === 'Completed').length;
  const avgTransaction = totalRevenue / Math.max(completedCount, 1);

  // Completed today
  const todayStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const completedToday = filteredTransactions.filter(t => t.status === 'Completed' && t.date.slice(0, 10) === todayStr).length;

  const stats = [
    {
      name: 'Total Transactions',
      value: filteredTransactions.length.toString(),
      icon: Receipt,
      color: 'bg-blue-500'
    },
    {
      name: 'Total Revenue',
      value: `$${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      name: 'Avg Transaction',
      value: `$${avgTransaction.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-purple-500'
    },
    {
      name: 'Completed Today',
      value: completedToday.toString(),
      icon: Calendar,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
        <p className="text-gray-600">View and manage all transactions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Loading and Error States */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading transactions...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-500">{error}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {transaction.items.length} items
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.items.map(item => item.name).join(', ').substring(0, 50)}
                        {transaction.items.map(item => item.name).join(', ').length > 50 && '...'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${transaction.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.paymentMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                      <button
                        className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                        onClick={() => setBillToPrint(transaction)}
                      >
                        Download Bill
                      </button>
                      <button
                        className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-400"
                        onClick={() => setHiddenIds(ids => [...ids, transaction.id])}
                      >
                        Hide
                      </button>
                    </td>
                  </tr>
                ))}
      {/* Bill Print Modal */}
      {billToPrint && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative print:w-full print:max-w-full">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setBillToPrint(null)}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-2 text-center">{billToPrint.customer}</h2>
            <div className="text-center text-xs text-gray-500 mb-2">Transaction ID: {billToPrint.id}</div>
            <div className="mb-2 text-xs text-gray-500">Date: {billToPrint.date}</div>
            <table className="w-full text-xs mb-4">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Product</th>
                  <th className="text-right py-1">Price</th>
                  <th className="text-right py-1">Qty</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {billToPrint.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    <td className="text-right">${item.price.toFixed(2)}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between font-bold text-base mb-2">
              <span>Total:</span>
              <span>${billToPrint.total.toFixed(2)}</span>
            </div>
            <div className="mb-2 text-xs">Payment Method: <span className="font-semibold">{billToPrint.paymentMethod}</span></div>
            <div className="text-center mt-4">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 print:hidden"
                onClick={() => {
                  window.print();
                  setBillToPrint(null);
                }}
              >
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;