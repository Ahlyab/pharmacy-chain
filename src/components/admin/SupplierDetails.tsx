import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import Swal from 'sweetalert2';

interface Delivery {
  _id: string;
  date: string;
  deliveryTime: string;
  products: string;
  quantity: number;
  notes?: string;
  totalAmount?: number;
  invoiceNumber?: string;
}

interface Invoice {
  _id: string;
  fileName: string;
  originalName: string;
  deliveryDate: string;
  invoiceNumber: string;
  uploadedAt: string;
  filePath: string;
  store: string;
  supplier: string;
  supplierPurchaseInvoiceId: string;
  issueDate: string;
  count: number;
  countOfProductInStock: number;
  quantity: number;
  quantityInPackageInStock: number;
  amountOfProductInStock: number;
  createdAt: string;
  createdBy: string;
}

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: string;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  address: string;
  productsSupplied: string[];
  deliveries: Delivery[];
  invoices?: Invoice[];
  email?: string;
  company?: string;
  gst?: string;
  status?: string;
  notes?: string;
}

const SupplierDetails: React.FC<{ supplier: Supplier; onBack: () => void }> = ({ supplier, onBack }) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDelivery, setNewDelivery] = useState({
    date: '',
    deliveryTime: '',
    products: '',
    quantity: 0,
    notes: '',
    totalAmount: 0,
    invoiceNumber: '',
  });
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'invoices'>('deliveries');
  const [invoiceData, setInvoiceData] = useState({
    deliveryDate: '',
    invoiceNumber: '',
    store: '',
    supplier: '',
    supplierPurchaseInvoiceId: '',
    issueDate: '',
    count: 0,
    countOfProductInStock: 0,
    quantity: 0,
    quantityInPackageInStock: 0,
    amountOfProductInStock: 0,
    createdBy: '',
  });

  // Fetch deliveries and invoices from backend
  useEffect(() => {
    fetchDeliveries();
    fetchInvoices();
    fetchBranches();
    fetchSuppliers();
  }, [supplier.id]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/api/supplier/${supplier.id}/deliveries`);
      setDeliveries(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching deliveries');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const data = await api.get(`/api/supplier/${supplier.id}/invoices`);
      setInvoices(data);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const data = await api.get('/api/branch');
      setBranches(data.map((b: any) => ({
        id: b._id || b.id,
        name: b.name,
        address: b.address,
        phone: b.phone,
        status: b.status
      })));
    } catch (err: any) {
      console.error('Error fetching branches:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await api.get('/api/supplier');
      setSuppliers(data.map((s: any) => ({
        id: s._id || s.id,
        name: s.name,
        contact: s.contact,
        address: s.address,
        productsSupplied: s.productsSupplied || [],
        deliveries: s.deliveries || [],
        invoices: s.invoices || [],
        email: s.email,
        company: s.company,
        gst: s.gst,
        status: s.status,
        notes: s.notes
      })));
    } catch (err: any) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const handleDeliveryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editingDelivery) {
      setEditingDelivery({
        ...editingDelivery,
        [name]: name === 'quantity' || name === 'totalAmount' ? Number(value) : value,
      });
    } else {
      setNewDelivery({
        ...newDelivery,
        [name]: name === 'quantity' || name === 'totalAmount' ? Number(value) : value,
      });
    }
  };

  const handleInvoiceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editingInvoice) {
      setEditingInvoice({
        ...editingInvoice,
        [name]: ['count', 'countOfProductInStock', 'quantity', 'quantityInPackageInStock', 'amountOfProductInStock'].includes(name) ? Number(value) : value,
      });
    } else {
      setInvoiceData({
        ...invoiceData,
        [name]: ['count', 'countOfProductInStock', 'quantity', 'quantityInPackageInStock', 'amountOfProductInStock'].includes(name) ? Number(value) : value,
      });
    }
  };

  const handleInvoiceUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!invoiceData.store || !invoiceData.supplier || !invoiceData.supplierPurchaseInvoiceId || !invoiceData.issueDate) {
      Swal.fire({
        title: 'Error',
        text: 'Please fill in all required fields',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }

    try {
      setLoading(true);
      
      const invoicePayload = {
        ...invoiceData,
        supplierId: supplier.id,
        createdAt: new Date().toISOString(),
        createdBy: 'Current User', // You can get this from auth context
      };

      await api.post('/api/supplier/invoice', invoicePayload);
      
      Swal.fire({
        title: 'Success',
        text: 'Invoice created successfully',
        icon: 'success',
        confirmButtonText: 'OK'
      });

      await fetchInvoices();
      setShowInvoiceDialog(false);
      setInvoiceData({
        deliveryDate: '',
        invoiceNumber: '',
        store: '',
        supplier: '',
        supplierPurchaseInvoiceId: '',
        issueDate: '',
        count: 0,
        countOfProductInStock: 0,
        quantity: 0,
        quantityInPackageInStock: 0,
        amountOfProductInStock: 0,
        createdBy: '',
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to create invoice',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  };


  const handleAddDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post(`/api/supplier/${supplier.id}/delivery`, newDelivery);
      
      await fetchDeliveries(); // Refresh the list
      setNewDelivery({ date: '', deliveryTime: '', products: '', quantity: 0, notes: '', totalAmount: 0, invoiceNumber: '' });
      setShowDeliveryDialog(false);
    } catch (err: any) {
      setError(err.message || 'Error adding delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDelivery) return;
    
    try {
      setLoading(true);
      await api.patch(`/api/supplier/${supplier.id}/delivery/${editingDelivery._id}`, editingDelivery);
      
      await fetchDeliveries(); // Refresh the list
      setEditingDelivery(null);
      setShowDeliveryDialog(false);
    } catch (err: any) {
      setError(err.message || 'Error updating delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDelivery = async (deliveryId: string) => {
    if (!window.confirm('Are you sure you want to delete this delivery?')) return;
    
    try {
      setLoading(true);
      await api.delete(`/api/supplier/${supplier.id}/delivery/${deliveryId}`);
      
      await fetchDeliveries(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Error deleting delivery');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (delivery: Delivery) => {
    setEditingDelivery(delivery);
    setShowDeliveryDialog(true);
  };

  const closeDialog = () => {
    setShowDeliveryDialog(false);
    setEditingDelivery(null);
    setNewDelivery({ date: '', deliveryTime: '', products: '', quantity: 0, notes: '', totalAmount: 0, invoiceNumber: '' });
    setError(null);
  };

  const handleEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    
    try {
      setLoading(true);
      await api.patch(`/api/supplier/invoice/${editingInvoice._id}`, editingInvoice);
      
      await fetchInvoices();
      setEditingInvoice(null);
      setShowInvoiceDialog(false);
    } catch (err: any) {
      setError(err.message || 'Error updating invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      setLoading(true);
      await api.delete(`/api/supplier/invoice/${invoiceId}`);
      
      await fetchInvoices();
    } catch (err: any) {
      setError(err.message || 'Error deleting invoice');
    } finally {
      setLoading(false);
    }
  };

  const openEditInvoiceDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowInvoiceDialog(true);
  };

  const closeInvoiceDialog = () => {
    setShowInvoiceDialog(false);
    setEditingInvoice(null);
    setInvoiceData({
      deliveryDate: '',
      invoiceNumber: '',
      store: '',
      supplier: '',
      supplierPurchaseInvoiceId: '',
      issueDate: '',
      count: 0,
      countOfProductInStock: 0,
      quantity: 0,
      quantityInPackageInStock: 0,
      amountOfProductInStock: 0,
      createdBy: '',
    });
    setError(null);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-2 sm:p-4">
      <button onClick={onBack} className="mb-4 text-blue-600 hover:text-blue-800 text-sm sm:text-base">
        &larr; Back to Suppliers
      </button>
      
      <h2 className="text-xl sm:text-2xl font-bold mb-2">{supplier.name} Details</h2>
      
      <div className="mb-4 sm:mb-6 bg-gray-50 p-3 sm:p-4 rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
          <div><strong>Contact:</strong> {supplier.contact}</div>
          <div><strong>Address:</strong> {supplier.address}</div>
          <div><strong>Email:</strong> {supplier.email || 'N/A'}</div>
          <div><strong>Company:</strong> {supplier.company || 'N/A'}</div>
          <div><strong>GST:</strong> {supplier.gst || 'N/A'}</div>
          <div><strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs ${supplier.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{supplier.status || 'Active'}</span></div>
          <div className="sm:col-span-2 lg:col-span-1"><strong>Products Supplied:</strong> {supplier.productsSupplied.join(', ') || 'None specified'}</div>
          <div><strong>Total Deliveries:</strong> {deliveries.length} ({deliveries.reduce((sum, d) => sum + d.quantity, 0)} units)</div>
          <div><strong>Total Amount:</strong> #{deliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0).toFixed(2)}</div>
          <div><strong>Invoices:</strong> {invoices.length} files</div>
          {deliveries.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-1"><strong>Last Delivery:</strong> {formatDate(deliveries[0]?.date)} ({deliveries[0]?.products})</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 sm:mb-6">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === 'deliveries'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📦 Deliveries ({deliveries.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === 'invoices'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📄 Invoices ({invoices.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'deliveries' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
            <h3 className="text-lg sm:text-xl font-semibold">Deliveries</h3>
        <div className="flex gap-2">
          <button 
                className="bg-blue-600 text-white px-2 sm:px-3 py-1 sm:py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-xs sm:text-sm"
            onClick={fetchDeliveries}
            disabled={loading}
            title="Refresh deliveries"
          >
            🔄 Refresh
          </button>
          <button 
                className="bg-green-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm"
            onClick={() => setShowDeliveryDialog(true)}
            disabled={loading}
          >
            + Add Delivery
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No deliveries found for this supplier.</p>
          <p className="text-sm mt-2">Deliveries will appear here when:</p>
          <ul className="text-sm mt-1 text-left max-w-md mx-auto">
            <li>• Stock is added to warehouse via admin panel</li>
            <li>• Manual deliveries are added</li>
            <li>• Stock transfers are made</li>
          </ul>
        </div>
      ) : (
        <div className="overflow-x-auto">
              <div className="mb-3 text-xs sm:text-sm text-gray-600">
            Showing {deliveries.length} deliveries • Total: {deliveries.reduce((sum, d) => sum + d.quantity, 0)} units
          </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 rounded-lg text-sm">
            <thead className="bg-gray-50">
              <tr>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Date</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Time</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Products</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Qty</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Amount</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Invoice #</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden sm:table-cell">Notes</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(delivery => (
                <tr key={delivery._id} className="hover:bg-gray-50">
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">{formatDate(delivery.date)}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">{delivery.deliveryTime}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm max-w-32 truncate" title={delivery.products}>{delivery.products}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">{delivery.quantity}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium">#{(delivery.totalAmount || 0).toFixed(2)}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">{delivery.invoiceNumber || '-'}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm hidden sm:table-cell max-w-32 truncate" title={delivery.notes || ''}>{delivery.notes || '-'}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                          <div className="flex space-x-1 sm:space-x-2">
                      <button
                        onClick={() => openEditDialog(delivery)}
                              className="text-blue-600 hover:text-blue-800 px-1 sm:px-2 py-1 rounded hover:bg-blue-50 text-xs sm:text-sm"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteDelivery(delivery._id)}
                              className="text-red-600 hover:text-red-800 px-1 sm:px-2 py-1 rounded hover:bg-red-50 text-xs sm:text-sm"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
            <h3 className="text-lg sm:text-xl font-semibold">Invoices</h3>
            <div className="flex gap-2">
              <button 
                className="bg-blue-600 text-white px-2 sm:px-3 py-1 sm:py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-xs sm:text-sm"
                onClick={fetchInvoices}
                disabled={loading}
                title="Refresh invoices"
              >
                🔄 Refresh
              </button>
              <button 
                className="bg-green-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm"
                onClick={() => setShowInvoiceDialog(true)}
                disabled={loading}
              >
                + Add Invoice
              </button>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No invoices found for this supplier.</p>
              <p className="text-sm mt-2">Add invoices to track purchase documentation.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="mb-3 text-xs sm:text-sm text-gray-600">
                Showing {invoices.length} invoices
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 rounded-lg text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Store</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Supplier</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Purchase Invoice ID</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Issue Date</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Count</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Quantity</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Amount</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Created By</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Created At</th>
                      <th className="border px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(invoice => (
                      <tr key={invoice._id} className="hover:bg-gray-50">
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">{invoice.store || 'N/A'}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">{invoice.supplier || 'N/A'}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium">{invoice.supplierPurchaseInvoiceId || 'N/A'}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">{formatDate(invoice.issueDate)}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">{invoice.count || 0}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">{invoice.quantity || 0}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium">#{(invoice.amountOfProductInStock || 0).toFixed(2)}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">{invoice.createdBy || 'N/A'}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">{formatDate(invoice.createdAt)}</td>
                        <td className="border px-2 sm:px-4 py-2 text-xs sm:text-sm">
                          <div className="flex space-x-1 sm:space-x-2">
                            <button
                              onClick={() => openEditInvoiceDialog(invoice)}
                              className="text-blue-600 hover:text-blue-800 px-1 sm:px-2 py-1 rounded hover:bg-blue-50 text-xs sm:text-sm"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice._id)}
                              className="text-red-600 hover:text-red-800 px-1 sm:px-2 py-1 rounded hover:bg-red-50 text-xs sm:text-sm"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Delivery Dialog */}
      {showDeliveryDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] flex flex-col relative">
            <div className="flex-shrink-0 p-4 sm:p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg sm:text-xl font-bold">
                  {editingDelivery ? 'Edit Delivery' : 'Add Delivery'}
                </h3>
            <button 
                  className="text-gray-500 hover:text-gray-700 text-2xl"
              onClick={closeDialog}
            >
              &times;
            </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <form id="delivery-form" onSubmit={editingDelivery ? handleEditDelivery : handleAddDelivery} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={editingDelivery ? editingDelivery.date : newDelivery.date}
                  onChange={handleDeliveryChange}
                      className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                <input
                  type="time"
                  name="deliveryTime"
                  value={editingDelivery ? editingDelivery.deliveryTime : newDelivery.deliveryTime}
                  onChange={handleDeliveryChange}
                      className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
                  </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Products *</label>
                <input
                  type="text"
                  name="products"
                  placeholder="Enter products"
                  value={editingDelivery ? editingDelivery.products : newDelivery.products}
                  onChange={handleDeliveryChange}
                    className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
              
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  placeholder="Enter quantity"
                  value={editingDelivery ? editingDelivery.quantity : newDelivery.quantity}
                  onChange={handleDeliveryChange}
                      className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  min="1"
                  required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                    <input
                      type="number"
                      name="totalAmount"
                      placeholder="Enter total amount"
                      value={editingDelivery ? editingDelivery.totalAmount || 0 : newDelivery.totalAmount}
                      onChange={handleDeliveryChange}
                      className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    placeholder="Enter invoice number"
                    value={editingDelivery ? editingDelivery.invoiceNumber || '' : newDelivery.invoiceNumber}
                    onChange={handleDeliveryChange}
                    className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  placeholder="Optional notes"
                  value={editingDelivery ? editingDelivery.notes || '' : newDelivery.notes}
                  onChange={handleDeliveryChange}
                    className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={3}
                />
                </div>
              </form>
              </div>
              
            <div className="flex-shrink-0 p-4 sm:p-6 border-t bg-gray-50">
              <div className="flex space-x-3">
                <button
                  type="submit"
                  form="delivery-form"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex-1 text-sm sm:text-base"
                  disabled={loading}
                  onClick={editingDelivery ? handleEditDelivery : handleAddDelivery}
                >
                  {loading ? 'Saving...' : (editingDelivery ? 'Update Delivery' : 'Add Delivery')}
                </button>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 flex-1 text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Upload Dialog */}
      {showInvoiceDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] flex flex-col relative">
            <div className="flex-shrink-0 p-4 sm:p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg sm:text-xl font-bold">
                  {editingInvoice ? 'Edit Invoice' : 'Add Invoice'}
                </h3>
                <button 
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  onClick={closeInvoiceDialog}
                >
                  &times;
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <form id="invoice-form" onSubmit={editingInvoice ? handleEditInvoice : handleInvoiceUpload} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Store *</label>
                    <select
                      name="store"
                      value={editingInvoice ? editingInvoice.store : invoiceData.store}
                      onChange={handleInvoiceChange}
                      className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    >
                      <option value="">Select Store</option>
                      {branches.length > 0 ? branches.map(branch => (
                        <option key={branch.id} value={branch.name}>{branch.name}</option>
                      )) : (
                        <option disabled>No stores available</option>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                    <select
                      name="supplier"
                      value={editingInvoice ? editingInvoice.supplier : invoiceData.supplier}
                      onChange={handleInvoiceChange}
                      className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.length > 0 ? suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                      )) : (
                        <option disabled>No suppliers available</option>
                      )}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Purchase Invoice ID *</label>
                  <input
                    type="text"
                    name="supplierPurchaseInvoiceId"
                    value={editingInvoice ? editingInvoice.supplierPurchaseInvoiceId : invoiceData.supplierPurchaseInvoiceId}
                    onChange={handleInvoiceChange}
                    placeholder="Enter supplier purchase invoice ID"
                    className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
                    <input
                      type="date"
                      name="issueDate"
                      value={editingInvoice ? editingInvoice.issueDate : invoiceData.issueDate}
                      onChange={handleInvoiceChange}
                      className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Count</label>
                    <input
                      type="number"
                      name="count"
                      value={editingInvoice ? editingInvoice.count : invoiceData.count}
                      onChange={handleInvoiceChange}
                      placeholder="Enter count"
                      className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Count of Product in Stock</label>
                    <input
                      type="number"
                      name="countOfProductInStock"
                      value={editingInvoice ? editingInvoice.countOfProductInStock : invoiceData.countOfProductInStock}
                      onChange={handleInvoiceChange}
                      placeholder="Enter count of product in stock"
                      className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={editingInvoice ? editingInvoice.quantity : invoiceData.quantity}
                      onChange={handleInvoiceChange}
                      placeholder="Enter quantity"
                      className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity in Package in Stock</label>
                    <input
                      type="number"
                      name="quantityInPackageInStock"
                      value={editingInvoice ? editingInvoice.quantityInPackageInStock : invoiceData.quantityInPackageInStock}
                      onChange={handleInvoiceChange}
                      placeholder="Enter quantity in package in stock"
                      className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount of Product in Stock</label>
                    <input
                      type="number"
                      name="amountOfProductInStock"
                      value={editingInvoice ? editingInvoice.amountOfProductInStock : invoiceData.amountOfProductInStock}
                      onChange={handleInvoiceChange}
                      placeholder="Enter amount of product in stock"
                      className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                  <input
                    type="text"
                    name="createdBy"
                    value={editingInvoice ? editingInvoice.createdBy : invoiceData.createdBy}
                    onChange={handleInvoiceChange}
                    placeholder="Enter creator name"
                    className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
              </div>
            </form>
            </div>
            
            <div className="flex-shrink-0 p-4 sm:p-6 border-t bg-gray-50">
              <div className="flex space-x-3">
                <button
                  type="submit"
                  form="invoice-form"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex-1 text-sm sm:text-base"
                  disabled={loading}
                  onClick={editingInvoice ? handleEditInvoice : handleInvoiceUpload}
                >
                  {loading ? 'Saving...' : (editingInvoice ? 'Update Invoice' : 'Add Invoice')}
                </button>
                <button
                  type="button"
                  onClick={closeInvoiceDialog}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 flex-1 text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDetails;