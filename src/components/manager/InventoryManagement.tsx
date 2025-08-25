import React, { useState, useEffect, useRef } from "react";
import { Pencil, Trash2, ChevronDown } from "lucide-react";
import { VITE_BASE_URL } from "../../data";
import Swal from "sweetalert2";
import { useAuth } from "../../contexts/AuthContext";

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  supplier: string;
  supplierId?: string; // MongoDB supplier ID reference
  expiryDate: string;
  status?: string;
  branchId?: { _id: string; name: string } | string;
  // Human-readable fields only (no ID/UUID columns)
  store?: string;
  manufacturer?: string;
  composition?: string;
  series?: string;
  reservedQuantity?: number;
  purchasePriceExclVAT?: number;
  vat?: number;
  retailPriceVATIncluded?: number;
  divider?: string;
  dividerCustom?: string;
}

interface FormProduct {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  supplier: string;
  supplierId?: string; // MongoDB supplier ID reference
  expiryDate: string;
  // Human-readable fields for form
  store?: string;
  manufacturer?: string;
  composition?: string;
  series?: string;
  reservedQuantity?: number;
  purchasePriceExclVAT?: number;
  vat?: number;
  retailPriceVATIncluded?: number;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  address: string;
  productsSupplied: string[];
  email?: string;
  company?: string;
  gst?: string;
  status?: string;
  notes?: string;
}

const initialFormState: FormProduct = {
  id: "",
  name: "",
  category: "",
  stock: 0,
  minStock: 0,
  price: 0,
  supplier: "",
  supplierId: "",
  expiryDate: "",
  store: "",
  manufacturer: "",
  composition: "",
  series: "",
  reservedQuantity: 0,
  purchasePriceExclVAT: 0,
  vat: 0,
  retailPriceVATIncluded: 0,
};

const InventoryManagement: React.FC = () => {
  const { user } = useAuth();
  const BASE_URL = VITE_BASE_URL;
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<FormProduct>(initialFormState);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expiryFilter, setExpiryFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState<string>("All");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Helper to add status to a product
  const addStatus = (product: any) => {
    let status: "In Stock" | "Low Stock" | "Out of Stock";
    if (product.stock === 0) status = "Out of Stock";
    else if (product.stock <= product.minStock) status = "Low Stock";
    else status = "In Stock";
    return { ...product, status, id: product._id || product.id };
  };

  // Fetch suppliers from backend
  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${BASE_URL}/supplier`);
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      const data = await response.json();
      setSuppliers(data.map((s: any) => ({
        id: s._id,
        name: s.name ?? '',
        contact: s.contact ?? '',
        address: s.address ?? '',
        productsSupplied: s.productsSupplied ?? [],
        email: s.email ?? '',
        company: s.company ?? '',
        gst: s.gst ?? '',
        status: s.status ?? 'Active',
        notes: s.notes ?? '',
      })));
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Always fetch all products
        const response = await fetch(`${BASE_URL}/inventory`);
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        setProducts(data.map(addStatus));

        // Set branchFilter to user's branch name if available
        if (user?.branchId && data.length > 0) {
          // Find branch name for manager's branch
          const branchProduct = data.find(
            (p: any) =>
              typeof p.branchId === "object" && p.branchId?._id === user.branchId
          );
          const branchName = branchProduct?.branchId?.name ?? null;
          if (branchName) {
            setBranchFilter(branchName);
          }
        }
      } catch (err) {
        alert("Error fetching products: " + (err as Error).message);
      }
    };
    
    fetchProducts();
    fetchSuppliers();
  }, [BASE_URL, user?.branchId]);

  // Handle clicking outside supplier dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())
  ).slice(0, 10); // Limit to 10 results for better performance

  // Handle supplier selection
  const handleSupplierSelect = (supplier: Supplier) => {
    setFormData({ ...formData, supplier: supplier.name });
    setShowSupplierDropdown(false);
    setSupplierSearch(supplier.name);
  };

  // Handle supplier input change
  const handleSupplierInputChange = (value: string) => {
    setFormData({ ...formData, supplier: value });
    setSupplierSearch(value);
    if (value.trim() === '') {
      setShowSupplierDropdown(false);
    } else {
      setShowSupplierDropdown(true);
    }
  };

  // Handle supplier input focus
  const handleSupplierFocus = () => {
    setShowSupplierDropdown(true);
  };

  // Handle supplier input key down
  const handleSupplierKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setShowSupplierDropdown(false);
      // If there's a search term and no exact match, use it as the supplier
      if (supplierSearch.trim() && !suppliers.some(s => s.name.toLowerCase() === supplierSearch.toLowerCase())) {
        setFormData({ ...formData, supplier: supplierSearch.trim() });
      }
    }
  };

  // Import handler for Excel/PDF - Updated to use backend processing
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!user?.branchId) {
      Swal.fire({
        title: 'Branch Access Required',
        text: 'You must be logged in to a specific branch to import products.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
    
    const fileType = file.name.split(".").pop()?.toLowerCase();
    if (fileType === "xlsx" || fileType === "xls") {
      try {
        // Show confirmation dialog
        const confirmResult = await Swal.fire({
          title: 'Confirm Import',
          text: `Import products from "${file.name}" to your branch?`,
          html: `
            <div class="text-left">
              <p><strong>File:</strong> ${file.name}</p>
              <p><strong>Size:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Branch:</strong> ${user.branchId}</p>
              <p><strong>Smart Import:</strong> Existing products will be updated, new ones will be added</p>
              <p><strong>Stock Update:</strong> Stock will be ADDED to existing products (not replaced)</p>
              <p><strong>Supplier Management:</strong> New suppliers will be automatically created</p>
              <p><strong>Field Mapping:</strong> SKU → Product Name, Supplier Name → Supplier, Supplier Entity → Company, Manufacturer Name → Manufacturer, etc.</p>
              <p><strong>Matching criteria:</strong> Product Name + Composition + Supplier</p>
            </div>
          `,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes, Import',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33'
        });
        
        if (!confirmResult.isConfirmed) {
          return;
        }
        
        // Show loading message
        Swal.fire({
          title: 'Uploading and Processing...',
          text: 'Please wait while we process your Excel file...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        
        // Create FormData and send to backend
        const formData = new FormData();
        formData.append('file', file);
        formData.append('branchId', user.branchId);
        
        const response = await fetch(`${BASE_URL}/inventory/import-excel`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Show success message with summary
        const { summary } = result;
        Swal.fire({
          title: 'Import Successful!',
          html: `
            <div class="text-left">
              <p><strong>Total processed:</strong> ${summary.totalProcessed}</p>
              <p><strong>Products updated:</strong> ${summary.productsUpdated}</p>
              <p><strong>Products added:</strong> ${summary.productsAdded}</p>
              <p><strong>Stock added to existing products:</strong> +${summary.stockAdded}</p>
              <p><strong>Suppliers created:</strong> ${summary.suppliersCreated}</p>
              <p><strong>Unique suppliers:</strong> ${summary.uniqueSuppliers}</p>
              <p><strong>Unique manufacturers:</strong> ${summary.uniqueManufacturers}</p>
              <p><strong>Categories:</strong> ${summary.categories.join(', ')}</p>
              <p><strong>Total retail value:</strong> $${summary.totalRetailValue.toFixed(2)}</p>
              <p><strong>Total purchase value:</strong> $${summary.totalPurchaseValue.toFixed(2)}</p>
              <p><strong>Branch:</strong> ${user.branchId}</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Great!'
        });
        
        // Refresh products after import
        const productsResponse = await fetch(`${BASE_URL}/inventory`);
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData.map(addStatus));
          
          // Ensure branch filter is set to current branch
          if (user?.branchId && productsData.length > 0) {
            const branchProduct = productsData.find(
              (p: any) =>
                typeof p.branchId === "object" && p.branchId?._id === user.branchId
            );
            const branchName = branchProduct?.branchId?.name ?? null;
            if (branchName) {
              setBranchFilter(branchName);
            }
          }
        }
        
      } catch (err) {
        Swal.fire({
          title: 'Import Failed',
          text: "Error processing Excel file: " + (err as Error).message,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    } else if (fileType === "pdf") {
      alert("PDF import is not supported. Please use Excel file.");
    } else {
      alert(
        "Unsupported file type. Please upload an Excel (.xlsx/.xls) file."
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // First, check if supplier exists or create it
      let supplierId = formData.supplierId;
      
      if (!supplierId && formData.supplier.trim()) {
        // Check if supplier exists
        const supplierResponse = await fetch(`${BASE_URL}/supplier`);
        if (supplierResponse.ok) {
          const existingSuppliers = await supplierResponse.json();
          const existingSupplier = existingSuppliers.find(
            (s: any) => s.name.toLowerCase() === formData.supplier.toLowerCase()
          );
          
          if (existingSupplier) {
            supplierId = existingSupplier._id;
          } else {
            // Create new supplier
            const newSupplierData = {
              name: formData.supplier,
              contact: 'Added from inventory form',
              address: 'Address to be updated',
              email: '',
              company: '',
              gst: '',
              notes: '',
              productsSupplied: [],
              status: 'Active'
            };
            
            const createSupplierResponse = await fetch(`${BASE_URL}/supplier`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newSupplierData),
            });
            
            if (createSupplierResponse.ok) {
              const newSupplier = await createSupplierResponse.json();
              supplierId = newSupplier._id;
            }
          }
        }
      }

      // Prepare the data to send, including all new fields
      const submitData = {
        ...formData,
        branchId: user?.branchId,
        supplierId: supplierId, // Include supplier ID
        // Ensure all new fields are included
        store: formData.store || '',
        manufacturer: formData.manufacturer || '',
        composition: formData.composition || '',
        series: formData.series || '',
        reservedQuantity: formData.reservedQuantity || 0,
        purchasePriceExclVAT: formData.purchasePriceExclVAT || 0,
        vat: formData.vat || 0,
        retailPriceVATIncluded: formData.retailPriceVATIncluded || formData.price || 0,
      };

      if (editingProduct) {
        // Update product in backend
        const response = await fetch(
          `${BASE_URL}/inventory/${editingProduct.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(submitData),
          }
        );
        if (!response.ok) throw new Error("Failed to update product");
      } else {
        // Add product to backend
        const response = await fetch(`${BASE_URL}/inventory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });
        if (!response.ok) throw new Error("Failed to add product");
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData(initialFormState);
      setShowSupplierDropdown(false);
      setSupplierSearch("");
      // Refresh products after add/edit (fetch all products)
      const response = await fetch(`${BASE_URL}/inventory`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.map(addStatus));
        // Reset branchFilter to manager's branch name if available
        if (user?.branchId && data.length > 0) {
          // Find branch name for manager's branch
          const branchProduct = data.find(
            (p: any) =>
              typeof p.branchId === "object" && p.branchId?._id === user.branchId
          );
          const branchName = branchProduct?.branchId?.name ?? null;
          if (branchName) {
            setBranchFilter(branchName);
          }
        }
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
    
    // Populate form with all available fields
    setFormData({
      id: product.id,
      name: product.name,
      category: product.category,
      stock: product.stock,
      minStock: product.minStock,
      price: product.price,
      supplier: product.supplier,
      supplierId: product.supplierId || '', // Ensure supplierId is populated
      expiryDate: expiryDate,
      // New fields
      store: product.store || '',
      manufacturer: product.manufacturer || '',
      composition: product.composition || '',
      series: product.series || '',
      reservedQuantity: product.reservedQuantity || 0,
      purchasePriceExclVAT: product.purchasePriceExclVAT || 0,
      vat: product.vat || 0,
      retailPriceVATIncluded: product.retailPriceVATIncluded || product.price || 0,
    });
    
    setSupplierSearch(product.supplier);
    setShowSupplierDropdown(false);
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

  // Download Excel template
  // const downloadExcelTemplate = () => {
  //   const templateData = [
  //     {
  //       name: "Paracetamol 500mg",
  //       category: "Pain Relief",
  //       stock: 100,
  //       minStock: 20,
  //       price: 5.99,
  //       supplier: "ABC Pharmaceuticals",
  //       expiryDate: "2025-12-31"
  //     },
  //     {
  //       name: "Amoxicillin 250mg",
  //       category: "Antibiotics",
  //       stock: 50,
  //       minStock: 10,
  //       price: 12.99,
  //       supplier: "XYZ Medical",
  //       expiryDate: "2025-10-15"
  //     }
  //   ];

  //   const ws = XLSX.utils.json_to_sheet(templateData);
  //   const wb = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, "Products");
    
  //   // Auto-size columns
  //   const colWidths = [
  //     { wch: 20 }, // name
  //     { wch: 15 }, // category
  //     { wch: 10 }, // stock
  //     { wch: 10 }, // minStock
  //     { wch: 10 }, // price
  //     { wch: 20 }, // supplier
  //     { wch: 12 }  // expiryDate
  //   ];
  //   ws['!cols'] = colWidths;
    
  //   XLSX.writeFile(wb, "inventory_template.xlsx");
  // };

  // Get unique categories for dropdown - updated to include composition
  const categories = Array.from(
    new Set([
      ...products.map((p) => p.category).filter(Boolean),
      ...products.map((p) => p.composition).filter(Boolean)
    ])
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
      product.supplier.toLowerCase().includes(searchLower) ||
      (product.manufacturer && product.manufacturer.toLowerCase().includes(searchLower)) ||
      (product.composition && product.composition.toLowerCase().includes(searchLower)) ||
      (product.series && product.series.toLowerCase().includes(searchLower));
    const matchesCategory =
      categoryFilter.toLowerCase() === "all" || 
      product.category.toLowerCase() === categoryFilter.toLowerCase() ||
      (product.composition && product.composition.toLowerCase() === categoryFilter.toLowerCase());
    const expiryStatus = getExpiryStatus(product.expiryDate);
    const matchesExpiry =
      expiryFilter.toLowerCase() === "all" || expiryStatus.toLowerCase() === expiryFilter.toLowerCase();
    const productBranchName =
      typeof product.branchId === "object" && product.branchId?.name
        ? product.branchId.name
        : "N/A";
    const matchesBranch =
      branchFilter.toLowerCase() === "all" || productBranchName.toLowerCase() === branchFilter.toLowerCase();
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

  // Modal field array - updated to include new fields
  const modalFields = [
    { key: "name", label: "Product Name", inputType: "text", isRequired: true },
    { key: "category", label: "Category", inputType: "text", isRequired: true },
    { key: "manufacturer", label: "Manufacturer", inputType: "text", isRequired: false },
    { key: "composition", label: "Composition", inputType: "text", isRequired: false },
    { key: "stock", label: "Stock", inputType: "number", isRequired: true },
    {
      key: "minStock",
      label: "Min Stock",
      inputType: "number",
      isRequired: true,
    },
    { key: "price", label: "Price ($)", inputType: "number", isRequired: true },
    {
      key: "expiryDate",
      label: "Expiry Date",
      inputType: "date",
      isRequired: true,
    },
    { key: "series", label: "Series", inputType: "text", isRequired: false },
    { key: "reservedQuantity", label: "Reserved Quantity", inputType: "number", isRequired: false },
    { key: "purchasePriceExclVAT", label: "Purchase Price (excl. VAT)", inputType: "number", isRequired: false },
    { key: "vat", label: "VAT (%)", inputType: "number", isRequired: false },
    { key: "retailPriceVATIncluded", label: "Retail Price (incl. VAT)", inputType: "number", isRequired: false },
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
            accept=".xlsx,.xls"
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
            onClick={() => {
              setShowModal(true);
              setShowSupplierDropdown(false);
              setSupplierSearch("");
            }}
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Table - lucide-react icons for actions, name wraps, actions always visible */}
      <div className="rounded-lg shadow-lg overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-4 py-2 text-left max-w-[180px] w-1/6">Name</th>
              <th className="px-4 py-2 text-left">Manufacturer</th>
              <th className="px-4 py-2 text-left">Stock</th>
              <th className="px-4 py-2 text-left">Min Stock</th>
              <th className="px-4 py-2 text-left">Price</th>
              <th className="px-4 py-2 text-left">Supplier</th>
              <th className="px-4 py-2 text-left">Branch</th>
              <th className="px-4 py-2 text-left">Expiry Date</th>
              <th className="px-4 py-2 text-center">Status</th>
              <th className="px-4 py-2 text-center w-[110px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-4">
                  No products found.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-blue-50 transition">
                  <td className="px-4 py-2 font-semibold text-left break-words whitespace-normal max-w-[180px] w-1/6">
                    {product.name}
                  </td>
                  <td className="px-4 py-2 text-left text-sm">{product.manufacturer || 'N/A'}</td>
                  <td className="px-4 py-2 text-left">{product.stock}</td>
                  <td className="px-4 py-2 text-left">{product.minStock}</td>
                  <td className="px-4 py-2 text-left">${product.price}</td>
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
                  <td className="px-4 py-2 text-center flex gap-1 justify-center w-[110px] shrink-0">
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
              
              {/* Custom Supplier Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier *
                </label>
                <div className="relative" ref={supplierDropdownRef}>
                  <input
                    type="text"
                    required
                    value={formData.supplier}
                    onChange={(e) => handleSupplierInputChange(e.target.value)}
                    onFocus={handleSupplierFocus}
                    onKeyDown={handleSupplierKeyDown}
                    placeholder="Search or enter supplier name..."
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowSupplierDropdown(!showSupplierDropdown);
                      if (!showSupplierDropdown) {
                        if (formData.supplier.trim() === '') {
                          setSupplierSearch("");
                        } else {
                          setSupplierSearch(formData.supplier);
                        }
                      } else {
                        setSupplierSearch("");
                      }
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title="Toggle supplier dropdown"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSupplierDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Supplier Dropdown */}
                  {showSupplierDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredSuppliers.length > 0 ? (
                        filteredSuppliers.map((supplier) => (
                          <div
                            key={supplier.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => handleSupplierSelect(supplier)}
                          >
                            <div className="font-medium">{supplier.name}</div>
                            {supplier.company && (
                              <div className="text-sm text-gray-500">{supplier.company}</div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500">
                          {supplierSearch ? "No suppliers found" : "Type to search suppliers"}
                        </div>
                      )}
                      {supplierSearch && supplierSearch.trim() !== formData.supplier && (
                        <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                          Press Enter to add "{supplierSearch}" as new supplier
                        </div>
                      )}
                      {!supplierSearch && suppliers.length > 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                          {suppliers.length} suppliers available
                        </div>
                      )}
                      {suppliers.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                          No suppliers in system. Type to add new supplier.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    setFormData(initialFormState);
                    setShowSupplierDropdown(false);
                    setSupplierSearch("");
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
