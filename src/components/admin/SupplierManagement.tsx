import React, { useState, useEffect } from 'react';
import SupplierDetails from './SupplierDetails';

interface Delivery {
  id: string;
  date: string;
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
  deliveries?: Delivery[];
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

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Placeholder for fetching suppliers from backend
  useEffect(() => {
    // TODO: Fetch suppliers from API
    setSuppliers([
      {
        id: '1',
        name: 'ABC Pharma',
        contact: '1234567890',
        address: '123 Main St',
        productsSupplied: ['Paracetamol', 'Ibuprofen'],
        deliveries: [],
      },
    ]);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setNewSupplier({
      ...newSupplier,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier: Supplier = {
      id: Date.now().toString(),
      name: newSupplier.name,
      contact: newSupplier.contact,
      address: newSupplier.address,
      productsSupplied: newSupplier.productsSupplied.split(',').map(p => p.trim()),
      deliveries: [],
      email: newSupplier.email,
      company: newSupplier.company,
      gst: newSupplier.gst,
      status: newSupplier.status,
      notes: newSupplier.notes,
    } as any;
    setSuppliers([...suppliers, supplier]);
    setNewSupplier({ name: '', contact: '', address: '', productsSupplied: '', email: '', company: '', gst: '', status: 'Active', notes: '' });
    setShowAddDialog(false);
    // TODO: Send supplier to backend
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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-1">Supplier Management</h2>
      <p className="mb-4 text-gray-600">Manage your suppliers and their deliveries</p>
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search supplier by name, address, phone..."
          className="border p-2 w-1/2"
          // TODO: Add search logic
        />
        <button onClick={() => setShowAddDialog(true)} className="bg-blue-600 text-white px-4 py-2 rounded">+ Add Supplier</button>
      </div>

      {/* Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(supplier => (
          <div key={supplier.id} className="bg-white rounded shadow p-4 flex flex-col gap-2 group cursor-pointer"
            onClick={e => {
              // Only open delivery details if not clicking Edit/Delete
              if ((e.target as HTMLElement).closest('button')) return;
              setSelectedSupplier(supplier);
            }}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">{supplier.name}</h3>
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Active</span>
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
            {/* Products removed from card. Deliveries managed in details view. */}
            <div className="flex gap-2 mt-2">
              <button type="button" className="bg-blue-100 text-blue-700 px-3 py-1 rounded flex-1"
                onClick={e => {
                  e.stopPropagation();
                  setEditSupplier(supplier);
                }}>
                Edit
              </button>
              <button type="button" className="bg-red-100 text-red-700 px-3 py-1 rounded flex-1"
                onClick={e => e.stopPropagation()}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Supplier Dialog */}
      {(showAddDialog || editSupplier) && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => { setShowAddDialog(false); setEditSupplier(null); }}>&times;</button>
            <h3 className="text-xl font-bold mb-4">{editSupplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
            <form onSubmit={handleAddSupplier} className="space-y-2">
              <input type="text" name="name" placeholder="Supplier Name" value={editSupplier ? editSupplier.name : newSupplier.name} onChange={handleInputChange} className="border p-2 w-full" required />
              <input type="text" name="company" placeholder="Company" value={editSupplier ? editSupplier.company : newSupplier.company} onChange={handleInputChange} className="border p-2 w-full" />
              <input type="email" name="email" placeholder="Email" value={editSupplier ? editSupplier.email : newSupplier.email} onChange={handleInputChange} className="border p-2 w-full" />
              <input type="text" name="gst" placeholder="GST Number" value={editSupplier ? editSupplier.gst : newSupplier.gst} onChange={handleInputChange} className="border p-2 w-full" />
              <input type="text" name="contact" placeholder="Contact Number" value={editSupplier ? editSupplier.contact : newSupplier.contact} onChange={handleInputChange} className="border p-2 w-full" required />
              <input type="text" name="address" placeholder="Address" value={editSupplier ? editSupplier.address : newSupplier.address} onChange={handleInputChange} className="border p-2 w-full" required />
              <input type="text" name="productsSupplied" placeholder="Products Supplied (comma separated)" value={editSupplier ? editSupplier.productsSupplied?.join(', ') : newSupplier.productsSupplied} onChange={handleInputChange} className="border p-2 w-full" />
              <textarea name="notes" placeholder="Notes" value={editSupplier ? editSupplier.notes : newSupplier.notes} onChange={handleInputChange} className="border p-2 w-full" />
              <select name="status" value={editSupplier ? editSupplier.status : newSupplier.status} onChange={handleInputChange} className="border p-2 w-full">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded w-full">{editSupplier ? 'Save Changes' : 'Add Supplier'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
