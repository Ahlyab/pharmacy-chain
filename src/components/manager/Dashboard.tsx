import React from 'react';
import { useState, useEffect } from 'react';
import { Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import GreenProgressBar from '../GreenProgressBar';

const Dashboard: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        const productsResponse = await fetch('http://localhost:5000/api/inventory');
        if (!productsResponse.ok) throw new Error('Failed to fetch inventory');
        const productsData = await productsResponse.json();
        setProducts(productsData);

        // Fetch sales data
        const salesResponse = await fetch('http://localhost:5000/api/sales/recent');
        if (salesResponse.ok) {
          const salesData = await salesResponse.json();
          setSales(salesData);
        } else {
          setSales([]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate stats
  const criticalProducts = products.filter(p => p.stock === 0);
  const nonCriticalProducts = products.filter(p => p.stock > 0);
  const totalNonCriticalProducts = nonCriticalProducts.length;
  const lowStockItems = products.filter(p => p.stock <= p.minStock && p.stock > 0);
  const lowStockCount = lowStockItems.length;

  // Calculate 24-hour sales
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last24HoursSales = sales.filter(sale => new Date(sale.date) >= twentyFourHoursAgo);
  const totalSalesCount = last24HoursSales.length;
  const totalRevenue24h = last24HoursSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  
  // Get last 10 recent sales (sorted by date, most recent first)
  const recentSales = sales
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  if (loading) {
    return <GreenProgressBar loading={true}>{null}</GreenProgressBar>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  // Dynamic stats for products in stock and low stock
  const stats = [
    {
      name: 'Products in Stock',
      value: totalNonCriticalProducts,
      icon: Package,
      color: 'bg-blue-500',
      change: `${criticalProducts.length} critical excluded`
    },
    {
      name: "24 Hours Sales",
      value: totalSalesCount,
      icon: ShoppingCart,
      color: 'bg-green-500',
      change: `Total sales: ${sales.length}`
    },
    {
      name: "24 Hours Revenue",
      value: `$${totalRevenue24h.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-purple-500',
      change: `From ${totalSalesCount} sales`
    },
    {
      name: 'Low Stock Items',
      value: lowStockCount,
      icon: AlertTriangle,
      color: 'bg-orange-500',
      change: `${criticalProducts.length} critical`
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
            <h3 className="text-lg font-medium text-gray-900">Last 10 Recent Sales</h3>
          </div>
          <div className="p-6">
            <div className="h-96 overflow-y-auto space-y-4">
              {recentSales.length === 0 ? (
                <div className="text-gray-500">No recent sales found.</div>
              ) : (
                recentSales.map((sale) => {
                  const saleDate = new Date(sale.date);
                  const timeAgo = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60));
                  
                  // Count total items and create product display
                  const totalItems = sale.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
                  const itemsText = `${totalItems} item${totalItems > 1 ? 's' : ''}`;
                  
                  // Create product names string (handle null productId)
                  const productNames = sale.items
                    .map((item: any) => {
                      const productName = item.productId ? item.productId.name : 'Unknown Product';
                      return `${productName} (${item.quantity})`;
                    })
                    .join(', ');
                  
                  const displayName = sale.customerName || 'Walk-in Customer';
                  const paymentMethod = sale.paymentMethod ? ` • ${sale.paymentMethod.toUpperCase()}` : '';
                  
                  return (
                    <div key={sale._id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{displayName}</p>
                        <p className="text-sm text-gray-500">
                          {itemsText} • {timeAgo < 60 ? `${timeAgo} min ago` : timeAgo < 1440 ? `${Math.floor(timeAgo / 60)}h ago` : `${Math.floor(timeAgo / 1440)}d ago`}{paymentMethod}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-xs" title={productNames}>
                          {productNames}
                        </p>
                        {sale.cashierName && (
                          <p className="text-xs text-gray-400">Cashier: {sale.cashierName}</p>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <span className="text-sm font-medium text-gray-900">${sale.totalAmount.toFixed(2)}</span>
                        <p className="text-xs text-gray-400">ID: {sale.transactionId.slice(-6)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Low Stock Alerts</h3>
          </div>
          <div className="p-6">
            <div className="h-96 overflow-y-auto space-y-4">
              {lowStockItems.length === 0 ? (
                <div className="text-gray-500">No low stock items.</div>
              ) : (
                lowStockItems.map((item, index) => (
                  <div key={item._id || item.id || index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.stock} remaining • Min: {item.minStock}</p>
                      <p className="text-xs text-gray-400">Category: {item.category}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {item.stock === 0 ? 'Critical' : 'Low'}
                    </span>
                  </div>
                ))
              )}
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