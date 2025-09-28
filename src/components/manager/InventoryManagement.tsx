import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Shield, Package, Save, XCircle } from "lucide-react";
import { VITE_BASE_URL } from "../../data";
import Swal from "sweetalert2";
import { useAuth } from "../../contexts/AuthContext";
import { apiEndpoints } from "../../utils/api";
import Spinner from "../Spinner";

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  unitPrice?: number; // Unit price field
  units?: string; // Unit of measurement (tablets, bottles, boxes, etc.)
  shelfStock?: number; // Stock on shelf/display
  unitsPerPack?: number; // Number of units per pack
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
  unitPrice?: number; // Unit price field
  units?: string; // Unit of measurement (tablets, bottles, boxes, etc.)
  shelfStock?: number; // Stock on shelf/display
  unitsPerPack?: number; // Number of units per pack
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

interface Branch {
  _id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  manager?: string;
  status?: string;
}

const initialFormState: FormProduct = {
  id: "",
  name: "",
  category: "", // Keep empty category for backend compatibility
  stock: 0,
  minStock: 0,
  price: 0,
  unitPrice: 0, // Initialize unit price
  units: "pieces", // Initialize units
  shelfStock: 0, // Initialize shelf stock
  unitsPerPack: 1, // Initialize per pack unit
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

  const token = localStorage.getItem("token");

  // Helper function to determine actual role for access control
  const getActualRole = (user: any) => {
    if (!user) return null;
    return user.role.toLowerCase();
  };
  const BASE_URL = VITE_BASE_URL;
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<FormProduct>(initialFormState);
  const [search, setSearch] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState<string>("All");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Stock-taking state variables
  const [showStockTakingModal, setShowStockTakingModal] = useState(false);
  const [stockTakingData, setStockTakingData] = useState<{
    [key: string]: {
      actualStock: number;
      status: "IN_STOCK" | "MISSING" | "PART" | "SHRINKAGE";
      notes?: string;
    };
  }>({});
  const [isSubmittingStockTaking, setIsSubmittingStockTaking] = useState(false);
  const [stockTakingRecords, setStockTakingRecords] = useState<{
    [key: string]: {
      actualStock: number;
      status: string;
      notes?: string;
      recordedAt: string;
      recordedBy: string;
    };
  }>({});

  // Helper to add status to a product
  const addStatus = (product: any): Product => {
    let status: "In Stock" | "Low Stock" | "Out of Stock";
    if (product.stock === 0) status = "Out of Stock";
    else if (product.stock <= product.minStock) status = "Low Stock";
    else status = "In Stock";
    return { ...product, status, id: product._id || product.id };
  };

  // Helper to check if a string is a valid MongoDB ObjectId
  const isValidObjectId = (id: string): boolean => {
    if (!id || typeof id !== "string") return false;
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // Fetch suppliers from backend
  const fetchSuppliers = async () => {
    try {
      const data = await apiEndpoints.getSuppliers();
      setSuppliers(
        data.map((s: any) => ({
          id: s._id,
          name: s.name ?? "",
          contact: s.contact ?? "",
          address: s.address ?? "",
          productsSupplied: s.productsSupplied ?? [],
          email: s.email ?? "",
          company: s.company ?? "",
          gst: s.gst ?? "",
          status: s.status ?? "Active",
          notes: s.notes ?? "",
        }))
      );
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  // Fetch branches from backend
  const fetchBranches = async () => {
    try {
      const data = await apiEndpoints.getBranches();
      setBranches(data);
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  };

  // Fetch stock-taking records from backend
  const fetchStockTakingRecords = async () => {
    try {
      const response = await fetch(`${BASE_URL}/stock-taking/records`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const responseData = await response.json();
        console.log("Stock taking API response:", responseData);

        // Handle the nested data structure from the API
        const data =
          responseData.data?.records || responseData.records || responseData;

        if (!Array.isArray(data)) {
          console.error("Stock taking data is not an array:", data);
          return;
        }

        console.log("Stock taking data:", data);

        // Convert array to object keyed by productId for easy lookup
        const recordsMap: { [key: string]: any } = {};
        data.forEach((record: any) => {
          recordsMap[record.productId._id] = {
            actualStock: record.actualStock,
            status: record.status,
            notes: record.notes,
            recordedAt: record.recordedAt,
            recordedBy: record.recordedBy,
          };
        });

        console.log("Stock taking records:", recordsMap);
        setStockTakingRecords(recordsMap);
      }
    } catch (err) {
      console.error("Error fetching stock-taking records:", err);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        // Always fetch all products using authenticated API
        const data = await apiEndpoints.getInventory();
        setProducts(data.map(addStatus));
      } catch (err) {
        Swal.fire({
          title: "Error",
          text: "Error fetching products: " + (err as Error).message,
          icon: "error",
          confirmButtonText: "OK",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
    fetchSuppliers();
    fetchBranches();
    fetchStockTakingRecords();
  }, [BASE_URL, user?.branchId]);

  // Set branch filter to manager's assigned branch when branches are loaded
  useEffect(() => {
    if (user?.branchId && branches.length > 0) {
      const managerBranch = branches.find(
        (branch) => branch._id === user.branchId
      );
      if (managerBranch) {
        setBranchFilter(managerBranch.name);
      }
    }
  }, [branches, user?.branchId]);

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
      supplierId: product.supplierId || "",
      price: product.price,
      unitPrice: product.unitPrice || 0,
      units: product.units || "pieces",
      unitsPerPack: product.unitsPerPack || 1,
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

  // Import handler for Excel/PDF - Updated to use backend processing
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user?.branchId) {
      Swal.fire({
        title: "Branch Access Required",
        text: "You must be logged in to a specific branch to import products.",
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
          text: `Import products from "${file.name}" to your branch?`,
          html: `
            <div class="text-left">
              <p><strong>File:</strong> ${file.name}</p>
              <p><strong>Size:</strong> ${(file.size / 1024 / 1024).toFixed(
                2
              )} MB</p>
              <p><strong>Branch:</strong> ${user.branchId}</p>
              <p><strong>Smart Import:</strong> Existing products will be updated, new ones will be added</p>
              <p><strong>Stock Update:</strong> Stock will be ADDED to existing products (not replaced)</p>
              <p><strong>Supplier Management:</strong> New suppliers will be automatically created</p>
              <p><strong>Field Mapping:</strong> SKU → Product Name, Supplier Name → Supplier, Supplier Entity → Company, Manufacturer Name → Manufacturer, etc.</p>
              <p><strong>Matching criteria:</strong> Product Name + Composition + Supplier</p>
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
        formData.append("branchId", user.branchId);

        const response = await fetch(`${BASE_URL}/inventory/import-excel`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const result = await response.json();

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
              <p><strong>Total retail value:</strong> #{summary.totalRetailValue.toFixed(
                2
              )}</p>
              <p><strong>Total purchase value:</strong> #{summary.totalPurchaseValue.toFixed(
                2
              )}</p>
              <p><strong>Branch:</strong> ${user.branchId}</p>
            </div>
          `,
          icon: "success",
          confirmButtonText: "Great!",
        });

        // Refresh products after import
        setIsLoading(true);
        const productsResponse = await fetch(`${BASE_URL}/inventory`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData.map(addStatus));

          // Refresh branches and set correct branch filter
          await fetchBranches();
          if (user?.branchId && branches.length > 0) {
            const managerBranch = branches.find(
              (branch) => branch._id === user.branchId
            );
            if (managerBranch) {
              setBranchFilter(managerBranch.name);
            }
          }
        }
        setIsLoading(false);
      } catch (err) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Check if product already exists (same name, composition, and supplier)
      const existingProduct = products.find(
        (p) =>
          p.name.toLowerCase() === formData.name.toLowerCase() &&
          p.composition?.toLowerCase() ===
            formData.composition?.toLowerCase() &&
          p.supplier.toLowerCase() === formData.supplier.toLowerCase()
      );

      if (existingProduct && !editingProduct) {
        // Product exists, populate form with existing product details
        let expiryDate = existingProduct.expiryDate;
        if (expiryDate && expiryDate.length > 10) {
          expiryDate = new Date(expiryDate).toISOString().slice(0, 10);
        }

        // Populate form with existing product details
        setFormData({
          id: existingProduct.id,
          name: existingProduct.name,
          category: "", // Set empty category since we removed it from UI
          stock: existingProduct.stock,
          minStock: existingProduct.minStock,
          price: existingProduct.price,
          unitPrice: existingProduct.unitPrice || 0,
          units: existingProduct.units || "pieces",
          shelfStock: existingProduct.shelfStock || 0,
          unitsPerPack: existingProduct.unitsPerPack || 1,
          supplier: existingProduct.supplier,
          supplierId: existingProduct.supplierId || "",
          expiryDate: expiryDate,
          // New fields
          store: existingProduct.store || "",
          manufacturer: existingProduct.manufacturer || "",
          composition: existingProduct.composition || "",
          series: existingProduct.series || "",
          reservedQuantity: existingProduct.reservedQuantity || 0,
          purchasePriceExclVAT: existingProduct.purchasePriceExclVAT || 0,
          vat: existingProduct.vat || 0,
          retailPriceVATIncluded:
            existingProduct.retailPriceVATIncluded ||
            existingProduct.price ||
            0,
        });

        setSupplierSearch(existingProduct.supplier);
        setProductSearch(existingProduct.name);
        setShowSupplierDropdown(false);
        setShowProductDropdown(false);
        setEditingProduct(existingProduct);

        // Show confirmation dialog with existing product details
        const result = await Swal.fire({
          title: "Product Already Exists",
          html: `
            <div class="text-left">
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📦 Product Details</h4>
                <p style="margin: 5px 0;"><strong>Product Name:</strong> ${
                  existingProduct.name
                }</p>
                <p style="margin: 5px 0;"><strong>Manufacturer:</strong> ${
                  existingProduct.manufacturer || "N/A"
                }</p>
                <p style="margin: 5px 0;"><strong>Composition:</strong> ${
                  existingProduct.composition || "N/A"
                }</p>
                <p style="margin: 5px 0;"><strong>Series:</strong> ${
                  existingProduct.series || "N/A"
                }</p>
              </div>
              
              <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📊 Stock & Pricing</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div>
                    <p style="margin: 5px 0;"><strong>Current Stock:</strong> ${
                      existingProduct.stock
                    }</p>
                    <p style="margin: 5px 0;"><strong>Shelf Stock:</strong> ${
                      existingProduct.shelfStock || 0
                    }</p>
                    <p style="margin: 5px 0;"><strong>Min Stock:</strong> ${
                      existingProduct.minStock
                    }</p>
                    <p style="margin: 5px 0;"><strong>Units:</strong> ${
                      existingProduct.units || "pieces"
                    }</p>
                    <p style="margin: 5px 0;"><strong>Per Pack Unit:</strong> ${
                      existingProduct.unitsPerPack || 1
                    }</p>
                  </div>
                  <div>
                    <p style="margin: 5px 0;"><strong>Selling Price:</strong> #{existingProduct.price}</p>
                    <p style="margin: 5px 0;"><strong>Unit Price:</strong> #{existingProduct.unitPrice || 0}</p>
                    <p style="margin: 5px 0;"><strong>Cost Price:</strong> #{existingProduct.purchasePriceExclVAT || 0}</p>
                    <p style="margin: 5px 0;"><strong>Retail Price (VAT):</strong> #{existingProduct.retailPriceVATIncluded || existingProduct.price}</p>
                    <p style="margin: 5px 0;"><strong>VAT:</strong> ${
                      existingProduct.vat || 0
                    }%</p>
                  </div>
                </div>
              </div>
              
              <div style="background: #f0f8f0; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #2c3e50;">🏢 Supplier & Dates</h4>
                <p style="margin: 5px 0;"><strong>Supplier:</strong> ${
                  existingProduct.supplier
                }</p>
                <p style="margin: 5px 0;"><strong>Expiry Date:</strong> ${
                  existingProduct.expiryDate
                    ? new Date(existingProduct.expiryDate).toLocaleDateString()
                    : "N/A"
                }</p>
                <p style="margin: 5px 0;"><strong>Reserved Quantity:</strong> ${
                  existingProduct.reservedQuantity || 0
                }</p>
                <p style="margin: 5px 0;"><strong>Store:</strong> ${
                  existingProduct.store || "N/A"
                }</p>
              </div>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ What would you like to do?</h4>
                <p style="margin: 5px 0; color: #856404;">This product already exists in your inventory. Choose an action below:</p>
              </div>
            </div>
          `,
          icon: "info",
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: "✏️ Edit Existing Product",
          denyButtonText: "📦 Add Stock Only",
          cancelButtonText: "❌ Cancel",
          confirmButtonColor: "#3085d6",
          denyButtonColor: "#28a745",
          cancelButtonColor: "#d33",
          width: "600px",
        });

        if (result.isDenied) {
          // User wants to add stock only - show simplified form with just stock field
          const stockResult = await Swal.fire({
            title: "Add Stock to Existing Product",
            html: `
              <div class="text-left">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                  <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📦 Product Information</h4>
                  <p style="margin: 5px 0;"><strong>Product:</strong> ${
                    existingProduct.name
                  }</p>
                  <p style="margin: 5px 0;"><strong>Manufacturer:</strong> ${
                    existingProduct.manufacturer || "N/A"
                  }</p>
                  <p style="margin: 5px 0;"><strong>Supplier:</strong> ${
                    existingProduct.supplier
                  }</p>
                </div>
                
                <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                  <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📊 Current Stock Details</h4>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                      <p style="margin: 5px 0;"><strong>Current Stock:</strong> ${
                        existingProduct.stock
                      }</p>
                      <p style="margin: 5px 0;"><strong>Shelf Stock:</strong> ${
                        existingProduct.shelfStock || 0
                      }</p>
                      <p style="margin: 5px 0;"><strong>Min Stock:</strong> ${
                        existingProduct.minStock
                      }</p>
                    </div>
                    <div>
                      <p style="margin: 5px 0;"><strong>Units:</strong> ${
                        existingProduct.units || "pieces"
                      }</p>
                      <p style="margin: 5px 0;"><strong>Per Pack Unit:</strong> ${
                        existingProduct.unitsPerPack || 1
                      }</p>
                      <p style="margin: 5px 0;"><strong>Price:</strong> #{existingProduct.price}</p>
                    </div>
                  </div>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                  <h4 style="margin: 0 0 10px 0; color: #856404;">➕ Add Stock</h4>
                  <p style="margin: 5px 0; color: #856404;">Enter the amount of stock to add to this product:</p>
                  <input type="number" id="stockToAdd" class="swal2-input" placeholder="Enter stock to add" min="1" value="${
                    formData.stock
                  }" style="margin-top: 10px;">
                </div>
              </div>
            `,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "📦 Add Stock",
            cancelButtonText: "❌ Cancel",
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            width: "500px",
            preConfirm: () => {
              const stockToAdd = document.getElementById(
                "stockToAdd"
              ) as HTMLInputElement;
              const stockValue = parseInt(stockToAdd.value);
              if (!stockValue || stockValue <= 0) {
                Swal.showValidationMessage("Please enter a valid stock amount");
                return false;
              }
              return stockValue;
            },
          });

          if (stockResult.isConfirmed) {
            const stockToAdd = stockResult.value;
            const newStock = existingProduct.stock + stockToAdd;
            const updateData = {
              stock: newStock,
            };

            const response = await fetch(
              `${BASE_URL}/inventory/${existingProduct.id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updateData),
              }
            );

            if (!response.ok)
              throw new Error("Failed to update existing product");

            Swal.fire({
              title: "Stock Updated!",
              text: `Added ${stockToAdd} units to existing product. New total: ${newStock}`,
              icon: "success",
              confirmButtonText: "Great!",
            });

            // Refresh products
            const productsResponse = await fetch(`${BASE_URL}/inventory`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (productsResponse.ok) {
              const data = await productsResponse.json();
              setProducts(data.map(addStatus));
            }
            setIsSubmitting(false);
            return;
          } else {
            // User cancelled stock addition
            setIsSubmitting(false);
            return;
          }
        } else if (result.isConfirmed) {
          // User wants to edit existing product - form is already populated
          // Just show the modal with populated data
          setShowModal(true);
          setIsSubmitting(false);
          return;
        } else {
          // User cancelled
          setIsSubmitting(false);
          return;
        }
      }

      // First, check if supplier exists or create it
      let supplierId = formData.supplierId;

      if (!supplierId && formData.supplier.trim()) {
        // Check if supplier exists
        const supplierResponse = await fetch(`${BASE_URL}/supplier`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
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
              contact: "Added from inventory form",
              address: "Address to be updated",
              email: "",
              company: "",
              gst: "",
              notes: "",
              productsSupplied: [],
              status: "Active",
            };

            const createSupplierResponse = await fetch(`${BASE_URL}/supplier`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
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
        // Only include branchId if it's a valid MongoDB ObjectId
        ...(user?.branchId &&
          isValidObjectId(user.branchId) && { branchId: user.branchId }),
        // Only include supplierId if it's a valid MongoDB ObjectId
        ...(supplierId &&
          isValidObjectId(supplierId) && { supplierId: supplierId }),
        category: "", // Send empty category to maintain compatibility
        // Ensure all new fields are included
        store: formData.store || "",
        manufacturer: formData.manufacturer || "",
        composition: formData.composition || "",
        series: formData.series || "",
        reservedQuantity: formData.reservedQuantity || 0,
        unitPrice: formData.unitPrice || 0,
        units: formData.units || "pieces",
        shelfStock: formData.shelfStock || 0,
        unitsPerPack: formData.unitsPerPack || 1,
        purchasePriceExclVAT: formData.purchasePriceExclVAT || 0,
        vat: formData.vat || 0,
        retailPriceVATIncluded:
          formData.retailPriceVATIncluded || formData.price || 0,
      };

      if (editingProduct) {
        // Update product in backend - ensure all required fields are included
        const updateData = {
          ...submitData,
          // Ensure these fields are explicitly included for updates
          name: submitData.name,
          stock: submitData.stock,
          minStock: submitData.minStock,
          price: submitData.price,
          supplier: submitData.supplier,
          // Only include supplierId if it's a valid MongoDB ObjectId
          ...(submitData.supplierId &&
            isValidObjectId(submitData.supplierId) && {
              supplierId: submitData.supplierId,
            }),
          // Only include branchId if it's a valid MongoDB ObjectId
          ...(user?.branchId &&
            isValidObjectId(user.branchId) && { branchId: user.branchId }),
          expiryDate: submitData.expiryDate,
          // Include all optional fields
          store: submitData.store || "",
          manufacturer: submitData.manufacturer || "",
          composition: submitData.composition || "",
          series: submitData.series || "",
          reservedQuantity: submitData.reservedQuantity || 0,
          unitPrice: submitData.unitPrice || 0,
          units: submitData.units || "pieces",
          shelfStock: submitData.shelfStock || 0,
          unitsPerPack: submitData.unitsPerPack || 1,
          purchasePriceExclVAT: submitData.purchasePriceExclVAT || 0,
          vat: submitData.vat || 0,
          retailPriceVATIncluded:
            submitData.retailPriceVATIncluded || submitData.price || 0,
        };

        // Debug logging
        console.log("Updating product with data:", updateData);
        console.log("Product ID being updated:", editingProduct.id);
        console.log("Form data before update:", formData);

        // Check for undefined/null values
        Object.entries(updateData).forEach(([key, value]) => {
          if (value === undefined || value === null) {
            console.warn(`Field ${key} has value:`, value);
          }
        });

        // Validate required fields before sending
        if (
          !updateData.name ||
          !updateData.stock ||
          !updateData.minStock ||
          !updateData.price ||
          !updateData.supplier ||
          !updateData.expiryDate
        ) {
          throw new Error(
            "Missing required fields: name, stock, minStock, price, supplier, and expiryDate are required"
          );
        }

        // Ensure user has a valid branch
        if (!user?.branchId || !isValidObjectId(user.branchId)) {
          throw new Error("User must be assigned to a valid branch");
        }

        // Ensure expiryDate is in proper format
        if (updateData.expiryDate) {
          try {
            new Date(updateData.expiryDate);
          } catch (error) {
            throw new Error("Invalid expiry date format");
          }
        }

        // Ensure numeric fields are numbers
        if (
          typeof updateData.stock !== "number" ||
          typeof updateData.minStock !== "number" ||
          typeof updateData.price !== "number"
        ) {
          throw new Error("Stock, minStock, and price must be valid numbers");
        }

        // Final validation - ensure no empty strings for required fields
        if (!updateData.name.trim() || !updateData.supplier.trim()) {
          throw new Error("Product name and supplier cannot be empty");
        }

        // Clean up the data before sending - remove any undefined values and convert types
        const cleanUpdateData = Object.fromEntries(
          Object.entries(updateData)
            .filter(
              ([_, value]) =>
                value !== undefined && value !== null && value !== ""
            )
            .map(([key, value]) => {
              // Convert numeric fields to numbers
              if (
                [
                  "stock",
                  "minStock",
                  "price",
                  "unitPrice",
                  "shelfStock",
                  "unitsPerPack",
                  "reservedQuantity",
                  "purchasePriceExclVAT",
                  "vat",
                  "retailPriceVATIncluded",
                ].includes(key)
              ) {
                const numValue = Number(value);
                if (isNaN(numValue)) {
                  console.warn(
                    `Invalid numeric value for ${key}:`,
                    value,
                    "using 0 instead"
                  );
                  return [key, 0];
                }
                return [key, numValue];
              }
              // Convert expiryDate to proper date format
              if (key === "expiryDate" && value) {
                // Ensure expiryDate is in ISO string format
                try {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    return [key, date.toISOString()];
                  }
                } catch (error) {
                  console.warn("Invalid date format for expiryDate:", value);
                }
                return [key, value];
              }
              // Only include supplierId if it's a valid ObjectId
              if (
                key === "supplierId" &&
                (typeof value !== "string" ||
                  !isValidObjectId(value) ||
                  value === "")
              ) {
                console.warn(
                  "Invalid supplierId, removing from update data:",
                  value
                );
                return null; // This will be filtered out
              }
              // Only include branchId if it's a valid ObjectId
              if (
                key === "branchId" &&
                (typeof value !== "string" ||
                  !isValidObjectId(value) ||
                  value === "")
              ) {
                console.warn(
                  "Invalid branchId, removing from update data:",
                  value
                );
                return null; // This will be filtered out
              }
              // Keep other fields as is
              return [key, value];
            })
            .filter((entry): entry is [string, any] => entry !== null)
        );

        console.log("Final clean update data:", cleanUpdateData);

        // Log data types for debugging
        console.log("Data types being sent:");
        Object.entries(cleanUpdateData).forEach(([key, value]) => {
          console.log(`${key}: ${typeof value} = ${value}`);
        });

        const response = await fetch(
          `${BASE_URL}/inventory/${editingProduct.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(cleanUpdateData),
          }
        );

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          console.error("Response status:", response.status);
          console.error("Response status text:", response.statusText);

          try {
            const errorData = await response.json();
            console.error("Error response data:", errorData);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (jsonError) {
            console.error("Error parsing error response:", jsonError);
          }
          throw new Error(errorMessage);
        }
      } else {
        // Add product to backend
        // Debug logging
        console.log("Adding new product with data:", submitData);
        console.log("Form data before submit:", formData);

        // Check for undefined/null values
        Object.entries(submitData).forEach(([key, value]) => {
          if (value === undefined || value === null) {
            console.warn(`Field ${key} has value:`, value);
          }
        });

        // Validate required fields before sending
        if (
          !submitData.name ||
          !submitData.stock ||
          !submitData.minStock ||
          !submitData.price ||
          !submitData.supplier ||
          !submitData.expiryDate
        ) {
          throw new Error(
            "Missing required fields: name, stock, minStock, price, supplier, and expiryDate are required"
          );
        }

        // Ensure user has a valid branch
        if (!user?.branchId || !isValidObjectId(user.branchId)) {
          throw new Error("User must be assigned to a valid branch");
        }

        // Ensure expiryDate is in proper format
        if (submitData.expiryDate) {
          try {
            new Date(submitData.expiryDate);
          } catch (error) {
            throw new Error("Invalid expiry date format");
          }
        }

        // Ensure numeric fields are numbers
        if (
          typeof submitData.stock !== "number" ||
          typeof submitData.minStock !== "number" ||
          typeof submitData.price !== "number"
        ) {
          throw new Error("Stock, minStock, and price must be valid numbers");
        }

        // Final validation - ensure no empty strings for required fields
        if (!submitData.name.trim() || !submitData.supplier.trim()) {
          throw new Error("Product name and supplier cannot be empty");
        }

        // Clean up the data before sending - remove any undefined values and convert types
        const cleanSubmitData = Object.fromEntries(
          Object.entries(submitData)
            .filter(
              ([key, value]) =>
                (value !== undefined && value !== null && value !== "") ||
                key === "unitPrice" ||
                key === "units" ||
                key === "shelfStock" ||
                key === "unitsPerPack" // Always include unitPrice, units, shelfStock, and unitsPerPack
            )
            .map(([key, value]) => {
              // Convert numeric fields to numbers
              if (
                [
                  "stock",
                  "minStock",
                  "price",
                  "unitPrice",
                  "shelfStock",
                  "unitsPerPack",
                  "reservedQuantity",
                  "purchasePriceExclVAT",
                  "vat",
                  "retailPriceVATIncluded",
                ].includes(key)
              ) {
                const numValue = Number(value);
                if (isNaN(numValue)) {
                  console.warn(
                    `Invalid numeric value for ${key}:`,
                    value,
                    "using 0 instead"
                  );
                  return [key, 0];
                }
                return [key, numValue];
              }
              // Convert expiryDate to proper date format
              if (key === "expiryDate" && value) {
                // Ensure expiryDate is in ISO string format
                try {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    return [key, date.toISOString()];
                  }
                } catch (error) {
                  console.warn("Invalid date format for expiryDate:", value);
                }
                return [key, value];
              }
              // Only include supplierId if it's a valid ObjectId
              if (
                key === "supplierId" &&
                (typeof value !== "string" ||
                  !isValidObjectId(value) ||
                  value === "")
              ) {
                console.warn(
                  "Invalid supplierId, removing from submit data:",
                  value
                );
                return null; // This will be filtered out
              }
              // Only include branchId if it's a valid ObjectId
              if (
                key === "branchId" &&
                (typeof value !== "string" ||
                  !isValidObjectId(value) ||
                  value === "")
              ) {
                console.warn(
                  "Invalid branchId, removing from submit data:",
                  value
                );
                return null; // This will be filtered out
              }
              // Keep other fields as is
              return [key, value];
            })
            .filter((entry): entry is [string, any] => entry !== null)
        );

        console.log("Final clean submit data:", cleanSubmitData);
        console.log(
          "Manager InventoryManagement - unitPrice:",
          cleanSubmitData.unitPrice
        );
        console.log(
          "Manager InventoryManagement - units:",
          cleanSubmitData.units
        );

        // Log data types for debugging
        console.log("Data types being sent:");
        Object.entries(cleanSubmitData).forEach(([key, value]) => {
          console.log(`${key}: ${typeof value} = ${value}`);
        });

        await apiEndpoints.createInventory(cleanSubmitData);
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData(initialFormState);
      setShowSupplierDropdown(false);
      setSupplierSearch("");
      setShowProductDropdown(false);
      setProductSearch("");
      // Refresh products after add/edit (fetch all products)
      const data = await apiEndpoints.getInventory();
      setProducts(data.map(addStatus));

      // Refresh branches and set correct branch filter
      await fetchBranches();
      if (user?.branchId && branches.length > 0) {
        const managerBranch = branches.find(
          (branch) => branch._id === user.branchId
        );
        if (managerBranch) {
          setBranchFilter(managerBranch.name);
        }
      }
    } catch (err) {
      Swal.fire({
        title: "Error",
        text: "Error: " + (err as Error).message,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stock-taking functions
  const handleStockTakingChange = (
    productId: string,
    field: string,
    value: any
  ) => {
    setStockTakingData((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  const handleStockTakingSubmit = async () => {
    setIsSubmittingStockTaking(true);
    try {
      // Only get products that have been updated (different from current stock or have notes/status changes)
      const updatedProducts = filteredProducts.filter((product) => {
        const stockData = stockTakingData[product.id];
        if (!stockData) return false;

        // Check if actual stock is different from current stock
        const stockChanged =
          stockData.actualStock !== undefined &&
          stockData.actualStock !== product.stock;

        // Check if status is not default (IN_STOCK)
        const statusChanged =
          stockData.status && stockData.status !== "IN_STOCK";

        // Check if notes are provided
        const hasNotes = stockData.notes && stockData.notes.trim() !== "";

        return stockChanged || statusChanged || hasNotes;
      });

      if (updatedProducts.length === 0) {
        Swal.fire({
          title: "No Changes",
          text: "No products have been updated. Please make changes before saving.",
          icon: "info",
          confirmButtonText: "OK",
        });
        setIsSubmittingStockTaking(false);
        return;
      }

      // Create records only for updated products
      const stockTakingRecords = updatedProducts.map((product) => {
        const data = stockTakingData[product.id];
        return {
          productId: product.id,
          actualStock: data.actualStock,
          status: data.status,
          notes: data.notes || "",
          recordedBy: user?.id,
          recordedAt: new Date().toISOString(),
          branchId: user?.branchId,
        };
      });

      // Batch requests if more than 50 products
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < stockTakingRecords.length; i += batchSize) {
        batches.push(stockTakingRecords.slice(i, i + batchSize));
      }

      // Show progress dialog
      let completedBatches = 0;
      const totalBatches = batches.length;

      Swal.fire({
        title: "Saving Stock Taking...",
        html: `Processing batch ${completedBatches + 1} of ${totalBatches}<br/>
               <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                 <div class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
               </div>`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        // Update progress
        const progress = ((i + 1) / totalBatches) * 100;
        Swal.update({
          html: `Processing batch ${i + 1} of ${totalBatches}<br/>
                 <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                   <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${progress}%"></div>
                 </div>`,
        });

        const response = await fetch(`${VITE_BASE_URL}/stock-taking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ records: batch }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to save batch ${i + 1}: ${response.statusText}`
          );
        }

        completedBatches++;
      }

      // Update product stock based on actual stock recorded
      for (const record of stockTakingRecords) {
        if (record.status === "IN_STOCK" && record.actualStock !== undefined) {
          // Update the product stock to match actual stock
          await fetch(`${VITE_BASE_URL}/inventory/${record.productId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ stock: record.actualStock }),
          });
        }
      }

      // Show success message
      Swal.fire({
        title: "Success!",
        html: `Stock-taking records saved successfully!<br/>
               <div class="text-left mt-3">
                 <p><strong>Products updated:</strong> ${updatedProducts.length}</p>
                 <p><strong>Batches processed:</strong> ${totalBatches}</p>
                 <p><strong>Total records:</strong> ${stockTakingRecords.length}</p>
               </div>`,
        icon: "success",
        confirmButtonText: "Great!",
      });

      // Refresh products and stock-taking records
      const data = await apiEndpoints.getInventory();
      setProducts(data.map(addStatus));
      await fetchStockTakingRecords();

      // Reset stock-taking data
      setStockTakingData({});
      setShowStockTakingModal(false);
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Error saving stock-taking records: " + (error as Error).message,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setIsSubmittingStockTaking(false);
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

  // Get unique branches for dropdown from fetched branches
  const availableBranches = branches.map((branch) => branch.name);

  // Filter products
  const filteredProducts = products.filter((product) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(searchLower) ||
      product.supplier.toLowerCase().includes(searchLower) ||
      (product.manufacturer &&
        product.manufacturer.toLowerCase().includes(searchLower)) ||
      (product.composition &&
        product.composition.toLowerCase().includes(searchLower)) ||
      (product.series && product.series.toLowerCase().includes(searchLower));
    const expiryStatus = getExpiryStatus(product.expiryDate);
    const matchesExpiry =
      expiryFilter.toLowerCase() === "all" ||
      expiryStatus.toLowerCase() === expiryFilter.toLowerCase();
    const productBranchName =
      typeof product.branchId === "object" && product.branchId?.name
        ? product.branchId.name
        : "N/A";
    const matchesBranch =
      branchFilter.toLowerCase() === "all" ||
      productBranchName.toLowerCase() === branchFilter.toLowerCase();
    return matchesSearch && matchesExpiry && matchesBranch;
  });

  // Sort filtered products
  const sortedProducts = React.useMemo(() => {
    const sorted = [...filteredProducts];
    sorted.sort((a, b) => {
      let valA: any, valB: any;

      switch (sortColumn) {
        case "name":
          // Sort by name first, then by manufacturer if names are equal
          const nameComparison = a.name
            .toLowerCase()
            .localeCompare(b.name.toLowerCase());
          if (nameComparison !== 0) {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
          } else {
            valA = (a.manufacturer || "").toLowerCase();
            valB = (b.manufacturer || "").toLowerCase();
          }
          break;
        case "stock":
          valA = a.stock;
          valB = b.stock;
          break;
        case "shelfStock":
          valA = a.shelfStock || 0;
          valB = b.shelfStock || 0;
          break;
        case "units":
          valA = (a.units || "pieces").toLowerCase();
          valB = (b.units || "pieces").toLowerCase();
          break;
        case "unitsPerPack":
          valA = a.unitsPerPack || 1;
          valB = b.unitsPerPack || 1;
          break;
        case "minStock":
          valA = a.minStock;
          valB = b.minStock;
          break;
        case "price":
          valA = a.price;
          valB = b.price;
          break;
        case "supplier":
          valA = a.supplier.toLowerCase();
          valB = b.supplier.toLowerCase();
          break;
        case "branch":
          valA =
            typeof a.branchId === "object" && a.branchId?.name
              ? a.branchId.name.toLowerCase()
              : "";
          valB =
            typeof b.branchId === "object" && b.branchId?.name
              ? b.branchId.name.toLowerCase()
              : "";
          break;
        case "expiryDate":
          valA = new Date(a.expiryDate || "").getTime();
          valB = new Date(b.expiryDate || "").getTime();
          break;
        case "status":
          valA = a.status;
          valB = b.status;
          break;
        case "stockTaking":
          // Sort by stock-taking status and date
          const stockTakingA = stockTakingRecords[a.id];
          const stockTakingB = stockTakingRecords[b.id];

          if (!stockTakingA && !stockTakingB) return 0;
          if (!stockTakingA) return 1; // Products without stock-taking go to end
          if (!stockTakingB) return -1;

          // Sort by status first, then by date
          const statusOrder: { [key: string]: number } = {
            IN_STOCK: 0,
            PART: 1,
            SHRINKAGE: 2,
            MISSING: 3,
          };
          const statusA = statusOrder[stockTakingA.status] || 4;
          const statusB = statusOrder[stockTakingB.status] || 4;

          if (statusA !== statusB) {
            valA = statusA;
            valB = statusB;
          } else {
            // If same status, sort by date (most recent first)
            valA = new Date(stockTakingB.recordedAt).getTime();
            valB = new Date(stockTakingA.recordedAt).getTime();
          }
          break;
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredProducts, sortColumn, sortDirection]);

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

  // Modal field array - arranged in specified order
  const modalFields = [
    { key: "name", label: "Product Name", inputType: "text", isRequired: true },
    {
      key: "manufacturer",
      label: "Manufacturer",
      inputType: "text",
      isRequired: false,
    },
    { key: "supplier", label: "Supplier", inputType: "text", isRequired: true },
    {
      key: "composition",
      label: "Composition",
      inputType: "text",
      isRequired: false,
    },
    { key: "stock", label: "Stock", inputType: "number", isRequired: true },
    {
      key: "shelfStock",
      label: "Shelf Stock",
      inputType: "number",
      isRequired: false,
    },
    {
      key: "minStock",
      label: "Min Stock",
      inputType: "number",
      isRequired: true,
    },
    {
      key: "units",
      label: "Units",
      inputType: "text",
      isRequired: false,
    },
    {
      key: "unitsPerPack",
      label: "Per Pack Unit",
      inputType: "number",
      isRequired: false,
    },
    {
      key: "unitPrice",
      label: "Unit Price ($)",
      inputType: "number",
      isRequired: false,
    },
    {
      key: "price",
      label: "Selling Price ($)",
      inputType: "number",
      isRequired: true,
    },
    {
      key: "purchasePriceExclVAT",
      label: "Cost Price",
      inputType: "number",
      isRequired: false,
    },
    {
      key: "retailPriceVATIncluded",
      label: "Retail Price (incl. VAT)",
      inputType: "number",
      isRequired: false,
    },
    {
      key: "expiryDate",
      label: "Expiry Date",
      inputType: "date",
      isRequired: true,
    },
    { key: "series", label: "Series", inputType: "text", isRequired: false },
    {
      key: "reservedQuantity",
      label: "Reserved Quantity",
      inputType: "number",
      isRequired: false,
    },
    { key: "vat", label: "VAT (%)", inputType: "number", isRequired: false },
  ];

  // Summary stats
  const totalProducts = products.length;
  const inStock = products.filter((p) => p.status === "In Stock").length;
  const lowStock = products.filter((p) => p.status === "Low Stock").length;
  const outOfStock = products.filter((p) => p.status === "Out of Stock").length;

  // Sorting handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Subtitle */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black mb-1">
          Inventory Management
        </h1>
        <p className="text-lg text-gray-600">
          {getActualRole(user) === "sale assistant"
            ? "View pharmacy inventory with full access to all data. You can search, filter, and monitor stock levels."
            : "View, filter, and manage pharmacy inventory. Add or edit products and track stock levels."}
        </p>
      </div>

      {/* Loading Spinner */}
      {isLoading && <Spinner />}

      {/* Content - only show when not loading */}
      {!isLoading && (
        <>
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
              <div className="text-lg font-semibold text-gray-700">
                In Stock
              </div>
              <div className="text-2xl font-bold text-green-700 mt-1">
                {inStock}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
              <div className="text-lg font-semibold text-gray-700">
                Low Stock
              </div>
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
                {availableBranches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 ml-auto items-center">
              {getActualRole(user) !== "sale assistant" && (
                <>
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
                      setShowProductDropdown(false);
                      setProductSearch("");
                    }}
                  >
                    Add Product
                  </button>
                  <button
                    className="px-4 py-2 bg-orange-600 text-white rounded shadow hover:bg-orange-700 flex items-center gap-2"
                    onClick={() => setShowStockTakingModal(true)}
                  >
                    <Package className="h-4 w-4" />
                    Stock Taking
                  </button>
                </>
              )}
              {getActualRole(user) === "sale assistant" && (
                <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 px-3 py-2 rounded-md">
                  <Shield className="inline h-4 w-4 mr-2 text-blue-600" />
                  <span className="font-medium">
                    Sale Assistant Access:
                  </span>{" "}
                  Full inventory visibility with search, filtering, and
                  monitoring capabilities
                </div>
              )}
            </div>
          </div>

          {/* Table - lucide-react icons for actions, name wraps, actions always visible */}
          <div className="rounded-lg shadow-lg overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-blue-50">
                <tr>
                  <th
                    className="px-4 py-2 text-left max-w-[250px] w-1/4 cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    Product | Manufacturer{" "}
                    {sortColumn === "name" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    onClick={() => handleSort("stock")}
                  >
                    Stock{" "}
                    {sortColumn === "stock" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    onClick={() => handleSort("shelfStock")}
                  >
                    Shelf Stock{" "}
                    {sortColumn === "shelfStock" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    onClick={() => handleSort("units")}
                  >
                    Units{" "}
                    {sortColumn === "units" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    onClick={() => handleSort("unitsPerPack")}
                  >
                    Per Pack Unit{" "}
                    {sortColumn === "unitsPerPack" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    onClick={() => handleSort("minStock")}
                  >
                    Min Stock{" "}
                    {sortColumn === "minStock" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    onClick={() => handleSort("price")}
                  >
                    Price{" "}
                    {sortColumn === "price" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    onClick={() => handleSort("supplier")}
                  >
                    Supplier{" "}
                    {sortColumn === "supplier" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    onClick={() => handleSort("branch")}
                  >
                    Branch{" "}
                    {sortColumn === "branch" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    onClick={() => handleSort("expiryDate")}
                  >
                    Expiry Date{" "}
                    {sortColumn === "expiryDate" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="px-4 py-2 text-center cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    Status{" "}
                    {sortColumn === "status" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="px-4 py-2 text-center cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    onClick={() => handleSort("stockTaking")}
                  >
                    Stock Taking{" "}
                    {sortColumn === "stockTaking" &&
                      (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  {/* <th className="px-4 py-2 text-center w-[110px]">Actions</th> */}
                </tr>
              </thead>
              <tbody>
                {sortedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-4">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  sortedProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-blue-50 transition"
                    >
                      <td className="px-4 py-2 font-semibold text-left break-words whitespace-normal max-w-[250px] w-1/4">
                        <div className="font-semibold">{product.name}</div>
                        {product.manufacturer && (
                          <div className="text-sm text-gray-600 font-normal">
                            {product.manufacturer}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-left">{product.stock}</td>
                      <td className="px-4 py-2 text-left">
                        {product.shelfStock || 0}
                      </td>
                      <td className="px-4 py-2 text-left">
                        {product.units || "pieces"}
                      </td>
                      <td className="px-4 py-2 text-left">
                        {product.unitsPerPack || 1}
                      </td>
                      <td className="px-4 py-2 text-left">
                        {product.minStock}
                      </td>
                      <td className="px-4 py-2 text-left">#{product.price}</td>
                      <td className="px-4 py-2 text-left">
                        {product.supplier}
                      </td>
                      <td className="px-4 py-2 text-left">
                        {typeof product.branchId === "object" &&
                        product.branchId?.name
                          ? product.branchId.name
                          : "N/A"}
                      </td>
                      <td className="px-4 py-2 text-left">
                        {product.expiryDate
                          ? new Date(product.expiryDate)
                              .toISOString()
                              .slice(0, 10)
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
                      <td className="px-4 py-2 text-center">
                        {stockTakingRecords[product.id] ? (
                          <div className="text-xs space-y-1">
                            <div className="font-semibold text-blue-700">
                              {stockTakingRecords[product.id].actualStock}
                            </div>
                            <div
                              className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                                stockTakingRecords[product.id].status ===
                                "IN_STOCK"
                                  ? "bg-green-100 text-green-700"
                                  : stockTakingRecords[product.id].status ===
                                    "MISSING"
                                  ? "bg-red-100 text-red-700"
                                  : stockTakingRecords[product.id].status ===
                                    "PART"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {stockTakingRecords[product.id].status}
                            </div>
                            {stockTakingRecords[product.id].notes && (
                              <div
                                className="text-gray-500 truncate max-w-[120px]"
                                title={stockTakingRecords[product.id].notes}
                              >
                                {stockTakingRecords[product.id].notes}
                              </div>
                            )}
                            <div className="text-gray-400 text-[9px]">
                              {new Date(
                                stockTakingRecords[product.id].recordedAt
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs">
                            <div className="px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                              Not recorded
                            </div>
                          </div>
                        )}
                      </td>
                      {/* <td className="px-4 py-2 text-center flex gap-1 justify-center w-[110px] shrink-0">
                    {getActualRole(user) !== "sale assistant" ? (
                      <>
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
                      </>
                                         ) : (
                       <span className="text-xs text-blue-600 font-medium">View Only</span>
                     )}
                  </td> */}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal - Only Managers can add/edit products */}
          {showModal && getActualRole(user) !== "sale assistant" && (
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => {
                // Close modal when clicking outside
                setShowModal(false);
                setEditingProduct(null);
                setFormData(initialFormState);
                setShowSupplierDropdown(false);
                setSupplierSearch("");
                setShowProductDropdown(false);
                setProductSearch("");
              }}
            >
              <div
                className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-screen overflow-y-auto shadow-2xl"
                onClick={(e) => {
                  // Prevent clicks inside the modal from closing it
                  e.stopPropagation();
                }}
              >
                <h3 className="text-xl font-bold text-blue-700 mb-4">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Two Column Grid Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modalFields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        {field.key === "name" ? (
                          <div className="relative" ref={productDropdownRef}>
                            <input
                              type="text"
                              required={field.isRequired}
                              value={
                                formData[field.key as keyof FormProduct] ?? ""
                              }
                              onChange={(e) =>
                                handleProductInputChange(e.target.value)
                              }
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
                                      onClick={() =>
                                        handleProductSelect(product)
                                      }
                                    >
                                      <div className="font-medium">
                                        {product.name}
                                      </div>
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
                                      Press Enter to add "{productSearch}" as
                                      new product
                                    </div>
                                  )}
                                {!productSearch && products.length > 0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                                    {products.length} products available
                                  </div>
                                )}
                                {products.length === 0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                                    No products in system. Type to add new
                                    product.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : field.key === "supplier" ? (
                          <div className="relative" ref={supplierDropdownRef}>
                            <input
                              type="text"
                              required={field.isRequired}
                              value={
                                formData[field.key as keyof FormProduct] ?? ""
                              }
                              onChange={(e) =>
                                handleSupplierInputChange(e.target.value)
                              }
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
                                      key={supplier.id}
                                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                      onClick={() =>
                                        handleSupplierSelect(supplier)
                                      }
                                    >
                                      <div className="font-medium">
                                        {supplier.name}
                                      </div>
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
                                  supplierSearch.trim() !==
                                    formData.supplier && (
                                    <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                                      Press Enter to add "{supplierSearch}" as
                                      new supplier
                                    </div>
                                  )}
                                {!supplierSearch && suppliers.length > 0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                                    {suppliers.length} suppliers available
                                  </div>
                                )}
                                {suppliers.length === 0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                                    No suppliers in system. Type to add new
                                    supplier.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <input
                            type={field.inputType}
                            required={field.isRequired}
                            value={
                              formData[field.key as keyof FormProduct] ?? ""
                            }
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
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setShowModal(false);
                        setEditingProduct(null);
                        setFormData(initialFormState);
                        setShowSupplierDropdown(false);
                        setSupplierSearch("");
                        setShowProductDropdown(false);
                        setProductSearch("");
                      }}
                      className={`px-4 py-2 rounded ${
                        isSubmitting
                          ? "bg-gray-200 cursor-not-allowed"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`px-4 py-2 text-white rounded ${
                        isSubmitting
                          ? "bg-blue-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {editingProduct ? "Updating..." : "Adding..."}
                        </div>
                      ) : editingProduct ? (
                        "Update"
                      ) : (
                        "Add"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Stock-taking Modal */}
          {showStockTakingModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-screen overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-blue-700">
                    Stock Taking
                  </h3>
                  <button
                    onClick={() => setShowStockTakingModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-gray-600">
                    Record actual stock quantities and discrepancies for each
                    product.
                  </p>
                </div>

                {/* Action Buttons - Moved to Top */}
                <div className="flex justify-end space-x-2 mb-4 pb-4 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowStockTakingModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStockTakingSubmit}
                    disabled={isSubmittingStockTaking}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmittingStockTaking ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Stock Taking
                      </>
                    )}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Stock
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actual Stock
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <div>
                              <div className="font-medium text-gray-900">
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {product.manufacturer}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {product.stock}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              value={
                                stockTakingData[product.id]?.actualStock !==
                                undefined
                                  ? stockTakingData[product.id].actualStock
                                  : stockTakingRecords[product.id]
                                      ?.actualStock || product.stock
                              }
                              onChange={(e) =>
                                handleStockTakingChange(
                                  product.id,
                                  "actualStock",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={
                                stockTakingData[product.id]?.status ||
                                stockTakingRecords[product.id]?.status ||
                                "IN_STOCK"
                              }
                              onChange={(e) =>
                                handleStockTakingChange(
                                  product.id,
                                  "status",
                                  e.target.value
                                )
                              }
                              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="IN_STOCK">IN_STOCK</option>
                              <option value="MISSING">MISSING</option>
                              <option value="PART">PART</option>
                              <option value="SHRINKAGE">SHRINKAGE</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              placeholder="Notes (optional)"
                              value={
                                stockTakingData[product.id]?.notes !== undefined
                                  ? stockTakingData[product.id].notes || ""
                                  : stockTakingRecords[product.id]?.notes || ""
                              }
                              onChange={(e) =>
                                handleStockTakingChange(
                                  product.id,
                                  "notes",
                                  e.target.value
                                )
                              }
                              className="w-32 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InventoryManagement;
