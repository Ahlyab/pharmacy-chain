import React, { useState, useEffect } from 'react';
import { config } from '../../config/env';

interface Delivery {
  _id: string;
  date: string;
  deliveryTime: string;
  products: string;
  quantity: number;
  notes?: string;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  address: string;
  productsSupplied: string[];
  deliveries: Delivery[];
}

const SupplierDetails: React.FC<{ supplier: Supplier; onBack: () => void }> = ({ supplier, onBack }) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDelivery, setNewDelivery] = useState({
    date: '',
    deliveryTime: '',
    products: '',
    quantity: 0,
    notes: '',
  });
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch deliveries from backend
  useEffect(() => {
    fetchDeliveries();
  }, [supplier.id]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/api/supplier/${supplier.id}/deliveries`);
      if (!response.ok) throw new Error('Failed to fetch deliveries');
      const data = await response.json();
      setDeliveries(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editingDelivery) {
      setEditingDelivery({
        ...editingDelivery,
        [name]: name === 'quantity' ? Number(value) : value,
      });
    } else {
      setNewDelivery({
        ...newDelivery,
        [name]: name === 'quantity' ? Number(value) : value,
      });
    }
  };

  const handleAddDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/api/supplier/${supplier.id}/delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDelivery),
      });
      
      if (!response.ok) throw new Error('Failed to add delivery');
      
      await fetchDeliveries(); // Refresh the list
      setNewDelivery({ date: '', deliveryTime: '', products: '', quantity: 0, notes: '' });
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
      const response = await fetch(`${config.apiUrl}/api/supplier/${supplier.id}/delivery/${editingDelivery._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDelivery),
      });
      
      if (!response.ok) throw new Error('Failed to update delivery');
      
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
      const response = await fetch(`${config.apiUrl}/api/supplier/${supplier.id}/delivery/${deliveryId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete delivery');
      
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
    setNewDelivery({ date: '', deliveryTime: '', products: '', quantity: 0, notes: '' });
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
    <div className="p-4">
      <button onClick={onBack} className="mb-4 text-blue-600 hover:text-blue-800">
        &larr; Back to Suppliers
      </button>
      
      <h2 className="text-2xl font-bold mb-2">{supplier.name} Details</h2>
      
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Contact:</strong> {supplier.contact}</div>
          <div><strong>Address:</strong> {supplier.address}</div>
          <div><strong>Products Supplied:</strong> {supplier.productsSupplied.join(', ') || 'None specified'}</div>
          <div><strong>Total Deliveries:</strong> {deliveries.length} ({deliveries.reduce((sum, d) => sum + d.quantity, 0)} units)</div>
          {deliveries.length > 0 && (
            <div><strong>Last Delivery:</strong> {formatDate(deliveries[0]?.date)} ({deliveries[0]?.products})</div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Deliveries</h3>
        <div className="flex gap-2">
          <button 
            className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            onClick={fetchDeliveries}
            disabled={loading}
            title="Refresh deliveries"
          >
            🔄 Refresh
          </button>
          <button 
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
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
          <div className="mb-3 text-sm text-gray-600">
            Showing {deliveries.length} deliveries • Total: {deliveries.reduce((sum, d) => sum + d.quantity, 0)} units
          </div>
          <table className="min-w-full border border-gray-300 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-4 py-2 text-left">Date</th>
                <th className="border px-4 py-2 text-left">Time</th>
                <th className="border px-4 py-2 text-left">Products</th>
                <th className="border px-4 py-2 text-left">Quantity</th>
                <th className="border px-4 py-2 text-left">Notes</th>
                <th className="border px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(delivery => (
                <tr key={delivery._id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{formatDate(delivery.date)}</td>
                  <td className="border px-4 py-2">{delivery.deliveryTime}</td>
                  <td className="border px-4 py-2">{delivery.products}</td>
                  <td className="border px-4 py-2">{delivery.quantity}</td>
                  <td className="border px-4 py-2">{delivery.notes || '-'}</td>
                  <td className="border px-4 py-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditDialog(delivery)}
                        className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteDelivery(delivery._id)}
                        className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
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
      )}

      {/* Add/Edit Delivery Dialog */}
      {showDeliveryDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-2">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button 
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={closeDialog}
            >
              &times;
            </button>
            
            <h3 className="text-xl font-bold mb-4">
              {editingDelivery ? 'Edit Delivery' : 'Add Delivery'}
            </h3>
            
            <form onSubmit={editingDelivery ? handleEditDelivery : handleAddDelivery} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={editingDelivery ? editingDelivery.date : newDelivery.date}
                  onChange={handleDeliveryChange}
                  className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Products *</label>
                <input
                  type="text"
                  name="products"
                  placeholder="Enter products"
                  value={editingDelivery ? editingDelivery.products : newDelivery.products}
                  onChange={handleDeliveryChange}
                  className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  placeholder="Enter quantity"
                  value={editingDelivery ? editingDelivery.quantity : newDelivery.quantity}
                  onChange={handleDeliveryChange}
                  className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  placeholder="Optional notes"
                  value={editingDelivery ? editingDelivery.notes || '' : newDelivery.notes}
                  onChange={handleDeliveryChange}
                  className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex-1"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (editingDelivery ? 'Update Delivery' : 'Add Delivery')}
                </button>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDetails;
