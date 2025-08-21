import React, { useState, useEffect, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { VITE_BASE_URL } from "../../data";
import Swal from "sweetalert2";
import { useAuth } from "../../contexts/AuthContext";
import * as XLSX from "xlsx";
// ...existing code...

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  supplier: string;
  expiryDate: string;
  status?: string;
  branchId?: { _id: string; name: string } | string;
  // ...other optional fields...
}

interface FormProduct {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  supplier: string;
  expiryDate: string;
}

const initialFormState: FormProduct = {
  id: "",
  name: "",
  category: "",
  stock: 0,
  minStock: 0,
  price: 0,
  supplier: "",
  expiryDate: "",
};

const InventoryManagement: React.FC = () => {
  const { user } = useAuth();
  const BASE_URL = VITE_BASE_URL;
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<FormProduct>(initialFormState);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expiryFilter, setExpiryFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to add status to a product
  const addStatus = (product: any) => {
    let status: "In Stock" | "Low Stock" | "Out of Stock";
    if (product.stock === 0) status = "Out of Stock";
    else if (product.stock <= product.minStock) status = "Low Stock";
    else status = "In Stock";
    return { ...product, status, id: product._id || product.id };
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${BASE_URL}/inventory`);
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        setProducts(data.map(addStatus));
      } catch (err) {
        alert("Error fetching products: " + (err as Error).message);
      }
    };
    fetchProducts();
  }, [BASE_URL]);

  // Import handler for Excel/PDF
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileType = file.name.split(".").pop()?.toLowerCase();
    if (fileType === "xlsx" || fileType === "xls") {
      try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils
            .sheet_to_json(worksheet)
            .map((row: any) => {
              const dateFields = ["expiryDate"];
              dateFields.forEach((field) => {
                if (row[field]) {
                  const d = new Date(row[field]);
                  if (!isNaN(d.getTime())) {
                    row[field] = d.toISOString().slice(0, 10);
                  }
                }
              });
              return row;
            });
          try {
            const response = await fetch(`${BASE_URL}/inventory/import`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                products: jsonData,
                branchId: user?.branchId,
              }),
            });
            if (!response.ok)
              throw new Error("Failed to import products to database");
            alert("Excel import successful! Rows: " + jsonData.length);
            // Refresh products after import
            const productsResponse = await fetch(`${BASE_URL}/inventory`);
            if (productsResponse.ok) {
              const productsData = await productsResponse.json();
              setProducts(productsData.map(addStatus));
            }
          } catch (err) {
            alert("Error saving imported products: " + (err as Error).message);
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (err) {
        alert("Error importing Excel: " + (err as Error).message);
      }
    } else if (fileType === "pdf") {
      alert("PDF import is not supported in browser. Please use Excel file.");
    } else {
      alert(
        "Unsupported file type. Please upload an Excel (.xlsx/.xls) or PDF file."
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        // Update product in backend
        const response = await fetch(
          `${BASE_URL}/inventory/${editingProduct.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...formData, branchId: user?.branchId }),
          }
        );
        if (!response.ok) throw new Error("Failed to update product");
      } else {
        // Add product to backend
        const response = await fetch(`${BASE_URL}/inventory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, branchId: user?.branchId }),
        });
        if (!response.ok) throw new Error("Failed to add product");
      }
      setShowModal(false);
      setEditingProduct(null);
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
    let expiryDate = product.expiryDate;
    if (expiryDate && expiryDate.length > 10) {
      expiryDate = new Date(expiryDate).toISOString().slice(0, 10);
    }
    setFormData({ ...product, expiryDate });
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
      try {
        const response = await fetch(`${BASE_URL}/inventory/${id}`, {
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

  // Helper for expiry status
  const getExpiryStatus = (expiryDate: string) => {
    if (!expiryDate) return "Valid";
    const today = new Date();
    const exp = new Date(expiryDate);
    if (exp < today) return "Expired";
    const diffDays = (exp.getTime() - today.getTime()) / (1000 * 3600 * 24);
    if (diffDays <= 30) return "Expiring Soon";
    return "Valid";
  };

  // Get unique categories for dropdown
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  // Get unique branches for dropdown
  const branches = Array.from(
    new Set(
      products
        .map((p) =>
          typeof p.branchId === "object" && p.branchId?.name
            ? p.branchId.name
            : null
        )
        .filter((branch): branch is string => branch !== null)
    )
  );

  // Filter products
  const filteredProducts = products.filter((product) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(searchLower) ||
      product.category.toLowerCase().includes(searchLower) ||
      product.supplier.toLowerCase().includes(searchLower);
    const matchesCategory =
      categoryFilter === "All" || product.category === categoryFilter;
    const expiryStatus = getExpiryStatus(product.expiryDate);
    const matchesExpiry =
      expiryFilter === "All" || expiryStatus === expiryFilter;
    const productBranchName =
      typeof product.branchId === "object" && product.branchId?.name
        ? product.branchId.name
        : "N/A";
    const matchesBranch =
      branchFilter === "All" || productBranchName === branchFilter;
    return matchesSearch && matchesCategory && matchesExpiry && matchesBranch;
  });

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-green-50 text-green-700 border-green-400";
      case "Low Stock":
        return "bg-yellow-50 text-yellow-700 border-yellow-400";
      case "Out of Stock":
        return "bg-red-50 text-red-700 border-red-400";
      default:
        return "bg-gray-50 text-gray-700 border-gray-400";
    }
  };

  const badgeClass =
    "inline-flex flex-col items-center justify-center px-3 py-1 rounded-full text-xs font-bold w-fit min-w-[80px] text-center break-words";

  // Modal field array
  const modalFields = [
    { key: "name", label: "Product Name", inputType: "text", isRequired: true },
    { key: "category", label: "Category", inputType: "text", isRequired: true },
    { key: "stock", label: "Stock", inputType: "number", isRequired: true },
    {
      key: "minStock",
      label: "Min Stock",
      inputType: "number",
      isRequired: true,
    },
    { key: "price", label: "Price ($)", inputType: "number", isRequired: true },
    { key: "supplier", label: "Supplier", inputType: "text", isRequired: true },
    {
      key: "expiryDate",
      label: "Expiry Date",
      inputType: "date",
      isRequired: true,
    },
    // ...add other fields as needed...
  ];

  // Summary stats
  const totalProducts = products.length;
  const inStock = products.filter((p) => p.status === "In Stock").length;
  const lowStock = products.filter((p) => p.status === "Low Stock").length;
  const outOfStock = products.filter((p) => p.status === "Out of Stock").length;

  return (
    <div className="space-y-8">
      {/* Page Title & Subtitle */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black mb-1">
          Inventory Management
        </h1>
        <p className="text-lg text-gray-600">
          View, filter, and manage pharmacy inventory. Add or edit products and
          track stock levels.
        </p>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <div className="text-lg font-semibold text-gray-700">
            Total Products
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {totalProducts}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <div className="text-lg font-semibold text-gray-700">In Stock</div>
          <div className="text-2xl font-bold text-green-700 mt-1">
            {inStock}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <div className="text-lg font-semibold text-gray-700">Low Stock</div>
          <div className="text-2xl font-bold text-yellow-700 mt-1">
            {lowStock}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <div className="text-lg font-semibold text-gray-700">
            Out of Stock
          </div>
          <div className="text-2xl font-bold text-red-700 mt-1">
            {outOfStock}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="flex items-center w-full md:w-auto gap-2 flex-1">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            <option value="Expired">Expired</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Valid">Valid</option>
          </select>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Branches</option>
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 ml-auto items-center">
          <input
            type="file"
            accept=".xlsx,.xls,.pdf"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
          <button
            className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 flex items-center gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            Import Products
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 flex items-center gap-2"
            onClick={() => setShowModal(true)}
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Table - lucide-react icons for actions, name wraps, no horizontal scroll */}
      <div className="rounded-lg shadow-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Stock</th>
              <th className="px-4 py-2 text-left">Min Stock</th>
              <th className="px-4 py-2 text-left">Price</th>
              <th className="px-4 py-2 text-left">Supplier</th>
              <th className="px-4 py-2 text-left">Branch</th>
              <th className="px-4 py-2 text-left">Expiry Date</th>
              <th className="px-4 py-2 text-center">Status</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-4">
                  No products found.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-blue-50 transition">
                  <td className="px-4 py-2 font-semibold text-left break-words whitespace-normal max-w-[180px]">
                    {product.name}
                  </td>
                  <td className="px-4 py-2 text-left">{product.category}</td>
                  <td className="px-4 py-2 text-left">{product.stock}</td>
                  <td className="px-4 py-2 text-left">{product.minStock}</td>
                  <td className="px-4 py-2 text-left">{product.price}</td>
                  <td className="px-4 py-2 text-left">{product.supplier}</td>
                  <td className="px-4 py-2 text-left">
                    {typeof product.branchId === "object" &&
                    product.branchId?.name
                      ? product.branchId.name
                      : "N/A"}
                  </td>
                  <td className="px-4 py-2 text-left">
                    {product.expiryDate
                      ? new Date(product.expiryDate).toISOString().slice(0, 10)
                      : ""}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`${badgeClass} ${getStatusColor(
                        product.status ?? ""
                      )}`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center flex gap-1 justify-center">
                    <button
                      className="p-1 rounded-full hover:bg-blue-100"
                      title="Edit"
                      onClick={() => handleEdit(product)}
                    >
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      className="p-1 rounded-full hover:bg-green-100"
                      title="Delete"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="w-4 h-4 text-green-600" />
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
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {modalFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.inputType}
                    required={field.isRequired}
                    value={formData[field.key as keyof FormProduct] ?? ""}
                    onChange={(e) => {
                      const value =
                        field.inputType === "number"
                          ? Number(e.target.value)
                          : e.target.value;
                      setFormData({
                        ...formData,
                        [field.key]: value,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    setFormData(initialFormState);
                  }}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  {editingProduct ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
