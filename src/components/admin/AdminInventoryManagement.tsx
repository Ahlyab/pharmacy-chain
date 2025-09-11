import React, { useState, useEffect, useRef } from "react";
import { Building2, Plus, Search, Upload, ChevronDown } from "lucide-react";
import { apiEndpoints, api } from "../../utils/api";
import Swal from "sweetalert2";

import Spinner from "../Spinner";

interface Branch {
  _id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  status: string;
  inventoryCount?: number;
  totalStock?: number;
  lowStockCount?: number;
  outOfStockCount?: number;
}

interface Supplier {
  _id: string;
  name: string;
  contact: string;
  address: string;
  email?: string;
  company?: string;
  gst?: string;
  status?: string;
  notes?: string;
}

interface Product {
  _id?: string;
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  unitPrice?: number;
  units?: string;
  unitsPerPack?: number;
  shelfStock?: number;
  supplier: string;
  supplierId?: string;
  expiryDate: string;
  status?: string;
  branchId?: { _id: string; name: string } | string;
  store?: string;
  manufacturer?: string;
  composition?: string;
  series?: string;
  reservedQuantity?: number;
  purchasePriceExclVAT?: number;
  vat?: number;
  retailPriceVATIncluded?: number;
}

const AdminInventoryManagement: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Dropdown states
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const [sortField, setSortField] = useState<keyof Product>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [formData, setFormData] = useState({
    name: "",
    manufacturer: "",
    supplier: "",
    composition: "",
    stock: 0,
    minStock: 0,
    price: 0,
    unitPrice: 0,
    units: "pieces",
    unitsPerPack: 1,
    shelfStock: 0,
    purchasePriceExclVAT: 0,
    retailPriceVATIncluded: 0,
    vat: 0,
    expiryDate: "",
    series: "",
    reservedQuantity: 0,
  });

  // Fetch suppliers from backend
  const fetchSuppliers = async () => {
    try {
      const data = await apiEndpoints.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  // Fetch branches with inventory statistics
  const fetchBranches = async () => {
    try {
      const branchesData = await apiEndpoints.getBranches();

      // Fetch inventory statistics for each branch
      const branchesWithStats = await Promise.all(
        branchesData.map(async (branch: Branch) => {
          try {
            const inventoryData = await apiEndpoints.getInventory(branch._id);
            const branchProducts = inventoryData.filter(
              (p: Product) =>
                p.branchId === branch._id ||
                (typeof p.branchId === "object" &&
                  p.branchId?._id === branch._id)
            );

            const totalStock = branchProducts.reduce(
              (sum: number, p: Product) => sum + p.stock,
              0
            );
            const lowStockCount = branchProducts.filter(
              (p: Product) => p.stock <= p.minStock && p.stock > 0
            ).length;
            const outOfStockCount = branchProducts.filter(
              (p: Product) => p.stock === 0
            ).length;

            return {
              ...branch,
              inventoryCount: branchProducts.length,
              totalStock,
              lowStockCount,
              outOfStockCount,
            };
          } catch (error) {
            console.error(
              `Error fetching inventory for branch ${branch.name}:`,
              error
            );
            return {
              ...branch,
              inventoryCount: 0,
              totalStock: 0,
              lowStockCount: 0,
              outOfStockCount: 0,
            };
          }
        })
      );

      setBranches(branchesWithStats);
    } catch (error) {
      console.error("Error fetching branches:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to fetch branches",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Fetch products for a specific branch
  const fetchBranchProducts = async (branchId: string) => {
    try {
      setIsLoading(true);
      const data = await apiEndpoints.getInventory(branchId);

      // Filter products for the specific branch and add status
      const branchProducts = data
        .filter(
          (p: Product) =>
            p.branchId === branchId ||
            (typeof p.branchId === "object" && p.branchId?._id === branchId)
        )
        .map((product: Product) => {
          let status: "In Stock" | "Low Stock" | "Out of Stock";
          if (product.stock === 0) status = "Out of Stock";
          else if (product.stock <= product.minStock) status = "Low Stock";
          else status = "In Stock";
          return { ...product, status, id: product._id || product.id || "" };
        });

      setProducts(branchProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to fetch products for this branch",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchSuppliers();
  }, []);

  // Handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSupplierDropdown(false);
      }
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle branch selection
  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    fetchBranchProducts(branch._id);
  };

  // Handle back to branches view
  const handleBackToBranches = () => {
    setSelectedBranch(null);
    setProducts([]);
    setSearchTerm("");
    setStatusFilter("All");
    setSortField("name");
    setSortDirection("asc");
  };

  // Filter products based on search and status
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.manufacturer &&
        product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === "All" || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle sorting
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle undefined values
    if (aValue === undefined || aValue === null) aValue = "";
    if (bValue === undefined || bValue === null) bValue = "";

    // Convert to string for comparison
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (sortDirection === "asc") {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-green-100 text-green-800 border-green-200";
      case "Low Stock":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Out of Stock":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get sort indicator
  const getSortIndicator = (field: keyof Product) => {
    if (sortField !== field) return "↕️";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  // Filter suppliers based on search
  const filteredSuppliers = suppliers
    .filter((supplier) =>
      supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())
    )
    .slice(0, 10); // Limit to 10 results for better performance

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
    if (value.trim() === "") {
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
    if (e.key === "Enter") {
      setShowSupplierDropdown(false);
      // If there's a search term and no exact match, use it as the supplier
      if (
        supplierSearch.trim() &&
        !suppliers.some(
          (s) => s.name.toLowerCase() === supplierSearch.toLowerCase()
        )
      ) {
        setFormData({ ...formData, supplier: supplierSearch.trim() });
      }
    }
  };

  // Filter products based on search for dropdown
  const filteredProductsForDropdown = products
    .filter((product) =>
      product.name.toLowerCase().includes(productSearch.toLowerCase())
    )
    .slice(0, 10); // Limit to 10 results for better performance

  // Handle product selection from dropdown
  const handleProductSelect = (product: Product) => {
    setFormData({
      ...formData,
      name: product.name,
      manufacturer: product.manufacturer || "",
      composition: product.composition || "",
      series: product.series || "",
      supplier: product.supplier,
      price: product.price,
      unitPrice: product.unitPrice || 0,
      units: product.units || "pieces",
      unitsPerPack: product.unitsPerPack || 1,
      shelfStock: product.shelfStock || 0,
      purchasePriceExclVAT: product.purchasePriceExclVAT || 0,
      retailPriceVATIncluded:
        product.retailPriceVATIncluded || product.price || 0,
      vat: product.vat || 0,
    });
    setShowProductDropdown(false);
    setProductSearch(product.name);
  };

  // Handle product input change
  const handleProductInputChange = (value: string) => {
    setFormData({ ...formData, name: value });
    setProductSearch(value);
    if (value.trim() === "") {
      setShowProductDropdown(false);
    } else {
      setShowProductDropdown(true);
    }
  };

  // Handle product input focus
  const handleProductFocus = () => {
    setShowProductDropdown(true);
  };

  // Handle product input key down
  const handleProductKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setShowProductDropdown(false);
      // If there's a search term and no exact match, use it as the product name
      if (
        productSearch.trim() &&
        !products.some(
          (p) => p.name.toLowerCase() === productSearch.toLowerCase()
        )
      ) {
        setFormData({ ...formData, name: productSearch.trim() });
      }
    }
  };

  // Handle add/edit product
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    try {
      const submitData = {
        ...formData,
        branchId: selectedBranch._id,
        category: "",
      };

      // Debug logging to verify unitPrice and units are included
      console.log("AdminInventoryManagement - Form data:", formData);
      console.log("AdminInventoryManagement - Submit data:", submitData);
      console.log("AdminInventoryManagement - unitPrice:", submitData.unitPrice);
      console.log("AdminInventoryManagement - units:", submitData.units);

      if (editingProduct) {
        // Update existing product
        await apiEndpoints.updateInventory(editingProduct.id, submitData);
      } else {
        // Add new product
        await apiEndpoints.createInventory(submitData);
      }

      Swal.fire({
        title: "Success",
        text: editingProduct
          ? "Product updated successfully"
          : "Product added successfully",
        icon: "success",
        confirmButtonText: "OK",
      });

      setShowAddProductModal(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        manufacturer: "",
        supplier: "",
        composition: "",
        stock: 0,
        minStock: 0,
        price: 0,
        unitPrice: 0,
        units: "pieces",
        unitsPerPack: 1,
        shelfStock: 0,
        purchasePriceExclVAT: 0,
        retailPriceVATIncluded: 0,
        vat: 0,
        expiryDate: "",
        series: "",
        reservedQuantity: 0,
      });
      setShowSupplierDropdown(false);
      setSupplierSearch("");
      setShowProductDropdown(false);
      setProductSearch("");

      // Refresh products
      fetchBranchProducts(selectedBranch._id);
      // Refresh branches to update statistics
      fetchBranches();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: `Failed to ${editingProduct ? "update" : "add"} product: ${
          (error as Error).message
        }`,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Handle edit product
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      manufacturer: product.manufacturer || "",
      supplier: product.supplier,
      composition: product.composition || "",
      stock: product.stock,
      minStock: product.minStock,
      price: product.price,
      unitPrice: product.unitPrice || 0,
      units: product.units || "pieces",
      purchasePriceExclVAT: product.purchasePriceExclVAT || 0,
      retailPriceVATIncluded: product.retailPriceVATIncluded || product.price,
      vat: product.vat || 0,
      expiryDate: product.expiryDate
        ? new Date(product.expiryDate).toISOString().slice(0, 10)
        : "",
      series: product.series || "",
      reservedQuantity: product.reservedQuantity || 0,
    });
    setShowAddProductModal(true);
  };

  // Handle file import for products
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedBranch) {
      Swal.fire({
        title: "Branch Required",
        text: "Please select a branch first before importing products.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    const fileType = file.name.split(".").pop()?.toLowerCase();
    if (fileType === "xlsx" || fileType === "xls") {
      try {
        // Show confirmation dialog
        const confirmResult = await Swal.fire({
          title: "Confirm Import",
          text: `Import products from "${file.name}" to ${selectedBranch.name} branch?`,
          html: `
            <div class="text-left">
              <p><strong>File:</strong> ${file.name}</p>
              <p><strong>Size:</strong> ${(file.size / 1024 / 1024).toFixed(
                2
              )} MB</p>
              <p><strong>Branch:</strong> ${selectedBranch.name}</p>
              <p><strong>Smart Import:</strong> Existing products will be updated, new ones will be added</p>
              <p><strong>Stock Update:</strong> Stock will be ADDED to existing products (not replaced)</p>
              <p><strong>Field Mapping:</strong> Product Name, Supplier, Stock, Price, etc.</p>
              <p><strong>Matching criteria:</strong> Product Name + Supplier</p>
            </div>
          `,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Yes, Import",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
        });

        if (!confirmResult.isConfirmed) {
          return;
        }

        // Show loading message
        Swal.fire({
          title: "Uploading and Processing...",
          text: "Please wait while we process your Excel file...",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        // Create FormData and send to backend
        const formData = new FormData();
        formData.append("file", file);
        formData.append("branchId", selectedBranch._id);

        const result = await api.upload(
          "/api/inventory/import-excel",
          formData
        );

        // Show success message with summary
        const { summary } = result;
        Swal.fire({
          title: "Import Successful!",
          html: `
            <div class="text-left">
              <p><strong>Total processed:</strong> ${summary.totalProcessed}</p>
              <p><strong>Products updated:</strong> ${
                summary.productsUpdated
              }</p>
              <p><strong>Products added:</strong> ${summary.productsAdded}</p>
              <p><strong>Stock added to existing products:</strong> +${
                summary.stockAdded
              }</p>
              <p><strong>Suppliers created:</strong> ${
                summary.suppliersCreated
              }</p>
              <p><strong>Unique suppliers:</strong> ${
                summary.uniqueSuppliers
              }</p>
              <p><strong>Unique manufacturers:</strong> ${
                summary.uniqueManufacturers
              }</p>
              <p><strong>Categories:</strong> ${summary.categories.join(
                ", "
              )}</p>
              <p><strong>Total retail value:</strong> $${summary.totalRetailValue.toFixed(
                2
              )}</p>
              <p><strong>Total purchase value:</strong> $${summary.totalPurchaseValue.toFixed(
                2
              )}</p>
              <p><strong>Branch:</strong> ${selectedBranch.name}</p>
            </div>
          `,
          icon: "success",
          confirmButtonText: "Great!",
        });

        // Refresh products after import
        fetchBranchProducts(selectedBranch._id);
        // Refresh branches to update statistics
        fetchBranches();
      } catch (err) {
        console.error("Import error:", err);
        Swal.fire({
          title: "Import Failed",
          text: "Error processing Excel file: " + (err as Error).message,
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    } else if (fileType === "pdf") {
      Swal.fire({
        title: "Unsupported File Type",
        text: "PDF import is not supported. Please use Excel file.",
        icon: "warning",
        confirmButtonText: "OK",
      });
    } else {
      Swal.fire({
        title: "Unsupported File Type",
        text: "Unsupported file type. Please upload an Excel (.xlsx/.xls) file.",
        icon: "warning",
        confirmButtonText: "OK",
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle delete product
  const handleDelete = async (productId: string) => {
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
        await apiEndpoints.deleteInventory(productId);

        Swal.fire("Deleted!", "Product has been deleted.", "success");

        // Refresh products and branches
        if (selectedBranch) {
          fetchBranchProducts(selectedBranch._id);
          fetchBranches();
        }
      } catch (error) {
        Swal.fire(
          "Error",
          `Failed to delete product: ${(error as Error).message}`,
          "error"
        );
      }
    }
  };

  if (isLoading && selectedBranch) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {selectedBranch
              ? `${selectedBranch.name} Inventory`
              : "Branch Inventory Management"}
          </h1>
          <p className="text-gray-600">
            {selectedBranch
              ? `Manage inventory for ${selectedBranch.name} branch`
              : "Select a branch to view and manage its inventory"}
          </p>
        </div>

        {selectedBranch && (
          <div className="flex gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleImportFile}
            />
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              Import Products
            </button>

            <button
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  name: "",
                  manufacturer: "",
                  supplier: "",
                  composition: "",
                  stock: 0,
                  minStock: 0,
                  price: 0,
                  unitPrice: 0,
                  units: "pieces",
                  purchasePriceExclVAT: 0,
                  retailPriceVATIncluded: 0,
                  vat: 0,
                  expiryDate: "",
                  series: "",
                  reservedQuantity: 0,
                });
                setShowAddProductModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        )}
      </div>

      {/* Back button when viewing branch inventory */}
      {selectedBranch && (
        <button
          onClick={handleBackToBranches}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          ← Back to Branches
        </button>
      )}

      {/* Branch Cards View */}
      {!selectedBranch && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <div
              key={branch._id}
              onClick={() => handleBranchSelect(branch)}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-blue-500"
            >
              <div className="flex items-center justify-between mb-4">
                <Building2 className="w-8 h-8 text-blue-600" />
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    branch.status === "Active"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {branch.status}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {branch.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4">{branch.address}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {branch.inventoryCount || 0}
                  </div>
                  <div className="text-gray-500">Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {branch.totalStock || 0}
                  </div>
                  <div className="text-gray-500">Total Stock</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-yellow-600">
                    Low Stock: {branch.lowStockCount || 0}
                  </span>
                  <span className="text-red-600">
                    Out of Stock: {branch.outOfStockCount || 0}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors">
                    Click for details →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Branch Inventory View */}
      {selectedBranch && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Product
                        <span className="text-xs">
                          {getSortIndicator("name")}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("stock")}
                    >
                      <div className="flex items-center gap-1">
                        Stock
                        <span className="text-xs">
                          {getSortIndicator("stock")}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("minStock")}
                    >
                      <div className="flex items-center gap-1">
                        Min Stock
                        <span className="text-xs">
                          {getSortIndicator("minStock")}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center gap-1">
                        Price
                        <span className="text-xs">
                          {getSortIndicator("price")}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("supplier")}
                    >
                      <div className="flex items-center gap-1">
                        Supplier
                        <span className="text-xs">
                          {getSortIndicator("supplier")}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("expiryDate")}
                    >
                      <div className="flex items-center gap-1">
                        Expiry Date
                        <span className="text-xs">
                          {getSortIndicator("expiryDate")}
                        </span>
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        <span className="text-xs">
                          {getSortIndicator("status")}
                        </span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No products found
                      </td>
                    </tr>
                  ) : (
                    sortedProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            {product.manufacturer && (
                              <div className="text-sm text-gray-500">
                                {product.manufacturer}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.minStock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${product.price}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.supplier}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.expiryDate
                            ? new Date(product.expiryDate)
                                .toISOString()
                                .slice(0, 10)
                            : ""}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              product.status || ""
                            )}`}
                          >
                            {product.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Product Modal */}
      {showAddProductModal && selectedBranch && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <div className="relative" ref={productDropdownRef}>
                  <input
                    type="text"
                    required
                    value={formData.name}
                      onChange={(e) => handleProductInputChange(e.target.value)}
                      onFocus={handleProductFocus}
                      onKeyDown={handleProductKeyDown}
                      placeholder="Search or enter product name..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductDropdown(!showProductDropdown);
                        if (!showProductDropdown) {
                          if (formData.name.trim() === "") {
                            setProductSearch("");
                          } else {
                            setProductSearch(formData.name);
                          }
                        } else {
                          setProductSearch("");
                        }
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Toggle product dropdown"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          showProductDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Product Dropdown */}
                    {showProductDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredProductsForDropdown.length > 0 ? (
                          filteredProductsForDropdown.map((product) => (
                            <div
                              key={product.id}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => handleProductSelect(product)}
                            >
                              <div className="font-medium">{product.name}</div>
                              {product.manufacturer && (
                                <div className="text-sm text-gray-500">
                                  {product.manufacturer}
                                </div>
                              )}
                              {product.composition && (
                                <div className="text-sm text-gray-500">
                                  {product.composition}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500">
                            {productSearch
                              ? "No products found"
                              : "Type to search products"}
                          </div>
                        )}
                        {productSearch &&
                          productSearch.trim() !== formData.name && (
                            <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                              Press Enter to add "{productSearch}" as new product
                            </div>
                          )}
                        {!productSearch && products.length > 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                            {products.length} products available
                          </div>
                        )}
                        {products.length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                            No products in system. Type to add new product.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) =>
                      setFormData({ ...formData, manufacturer: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

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
                          if (formData.supplier.trim() === "") {
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
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          showSupplierDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Supplier Dropdown */}
                    {showSupplierDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredSuppliers.length > 0 ? (
                          filteredSuppliers.map((supplier) => (
                            <div
                              key={supplier._id}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => handleSupplierSelect(supplier)}
                            >
                              <div className="font-medium">{supplier.name}</div>
                              {supplier.company && (
                                <div className="text-sm text-gray-500">
                                  {supplier.company}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500">
                            {supplierSearch
                              ? "No suppliers found"
                              : "Type to search suppliers"}
                          </div>
                        )}
                        {supplierSearch &&
                          supplierSearch.trim() !== formData.supplier && (
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Composition
                  </label>
                  <input
                    type="text"
                    value={formData.composition}
                    onChange={(e) =>
                      setFormData({ ...formData, composition: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Stock *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minStock: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Units
                  </label>
                  <input
                    type="text"
                    value={formData.units}
                    onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="pieces, tablets, bottles, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Units Per Pack
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.unitsPerPack}
                    onChange={(e) => setFormData({ ...formData, unitsPerPack: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shelf Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.shelfStock}
                    onChange={(e) => setFormData({ ...formData, shelfStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchasePriceExclVAT}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        purchasePriceExclVAT: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retail Price (incl. VAT)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.retailPriceVATIncluded}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        retailPriceVATIncluded: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VAT (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.vat}
                    onChange={(e) =>
                      setFormData({ ...formData, vat: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, expiryDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Series
                  </label>
                  <input
                    type="text"
                    value={formData.series}
                    onChange={(e) =>
                      setFormData({ ...formData, series: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reserved Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reservedQuantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reservedQuantity: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProductModal(false);
                    setEditingProduct(null);
                    setFormData({
                      name: "",
                      manufacturer: "",
                      supplier: "",
                      composition: "",
                      stock: 0,
                      minStock: 0,
                      price: 0,
                      unitPrice: 0,
                      units: "pieces",
                      unitsPerPack: 1,
                      shelfStock: 0,
                      purchasePriceExclVAT: 0,
                      retailPriceVATIncluded: 0,
                      vat: 0,
                      expiryDate: "",
                      series: "",
                      reservedQuantity: 0,
                    });
                    setShowSupplierDropdown(false);
                    setSupplierSearch("");
                    setShowProductDropdown(false);
                    setProductSearch("");
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingProduct ? "Update Product" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventoryManagement;
