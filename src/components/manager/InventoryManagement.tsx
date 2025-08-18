import React, { useState } from "react";
import Swal from "sweetalert2";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  AlertTriangle,
} from "lucide-react";
import { config } from "../../config/env";
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
// Removed unused imports
import { VITE_BASE_URL, VITE_BASE_URL_VERCEL, VITE_IS_VERCEL } from '../../data';

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  supplier: string;
  expiryDate: string;
  store?: string;
  storeAlt?: string;
  supplierId?: string;
  supplierEntity?: string;
  supplierEntityName?: string;
  purchaseInvoiceId?: string;
  supplierPurchaseInvoiceId?: string;
  purchaseInvoiceDate?: string;
  sku?: string;
  skuAlt?: string;
  manufacturer?: string;
  manufacturerName?: string;
  composition?: string;
  compositionName?: string;
  series?: string;
  reservedQuantity?: number;
  purchasePriceExclVAT?: number;
  vat?: number;
  divider?: string;
  dividerCustom?: string;
  status?: string;
}
const initialFormState = {
  name: '',
  category: '',
  stock: 0,
  minStock: 0,
  price: 0,
  supplier: '',
  expiryDate: '',
  store: '',
  storeAlt: '',
  supplierId: '',
  supplierEntity: '',
  supplierEntityName: '',
  purchaseInvoiceId: '',
  supplierPurchaseInvoiceId: '',
  purchaseInvoiceDate: '',
  sku: '',
  skuAlt: '',
  manufacturer: '',
  manufacturerName: '',
  composition: '',
  compositionName: '',
  series: '',
  reservedQuantity: '',
  purchasePriceExclVAT: '',
  vat: '',
  divider: '',
  dividerCustom: '',
};

const InventoryManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  // Summary stats
  const totalProducts = products.length;
  const inStock = products.filter(p => p.status === 'In Stock').length;
  const lowStock = products.filter(p => p.status === 'Low Stock').length;
  const outOfStock = products.filter(p => p.status === 'Out of Stock').length;
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<{ [key: string]: any }>(initialFormState);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [expiryFilter, setExpiryFilter] = useState('All');

    // Ref for file input
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Import handler for Excel/PDF
    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const fileType = file.name.split('.').pop()?.toLowerCase();
      if (fileType === 'xlsx' || fileType === 'xls') {
        try {
          const reader = new FileReader();
          reader.onload = async (evt) => {
            const data = new Uint8Array(evt.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            // Format date fields to YYYY-MM-DD
            const jsonData = XLSX.utils.sheet_to_json(worksheet).map((row: any) => {
              const dateFields = ['expiryDate', 'purchaseInvoiceDate'];
              dateFields.forEach(field => {
                if (row[field]) {
                  const d = new Date(row[field]);
                  if (!isNaN(d.getTime())) {
                    row[field] = d.toISOString().slice(0, 10);
                  }
                }
              });
              return row;
            });
            // Send to backend to store in database
            try {
              const response = await fetch(`${BASE_URL}/inventory/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonData)
              });
              if (!response.ok) throw new Error('Failed to import products to database');
              alert('Excel import successful! Rows: ' + jsonData.length);
              // Refresh products after import
              const productsResponse = await fetch(`${BASE_URL}/inventory`);
              if (productsResponse.ok) {
                const productsData = await productsResponse.json();
                setProducts(productsData.map(addStatus));
              }
            } catch (err) {
              alert('Error saving imported products: ' + (err as Error).message);
            }
          };
          reader.readAsArrayBuffer(file);
        } catch (err) {
          alert('Error importing Excel: ' + (err as Error).message);
        }
      } else if (fileType === 'pdf') {
        // PDF parsing is complex; placeholder for now
        alert('PDF import is not supported in browser. Please use Excel file.');
      } else {
        alert('Unsupported file type. Please upload an Excel (.xlsx/.xls) or PDF file.');
      }
      // Reset input value so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
  const BASE_URL = VITE_IS_VERCEL ? VITE_BASE_URL_VERCEL : VITE_BASE_URL;

  // Helper to add status to a product
  const addStatus = (product: any) => {
    let status: "In Stock" | "Low Stock" | "Out of Stock";
    if (product.stock === 0) status = "Out of Stock";
    else if (product.stock <= product.minStock) status = "Low Stock";
    else status = "In Stock";
    return { ...product, status, id: product._id || product.id };
  };

  React.useEffect(() => {
    const BASE_URL = `${config.apiUrl}/api`;
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${BASE_URL}/inventory`);
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        const productsWithStatus = data.map(addStatus);
        setProducts(productsWithStatus);
      } catch (err) {
        alert("Error fetching products: " + (err as Error).message);
      }
    };
    fetchProducts();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    stock: 0,
    minStock: 0,
    price: 0,
    supplier: "",
    expiryDate: "",
  });

  const categories = [
    "All",
    "Pain Relief",
    "Antibiotics",
    "Vitamins",
    "Cold & Flu",
    "Supplements",
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  }, [BASE_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const BASE_URL = `${config.apiUrl}/api`;
      if (editingProduct) {
        // Update product in backend
        const response = await fetch(
          `${BASE_URL}/api/inventory/${editingProduct.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          }
        );
        if (!response.ok) throw new Error("Failed to update product");
        const updated = await response.json();
        setProducts((prev) =>
          prev.map((product) =>
            product.id === editingProduct.id
              ? addStatus({ ...updated, id: editingProduct.id })
              : addStatus(product)
          )
        );
        const response = await fetch(`${BASE_URL}/inventory/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!response.ok) throw new Error('Failed to update product');
        await response.json(); // ignore unused variable
      } else {
        // Add product to backend
        const response = await fetch(`${BASE_URL}/api/inventory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error("Failed to add product");
        const newProduct = await response.json();
        setProducts((prev) => [...prev.map(addStatus), addStatus(newProduct)]);
        if (!response.ok) throw new Error('Failed to add product');
        await response.json(); // ignore unused variable
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        category: "",
        stock: 0,
        minStock: 0,
        price: 0,
        supplier: "",
        expiryDate: "",
      });
      setFormData(initialFormState);
      // Refresh products after add/edit
      const response = await fetch(`${BASE_URL}/inventory`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.map(addStatus));
      }
    } catch (err) {
      alert("Error: " + (err as Error).message);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    // Format expiryDate to yyyy-MM-dd for input type="date"
    let expiryDate = product.expiryDate;
    if (expiryDate && expiryDate.length > 10) {
      expiryDate = new Date(expiryDate).toISOString().slice(0, 10);
    }
    setFormData({
      name: product.name,
      category: product.category,
      stock: product.stock,
      minStock: product.minStock,
      price: product.price,
      supplier: product.supplier,
      expiryDate: expiryDate,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });
    if (result.isConfirmed) {
      const BASE_URL = `${config.apiUrl}/api`;
      try {
        const response = await fetch(`${BASE_URL}/api/inventory/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete product");
        setProducts((prev) =>
          prev.filter((product) => product.id !== id).map(addStatus)
        );
        Swal.fire("Deleted!", "Product has been deleted.", "success");
      } catch (err) {
        Swal.fire(
          "Error",
          "Error deleting product: " + (err as Error).message,
          "error"
        );
      }
    }
  };


  // Removed unused handleEdit function

  // Removed unused handleDelete function

  // Removed unused getStatusColor function

  // Removed unused handleImportClick function

  // Removed unused handleFileChange function

  // Modal field array
  const modalFields = [
    { key: 'name', label: 'Product Name', inputType: 'text', isRequired: true },
    { key: 'category', label: 'Category', inputType: 'text', isRequired: true },
    { key: 'stock', label: 'Stock', inputType: 'number', isRequired: true },
    { key: 'minStock', label: 'Min Stock', inputType: 'number', isRequired: true },
    { key: 'price', label: 'Price ($)', inputType: 'number', isRequired: true },
    { key: 'supplier', label: 'Supplier', inputType: 'text', isRequired: true },
    { key: 'expiryDate', label: 'Expiry Date', inputType: 'date', isRequired: true },
    { key: 'store', label: 'Store', inputType: 'text', isRequired: false },
    { key: 'storeAlt', label: 'Store Alt', inputType: 'text', isRequired: false },
    { key: 'supplierId', label: 'Supplier ID', inputType: 'text', isRequired: false },
    { key: 'supplierEntity', label: 'Supplier Entity', inputType: 'text', isRequired: false },
    { key: 'supplierEntityName', label: 'Supplier Entity Name', inputType: 'text', isRequired: false },
    { key: 'purchaseInvoiceId', label: 'Purchase Invoice ID', inputType: 'text', isRequired: false },
    { key: 'supplierPurchaseInvoiceId', label: 'Supplier Purchase Invoice ID', inputType: 'text', isRequired: false },
    { key: 'purchaseInvoiceDate', label: 'Purchase Invoice Date', inputType: 'date', isRequired: false },
    { key: 'sku', label: 'SKU', inputType: 'text', isRequired: false },
    { key: 'skuAlt', label: 'SKU Alt', inputType: 'text', isRequired: false },
    { key: 'manufacturer', label: 'Manufacturer', inputType: 'text', isRequired: false },
    { key: 'manufacturerName', label: 'Manufacturer Name', inputType: 'text', isRequired: false },
    { key: 'composition', label: 'Composition', inputType: 'text', isRequired: false },
    { key: 'compositionName', label: 'Composition Name', inputType: 'text', isRequired: false },
    { key: 'series', label: 'Series', inputType: 'text', isRequired: false },
    { key: 'reservedQuantity', label: 'Reserved Quantity', inputType: 'number', isRequired: false },
    { key: 'purchasePriceExclVAT', label: 'Purchase Price Excl. VAT', inputType: 'number', isRequired: false },
    { key: 'vat', label: 'VAT', inputType: 'number', isRequired: false },
    { key: 'divider', label: 'Divider', inputType: 'text', isRequired: false },
    { key: 'dividerCustom', label: 'Divider Custom', inputType: 'text', isRequired: false },
  ];

  // Helper for expiry status
  const getExpiryStatus = (expiryDate: string) => {
    if (!expiryDate) return 'Valid';
    const today = new Date();
    const exp = new Date(expiryDate);
    if (exp < today) return 'Expired';
    const diffDays = (exp.getTime() - today.getTime()) / (1000 * 3600 * 24);
    if (diffDays <= 30) return 'Expiring Soon';
    return 'Valid';
  };

  // Get unique categories for dropdown
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // Filter products
  const filteredProducts = products.filter(product => {
    const searchLower = search.toLowerCase();
    const matchesSearch = (
      product.name.toLowerCase().includes(searchLower) ||
      product.category.toLowerCase().includes(searchLower) ||
      product.supplier.toLowerCase().includes(searchLower)
    );
    const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
    const expiryStatus = getExpiryStatus(product.expiryDate);
    const matchesExpiry = expiryFilter === 'All' || expiryStatus === expiryFilter;
    return matchesSearch && matchesCategory && matchesExpiry;
  });

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'bg-green-50 text-green-700 border-green-400';
      case 'Low Stock': return 'bg-yellow-50 text-yellow-700 border-yellow-400';
      case 'Out of Stock': return 'bg-red-50 text-red-700 border-red-400';
      default: return 'bg-gray-50 text-gray-700 border-gray-400';
    }
  };

  // Responsive badge style
  const badgeClass = 'inline-flex flex-col items-center justify-center px-3 py-1 rounded-full text-xs font-bold border w-fit min-w-[80px] text-center break-words';

  return (
    <div className="space-y-8">
      {/* Page Title & Subtitle */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black mb-1">Inventory Management</h1>
        <p className="text-lg text-gray-600">View, filter, and manage pharmacy inventory. Add or edit products and track stock levels.</p>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-blue-600 text-3xl mb-2"><svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path stroke="currentColor" strokeWidth="2" d="M9 7h6"/></svg></span>
          <div className="text-lg font-semibold text-gray-700">Total Products</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{totalProducts}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-green-600 text-3xl mb-2"><svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path stroke="currentColor" strokeWidth="2" d="M9 7h6"/></svg></span>
          <div className="text-lg font-semibold text-gray-700">In Stock</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{inStock}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-yellow-600 text-3xl mb-2"><svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path stroke="currentColor" strokeWidth="2" d="M9 7h6"/></svg></span>
          <div className="text-lg font-semibold text-gray-700">Low Stock</div>
          <div className="text-2xl font-bold text-yellow-700 mt-1">{lowStock}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-red-600 text-3xl mb-2"><svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path stroke="currentColor" strokeWidth="2" d="M9 7h6"/></svg></span>
          <div className="text-lg font-semibold text-gray-700">Out of Stock</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{outOfStock}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="flex items-center w-full md:w-auto gap-2 flex-1">
          <div className="relative w-full md:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"/></svg>
            </span>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={expiryFilter}
            onChange={e => setExpiryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            <option value="Expired">Expired</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Valid">Valid</option>
          </select>
        </div>
        <div className="flex gap-2 ml-auto items-center">
          {/* Import Products Button & File Input */}
          <input
            type="file"
            accept=".xlsx,.xls,.pdf"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <button
            className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 flex items-center gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 5v14m7-7H5"/></svg>
            Import Products
          </button>
          {/* Add Product Button with Plus Icon */}
          <button className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 flex items-center gap-2" onClick={() => setShowModal(true)}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 5v14m7-7H5"/></svg>
            Add Product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow-lg">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-4 py-2 border">Name</th>
              <th className="px-4 py-2 border">Category</th>
              <th className="px-4 py-2 border">Stock</th>
              <th className="px-4 py-2 border">Min Stock</th>
              <th className="px-4 py-2 border">Price</th>
              <th className="px-4 py-2 border">Supplier</th>
              <th className="px-4 py-2 border">Expiry Date</th>
              <th className="px-4 py-2 border">Status</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-4">No products found.</td></tr>
            ) : (
              filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-blue-50 transition">
                  <td className="px-4 py-2 border font-semibold">{product.name}</td>
                  <td className="px-4 py-2 border">{product.category}</td>
                  <td className="px-4 py-2 border">{product.stock}</td>
                  <td className="px-4 py-2 border">{product.minStock}</td>
                  <td className="px-4 py-2 border">{product.price}</td>
                  <td className="px-4 py-2 border">{product.supplier}</td>
                  <td className="px-4 py-2 border">
                    {product.expiryDate ? new Date(product.expiryDate).toISOString().slice(0, 10) : ''}
                  </td>
                  <td className="px-4 py-2 border text-center">
                    <span className={`${badgeClass} ${getStatusColor(product.status ?? '')}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 border text-center">
                    <button
                      className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs mr-2 flex items-center gap-1"
                      onClick={() => { setEditingProduct(product); setFormData(product); setShowModal(true); }}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M4 20h4l10.5-10.5a2.121 2.121 0 0 0-3-3L5 17v3Z"/></svg>
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto shadow-2xl">
            <h3 className="text-xl font-bold text-blue-700 mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {modalFields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type={field.inputType}
                    required={field.isRequired}
                    value={formData[field.key] !== undefined ? formData[field.key] : ''}
                    onChange={e => setFormData({ ...formData, [field.key]: field.inputType === 'number' ? Number(e.target.value) : e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingProduct(null); setFormData(initialFormState); }} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">{editingProduct ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
                
// Duplicate modal JSX block removed. Only keep the modal JSX inside the InventoryManagement component.