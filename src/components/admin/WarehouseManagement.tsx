import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import axios from 'axios';
import { config } from '../../config/env';
import { Link } from 'react-router-dom';

interface Supplier {
  _id: string;
  name: string;
}

interface StockItem {
  _id: string;
  productName: string;
  quantity: number;
  supplier: Supplier;
}

interface Branch {
  _id: string;
  name: string;
}

const WarehouseManagement: React.FC = () => {
  // ...existing code...
  const [stock, setStock] = useState<StockItem[]>([]);
  const [stockFilter, setStockFilter] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const initialProductState = {
    name: '',
    category: '',
    stock: '',
    minStock: '',
    price: '',
    supplier: '',
    expiryDate: '',
    // Removed fields: store, storeAlt, supplierId, supplierEntity, supplierEntityName, purchaseInvoiceId, supplierPurchaseInvoiceId, purchaseInvoiceDate, sku, skuAlt, manufacturer, manufacturerName, composition, compositionName, series, reservedQuantity, purchasePriceExclVAT, vat, divider, dividerCustom
  };
  const [newProduct, setNewProduct] = useState<{ [key: string]: string }>(initialProductState);
  const [addProductMessage, setAddProductMessage] = useState('');
  // Removed unused manualSupplier state
  const [transfer, setTransfer] = useState({ stockId: '', branchId: '', quantity: 0 });
  const [showAddDialog, setShowAddDialog] = useState(false);
    // Removed supplier dialog state

  useEffect(() => {
    fetchStock();
    fetchSuppliers();
    fetchBranches();
  }, []);

  const fetchStock = async () => {
    try {
      const res = await axios.get(`${config.apiUrl}/api/warehouse/stock`);
      if (Array.isArray(res.data)) {
        setStock(res.data);
      } else {
        console.error('Stock API did not return an array:', res.data);
        setStock([]);
      }
    } catch (err) {
      console.error('Error fetching stock:', err);
      setStock([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${config.apiUrl}/api/supplier`);
      if (Array.isArray(res.data)) {
        setSuppliers(res.data);
      } else {
        console.error('Suppliers API did not return an array:', res.data);
        setSuppliers([]);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setSuppliers([]);
    }
  };

  const fetchBranches = async () => {
    try {
  const res = await axios.get(`${config.apiUrl}/api/branch`);
      if (Array.isArray(res.data)) {
        setBranches(res.data);
      } else {
        console.error('Branches API did not return an array:', res.data);
        setBranches([]);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setBranches([]);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    // Strong frontend validation for required fields and types
    if (!newProduct.name || !newProduct.supplier) {
      setAddProductMessage('Please fill in Product Name and Supplier.');
      return;
    }
    if (!newProduct.stock || isNaN(Number(newProduct.stock)) || Number(newProduct.stock) <= 0) {
      setAddProductMessage('Please enter a valid Stock quantity (number > 0).');
      return;
    }
    try {
      // Map frontend fields to backend requirements
      const { name, stock, ...rest } = newProduct;
      const data = {
        productName: name,
        quantity: Number(stock),
        ...rest
      };
      await axios.post(`${config.apiUrl}/api/warehouse/stock`, data);
      setAddProductMessage('Product added successfully!');
      setNewProduct(initialProductState);
      fetchStock();
      setShowAddDialog(false);
    } catch (err: any) {
      setAddProductMessage('Error adding product');
    }
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post('/api/warehouse/transfer', transfer);
    setTransfer({ stockId: '', branchId: '', quantity: 0 });
    fetchStock();
  };

  // Supplier dropdown without manual add, with link to Supplier tab
  // Removed unused supplierDropdown and newStock references

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Warehouse Management</h2>
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Add Stock</h3>
        <div className="flex gap-2">
          <button
            type="button"
            className="bg-blue-500 text-white px-4 py-1 rounded"
            onClick={() => setShowAddDialog(true)}
          >
            Add
          </button>
          <Link
            to="/admin/suppliers"
            className="bg-green-500 text-white px-4 py-1 rounded flex items-center justify-center"
            style={{ textDecoration: 'none' }}
          >
            Add Supplier
          </Link>
        </div>
        {/* Add Stock Dialog */}
        {showAddDialog && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded shadow-lg min-w-[400px] max-h-[90vh] overflow-y-auto">
              <h4 className="text-lg font-semibold mb-4">Add Product</h4>
              <form onSubmit={handleAddStock} className="flex flex-col gap-3">
                {/* Fields before supplier */}
                {['name', 'category', 'stock', 'minStock'].map((field) => (
                  <div key={field} className="flex flex-col mb-2">
                    <label className="font-semibold mb-1">{field}</label>
                    <input
                      type={field.toLowerCase().includes('date') ? 'date' : 'text'}
                      name={field}
                      value={newProduct[field] || ''}
                      onChange={e => setNewProduct({ ...newProduct, [field]: e.target.value })}
                      className="border px-2 py-1"
                    />
                  </div>
                ))}
                {/* Supplier Dropdown after minStock */}
                <div className="flex flex-col mb-2">
                  <label className="font-semibold mb-1">Supplier</label>
                  <select
                    name="supplier"
                    value={newProduct.supplier}
                    onChange={e => setNewProduct({ ...newProduct, supplier: e.target.value })}
                    className="border px-2 py-1"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier._id} value={supplier._id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
                {/* Remaining fields after supplier */}
                {['price', 'expiryDate'].map((field) => (
                  <div key={field} className="flex flex-col mb-2">
                    <label className="font-semibold mb-1">{field}</label>
                    <input
                      type={field.toLowerCase().includes('date') ? 'date' : 'text'}
                      name={field}
                      value={newProduct[field] || ''}
                      onChange={e => setNewProduct({ ...newProduct, [field]: e.target.value })}
                      className="border px-2 py-1"
                    />
                  </div>
                ))}
                {addProductMessage && (
                  <div className="text-green-600 font-semibold mb-2">{addProductMessage}</div>
                )}
                <div className="flex gap-2 mt-2">
                  <button type="submit" className="bg-blue-500 text-white px-4 py-1 rounded">Add</button>
                  <button type="button" className="bg-gray-300 px-4 py-1 rounded" onClick={() => setShowAddDialog(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Transfer Stock to Branch</h3>
        <form onSubmit={handleTransferStock} className="flex gap-2 items-center">
          {/* Searchable dropdown for products using react-select */}
          <div style={{ minWidth: '220px' }}>
            <Select
              options={stock.map(item => ({ value: item._id, label: `${item.productName} (Qty: ${item.quantity})` }))}
              value={stock.length > 0 ? stock.filter(item => item._id === transfer.stockId).map(item => ({ value: item._id, label: `${item.productName} (Qty: ${item.quantity})` }))[0] : null}
              onChange={option => setTransfer({ ...transfer, stockId: option ? option.value : '' })}
              placeholder="Select or search product..."
              isClearable
              required
            />
          </div>
          <select
            value={transfer.branchId}
            onChange={e => setTransfer({ ...transfer, branchId: e.target.value })}
            required
            className="border px-2 py-1"
          >
            <option value="">Select Branch</option>
            {Array.isArray(branches) && branches.length > 0 ? (
              branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))
            ) : (
              <option value="" disabled>No branches available</option>
            )}
          </select>
          <input
            type="number"
            placeholder="Quantity"
            value={transfer.quantity}
            onChange={e => setTransfer({ ...transfer, quantity: Number(e.target.value) })}
            required
            className="border px-2 py-1"
          />
          <button type="submit" className="bg-green-500 text-white px-4 py-1 rounded">Transfer</button>
        </form>
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2">Warehouse Stock</h3>
        <div className="mb-2">
          <input
            type="text"
            placeholder="Search stock by product name..."
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value)}
            className="border px-2 py-1 w-64"
          />
        </div>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Product</th>
              <th className="border px-2 py-1">Quantity</th>
              <th className="border px-2 py-1">Supplier</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(stock) && stock.length > 0 ? (
              stock
                .filter(item =>
                  item.productName.toLowerCase().includes(stockFilter.toLowerCase())
                )
                .map(item => (
                  <tr key={item._id}>
                    <td className="border px-2 py-1">{item.productName}</td>
                    <td className="border px-2 py-1">{item.quantity}</td>
                    <td className="border px-2 py-1">{item.supplier?.name}</td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan={3} className="border px-2 py-1 text-center text-gray-500">No stock data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WarehouseManagement;
