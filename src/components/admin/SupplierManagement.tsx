import React, { useState, useEffect } from 'react';
import { apiEndpoints } from '../../utils/api';
import BulkSupplyDialog from './BulkSupplyDialog';
import Swal from 'sweetalert2';
import SupplierDetails from './SupplierDetails';

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
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  address: string;
  productsSupplied: string[];
  deliveries?: Delivery[];
  invoices?: Invoice[];
  email?: string;
  company?: string;
  gst?: string;
  status?: string;
  notes?: string;
}

const SupplierManagement: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact: '',
    address: '',
    productsSupplied: '',
    email: '',
    company: '',
    gst: '',
    status: 'Active',
    notes: '',
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  // Removed unused isSubmitting state

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBulkSupplyDialog, setShowBulkSupplyDialog] = useState(false);

  // Fetch suppliers from backend
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const data = await apiEndpoints.getSuppliers();
        setSuppliers(data.map((s: any) => ({
          id: s._id,
          name: s.name ?? '',
          contact: s.contact ?? '',
          address: s.address ?? '',
          productsSupplied: s.productsSupplied ?? [],
          deliveries: s.deliveries ?? [],
          invoices: s.invoices ?? [],
          email: s.email ?? '',
          company: s.company ?? '',
          gst: s.gst ?? '',
          status: s.status ?? 'Active',
          notes: s.notes ?? '',
        })));
      } catch (err) {
        console.error('Error fetching suppliers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, []);


  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editSupplier) {
        // Edit supplier
        const payload = {
          name: editSupplier.name,
          contact: editSupplier.contact,
          address: editSupplier.address,
          productsSupplied: Array.isArray(editSupplier.productsSupplied)
            ? editSupplier.productsSupplied
            : [],
          deliveries: editSupplier.deliveries || [],
          email: editSupplier.email,
          company: editSupplier.company,
          gst: editSupplier.gst,
          status: editSupplier.status,
          notes: editSupplier.notes,
        };
        const updatedSupplier = await apiEndpoints.updateSupplier(editSupplier.id, payload);
        setSuppliers(suppliers.map(s => s.id === editSupplier.id ? {
          ...s,
          ...updatedSupplier,
          id: updatedSupplier._id,
        } : s));
        setEditSupplier(null);
        setShowAddDialog(false);
      } else {
        // Add supplier
        const payload = {
          name: newSupplier.name,
          contact: newSupplier.contact,
          address: newSupplier.address,
          deliveries: [],
          email: newSupplier.email ?? '',
          company: newSupplier.company ?? '',
          gst: newSupplier.gst ?? '',
          status: newSupplier.status ?? 'Active',
          notes: newSupplier.notes ?? '',
        };
        await apiEndpoints.createSupplier(payload);
        // Refetch suppliers from backend to ensure all details are shown
        const refetch = async () => {
          try {
            const data = await apiEndpoints.getSuppliers();
            setSuppliers(data.map((s: any) => ({
              id: s._id,
              name: s.name ?? '',
              contact: s.contact ?? '',
              address: s.address ?? '',
              productsSupplied: s.productsSupplied ?? [],
              deliveries: s.deliveries ?? [],
              invoices: s.invoices ?? [],
              email: s.email ?? '',
              company: s.company ?? '',
              gst: s.gst ?? '',
              status: s.status ?? 'Active',
              notes: s.notes ?? '',
            })));
          } catch {}
        };
        await refetch();
        setNewSupplier({ name: '', contact: '', address: '', productsSupplied: '', email: '', company: '', gst: '', status: 'Active', notes: '' });
        setShowAddDialog(false);
      }
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: 'Error adding/updating supplier',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };

  if (selectedSupplier) {
    // Ensure deliveries is always an array
    const supplierWithDeliveries = {
      ...selectedSupplier,
      deliveries: selectedSupplier.deliveries || [],
    };
    return <SupplierDetails supplier={supplierWithDeliveries} onBack={() => setSelectedSupplier(null)} />;
  }

  return (
  <div className="p-4 sm:p-6">
      <h2 className="text-2xl font-bold mb-1">Supplier Management</h2>
      <p className="mb-4 text-gray-600">Manage your suppliers and their deliveries</p>
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Search supplier by name, address, phone, company, email, GST..."
          className="border p-2 w-1/2"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <div className="flex gap-2">
          <button 
            onClick={() => setShowBulkSupplyDialog(true)} 
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            📦 Bulk Supply
          </button>
          <button onClick={() => setShowAddDialog(true)} className="bg-blue-600 text-white px-4 py-2 rounded">+ Add Supplier</button>
        </div>
      </div>

      {/* Supplier Cards */}
      {loading ? (
        <div className="col-span-full text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading suppliers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers
          .filter(supplier => {
            const term = searchTerm.toLowerCase();
            return (
              supplier.name.toLowerCase().includes(term) ||
              supplier.address.toLowerCase().includes(term) ||
              supplier.contact.toLowerCase().includes(term) ||
              (supplier.company ?? '').toLowerCase().includes(term) ||
              (supplier.email ?? '').toLowerCase().includes(term) ||
              (supplier.gst ?? '').toLowerCase().includes(term)
            );
          })
          .map(supplier => (
          <div key={supplier.id} className="bg-white rounded shadow p-4 flex flex-col gap-2 group cursor-pointer transition hover:shadow-lg h-full"
            onClick={e => {
              // Only open delivery details if not clicking Edit/Delete
              if ((e.target as HTMLElement).closest('button')) return;
              setSelectedSupplier(supplier);
            }}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">{supplier.name}</h3>
              <span className={`px-2 py-1 rounded text-xs ${
                supplier.status === 'Active' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {supplier.status || 'Active'}
              </span>
            </div>
            <div className="text-gray-700"><span className="font-semibold">Company:</span> {supplier.company || '-'}</div>
            <div className="text-gray-700"><span className="font-semibold">Email:</span> {supplier.email || '-'}</div>
            <div className="text-gray-700"><span className="font-semibold">GST:</span> {supplier.gst || '-'}</div>
            <div className="flex items-center gap-2">
              <span role="img" aria-label="location">📍</span> {supplier.address}
            </div>
            <div className="flex items-center gap-2">
              <span role="img" aria-label="phone">📞</span> {supplier.contact}
            </div>
            {/* Delivery count and total amount indicator */}
            <div className="text-gray-700 mt-2">
              <div><span className="font-semibold">Deliveries:</span> {supplier.deliveries?.length || 0}</div>
              <div><span className="font-semibold">Invoices:</span> {supplier.invoices?.length || 0}</div>
              {supplier.deliveries && supplier.deliveries.length > 0 && (
                <div><span className="font-semibold">Total Supplied:</span> #{supplier.deliveries.reduce((total, delivery) => total + (delivery.totalAmount || 0), 0).toFixed(2)}</div>
              )}
            </div>
            
            {/* Products removed from card. Deliveries managed in details view. */}
            <div className="flex flex-col sm:flex-row gap-2 mt-auto">
              <button type="button" className="bg-blue-100 text-blue-700 px-3 py-2 rounded flex-1"
                onClick={e => {
                  e.stopPropagation();
                  setEditSupplier(supplier);
                  setShowAddDialog(true);
                }}>
                Edit
              </button>
              <button type="button" className="bg-red-100 text-red-700 px-3 py-2 rounded flex-1"
                onClick={async e => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this supplier?')) {
                    try {
                      await apiEndpoints.deleteSupplier(supplier.id);
                      setSuppliers(suppliers.filter(s => s.id !== supplier.id));
                    } catch (err) {
                      Swal.fire({
                        title: 'Error',
                        text: 'Error deleting supplier',
                        icon: 'error',
                        confirmButtonText: 'OK'
                      });
                    }
                  }
                }}>Delete</button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Add/Edit Supplier Dialog */}
      {(showAddDialog || editSupplier) && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-2">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => { setShowAddDialog(false); setEditSupplier(null); }}>&times;</button>
            <h3 className="text-xl font-bold mb-4">{editSupplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
            <form onSubmit={handleAddSupplier} className="space-y-2">
              <input type="text" name="name" placeholder="Supplier Name" value={editSupplier ? editSupplier.name : newSupplier.name} onChange={e => {
                if (editSupplier) setEditSupplier({ ...editSupplier, name: e.target.value });
                else setNewSupplier({ ...newSupplier, name: e.target.value });
              }} className="border p-2 w-full" required />
              <input type="text" name="company" placeholder="Company" value={editSupplier ? editSupplier.company : newSupplier.company} onChange={e => {
                if (editSupplier) setEditSupplier({ ...editSupplier, company: e.target.value });
                else setNewSupplier({ ...newSupplier, company: e.target.value });
              }} className="border p-2 w-full" />
              <input type="email" name="email" placeholder="Email" value={editSupplier ? editSupplier.email : newSupplier.email} onChange={e => {
                if (editSupplier) setEditSupplier({ ...editSupplier, email: e.target.value });
                else setNewSupplier({ ...newSupplier, email: e.target.value });
              }} className="border p-2 w-full" />
              <input type="text" name="gst" placeholder="GST Number" value={editSupplier ? editSupplier.gst : newSupplier.gst} onChange={e => {
                if (editSupplier) setEditSupplier({ ...editSupplier, gst: e.target.value });
                else setNewSupplier({ ...newSupplier, gst: e.target.value });
              }} className="border p-2 w-full" />
              <input type="text" name="contact" placeholder="Contact Number" value={editSupplier ? editSupplier.contact : newSupplier.contact} onChange={e => {
                if (editSupplier) setEditSupplier({ ...editSupplier, contact: e.target.value });
                else setNewSupplier({ ...newSupplier, contact: e.target.value });
              }} className="border p-2 w-full" required />
              <input type="text" name="address" placeholder="Address" value={editSupplier ? editSupplier.address : newSupplier.address} onChange={e => {
                if (editSupplier) setEditSupplier({ ...editSupplier, address: e.target.value });
                else setNewSupplier({ ...newSupplier, address: e.target.value });
              }} className="border p-2 w-full" required />
              <textarea name="notes" placeholder="Notes" value={editSupplier ? editSupplier.notes : newSupplier.notes} onChange={e => {
                if (editSupplier) setEditSupplier({ ...editSupplier, notes: e.target.value });
                else setNewSupplier({ ...newSupplier, notes: e.target.value });
              }} className="border p-2 w-full" />
              <select name="status" value={editSupplier ? editSupplier.status : newSupplier.status} onChange={e => {
                if (editSupplier) setEditSupplier({ ...editSupplier, status: e.target.value });
                else setNewSupplier({ ...newSupplier, status: e.target.value });
              }} className="border p-2 w-full">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded w-full">{editSupplier ? 'Save Changes' : 'Add Supplier'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Supply Dialog */}
      <BulkSupplyDialog
        isOpen={showBulkSupplyDialog}
        onClose={() => setShowBulkSupplyDialog(false)}
        suppliers={suppliers}
        onSuccess={() => {
          // Refresh suppliers list to show updated delivery counts
          const refetch = async () => {
            try {
              const data = await apiEndpoints.getSuppliers();
              setSuppliers(data.map((s: any) => ({
                id: s._id,
                name: s.name ?? '',
                contact: s.contact ?? '',
                address: s.address ?? '',
                productsSupplied: s.productsSupplied ?? [],
                deliveries: s.deliveries ?? [],
                invoices: s.invoices ?? [],
                email: s.email ?? '',
                company: s.company ?? '',
                gst: s.gst ?? '',
                status: s.status ?? 'Active',
                notes: s.notes ?? '',
              })));
            } catch {}
          };
          refetch();
        }}
      />
    </div>
  );
};

export default SupplierManagement;
