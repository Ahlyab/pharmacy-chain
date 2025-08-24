import React, { useState } from 'react';

interface Delivery {
  id: string;
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
  const [deliveries, setDeliveries] = useState<Delivery[]>(supplier.deliveries || []);
  const [newDelivery, setNewDelivery] = useState({
    date: '',
    deliveryTime: '',
    products: '',
    quantity: 0,
    notes: '',
  });
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);

  const handleDeliveryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNewDelivery({
      ...newDelivery,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    const delivery: Delivery = {
      id: Date.now().toString(),
      date: newDelivery.date,
      deliveryTime: newDelivery.deliveryTime,
      products: newDelivery.products,
      quantity: Number(newDelivery.quantity),
      notes: newDelivery.notes,
    };
    setDeliveries([...deliveries, delivery]);
    setNewDelivery({ date: '', deliveryTime: '', products: '', quantity: 0, notes: '' });
    setShowDeliveryDialog(false);
    // TODO: Send delivery to backend
  };

  return (
    <div className="p-4">
      <button onClick={onBack} className="mb-4 text-blue-600">&larr; Back to Suppliers</button>
      <h2 className="text-2xl font-bold mb-2">{supplier.name} Details</h2>
      <div className="mb-4">
        <div><strong>Contact:</strong> {supplier.contact}</div>
        <div><strong>Address:</strong> {supplier.address}</div>
        <div><strong>Products Supplied:</strong> {supplier.productsSupplied.join(', ')}</div>
      </div>
      <h3 className="text-xl font-semibold mb-2">Deliveries</h3>
      <button className="bg-green-600 text-white px-4 py-2 rounded mb-4" onClick={() => setShowDeliveryDialog(true)}>+ Add Delivery</button>
      {showDeliveryDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setShowDeliveryDialog(false)}>&times;</button>
            <h3 className="text-xl font-bold mb-4">Add Delivery</h3>
            <form onSubmit={handleAddDelivery} className="space-y-2">
              <input type="date" name="date" value={newDelivery.date} onChange={handleDeliveryChange} className="border p-2 w-full" required />
              <input type="time" name="deliveryTime" value={newDelivery.deliveryTime} onChange={handleDeliveryChange} className="border p-2 w-full" required />
              <input type="text" name="products" placeholder="Products" value={newDelivery.products} onChange={handleDeliveryChange} className="border p-2 w-full" required />
              <input type="number" name="quantity" placeholder="Quantity" value={newDelivery.quantity} onChange={handleDeliveryChange} className="border p-2 w-full" required />
              <textarea name="notes" placeholder="Notes" value={newDelivery.notes} onChange={handleDeliveryChange} className="border p-2 w-full" />
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded w-full">Add Delivery</button>
            </form>
          </div>
        </div>
      )}
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">Date</th>
            <th className="border px-2 py-1">Time</th>
            <th className="border px-2 py-1">Products</th>
            <th className="border px-2 py-1">Quantity</th>
            <th className="border px-2 py-1">Notes</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map(delivery => (
            <tr key={delivery.id}>
              <td className="border px-2 py-1">{delivery.date}</td>
              <td className="border px-2 py-1">{delivery.deliveryTime}</td>
              <td className="border px-2 py-1">{delivery.products}</td>
              <td className="border px-2 py-1">{delivery.quantity}</td>
              <td className="border px-2 py-1">{delivery.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SupplierDetails;
