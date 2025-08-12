import GreenProgressBar from '../GreenProgressBar';
import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { Search, FileText, Download, Eye } from 'lucide-react';
import { VITE_BASE_URL, VITE_BASE_URL_VERCEL, VITE_IS_VERCEL } from '../../data';

interface Bill {
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
  status: 'Paid' | 'Pending' | 'Refunded';
}

const Billing: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [dateRange, setDateRange] = useState('7');
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billToView, setBillToView] = useState<Bill | null>(null); // for view/print
  const [billToDownload, setBillToDownload] = useState<Bill | null>(null); // for download

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      setError(null);
      try {
        const BASE_URL = VITE_IS_VERCEL ? VITE_BASE_URL_VERCEL : VITE_BASE_URL;
        const res = await fetch(`${BASE_URL}/transaction`);
        if (!res.ok) throw new Error('Failed to fetch bills');
        const data = await res.json();
        // Map backend status to Bill status
        const mapped = (data.transactions || data).map((t: any) => ({
          id: t.id,
          date: t.date,
          customer: t.customer,
          items: t.items,
          total: t.total,
          paymentMethod: t.paymentMethod,
          status: t.status === 'Completed' ? 'Paid' : (t.status || 'Pending'),
        }));
        setBills(mapped);
      } catch (err: any) {
        setError(err.message || 'Error fetching bills');
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  const statuses = ['All', 'Paid', 'Pending', 'Refunded'];

  // Filter by search, status, and date range
  const now = new Date();
  const filteredBills = bills
    .filter(bill => {
      if (!bill || !bill.id || !bill.customer) return false;
      const matchesSearch = bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.customer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === 'All' || bill.status === selectedStatus;
      // Date filter
      const txnDate = new Date(bill.date);
      const days = parseInt(dateRange, 10);
      const dateLimit = new Date(now);
      dateLimit.setDate(now.getDate() - days);
      const matchesDate = txnDate >= dateLimit;
      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Refunded':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Payment method badge color
  const getPaymentColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'bg-blue-100 text-blue-800';
      case 'card':
      case 'credit card':
        return 'bg-purple-100 text-purple-800';
      case 'upi':
        return 'bg-green-100 text-green-800';
      case 'wallet':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewBill = (bill: Bill) => {
    setBillToView(bill);
  };

  const handleDownloadBill = (bill: Bill) => {
    setBillToDownload(bill);
  };

  const handleDownloadPDF = (bill: Bill) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Bill for ${bill.customer}`, 10, 15);
    doc.setFontSize(10);
    doc.text(`Bill ID: ${bill.id}`, 10, 25);
    doc.text(`Date: ${bill.date}`, 10, 32);
    doc.text(`Payment Method: ${bill.paymentMethod}`, 10, 39);
    doc.text(`Status: ${bill.status}`, 10, 46);

    let y = 55;
    doc.setFontSize(12);
    doc.text('Items:', 10, y);
    y += 7;
    doc.setFontSize(10);
    doc.text('Product', 10, y);
    doc.text('Price', 70, y);
    doc.text('Qty', 110, y);
    doc.text('Total', 140, y);
    y += 5;
    bill.items.forEach(item => {
      doc.text(item.name, 10, y);
      doc.text(`$${item.price.toFixed(2)}`, 70, y);
      doc.text(`${item.quantity}`, 110, y);
      doc.text(`$${(item.price * item.quantity).toFixed(2)}`, 140, y);
      y += 6;
    });
    y += 4;
    doc.setFontSize(12);
    doc.text(`Total: $${bill.total.toFixed(2)}`, 10, y);
    doc.save(`Bill_${bill.id}.pdf`);
  };

  const totalRevenue = filteredBills
    .filter(bill => bill.status === 'Paid')
    .reduce((sum, bill) => sum + bill.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Billing & Invoices</h2>
        <p className="text-gray-600">Manage customer bills and invoices</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-500 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bills</p>
              <p className="text-2xl font-bold text-gray-900">{filteredBills.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-500 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Paid Bills</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredBills.filter(b => b.status === 'Paid').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-yellow-500 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Bills</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredBills.filter(b => b.status === 'Pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-purple-500 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bills..."
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

      {/* Bills Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <GreenProgressBar loading={loading}>
            {error ? (
              <div className="text-center py-10 text-red-500">{error}</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill ID
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {bill.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.items.length} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${bill.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentColor(bill.paymentMethod)}`}>
                          {bill.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(bill.status)}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewBill(bill)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Bill"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadBill(bill)}
                            className="text-green-600 hover:text-green-900"
                            title="Download Bill"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </GreenProgressBar>
        </div>
      </div>
      {/* Bill View Modal (with Print) */}
      {billToView && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative print:w-full print:max-w-full">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setBillToView(null)}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-2 text-center">{billToView.customer}</h2>
            <div className="text-center text-xs text-gray-500 mb-2">Bill ID: {billToView.id}</div>
            <div className="mb-2 text-xs text-gray-500">Date: {billToView.date}</div>
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
                {billToView.items.map((item, idx) => (
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
              <span>${billToView.total.toFixed(2)}</span>
            </div>
            <div className="mb-2 text-xs">Payment Method: <span className="font-semibold">{billToView.paymentMethod}</span></div>
            <div className="text-center mt-4 flex gap-2 justify-center">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 print:hidden"
                onClick={() => {
                  window.print();
                  setTimeout(() => setBillToView(null), 500);
                }}
              >
                Print
              </button>
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-600 print:hidden"
                onClick={() => setBillToView(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Download Modal (with Download PDF) */}
      {billToDownload && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative print:w-full print:max-w-full">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setBillToDownload(null)}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-2 text-center">{billToDownload.customer}</h2>
            <div className="text-center text-xs text-gray-500 mb-2">Bill ID: {billToDownload.id}</div>
            <div className="mb-2 text-xs text-gray-500">Date: {billToDownload.date}</div>
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
                {billToDownload.items.map((item, idx) => (
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
              <span>${billToDownload.total.toFixed(2)}</span>
            </div>
            <div className="mb-2 text-xs">Payment Method: <span className="font-semibold">{billToDownload.paymentMethod}</span></div>
            <div className="text-center mt-4 flex gap-2 justify-center">
              <button
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 print:hidden"
                onClick={() => {
                  handleDownloadPDF(billToDownload);
                  setTimeout(() => setBillToDownload(null), 500);
                }}
              >
                Download PDF
              </button>
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-600 print:hidden"
                onClick={() => setBillToDownload(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;