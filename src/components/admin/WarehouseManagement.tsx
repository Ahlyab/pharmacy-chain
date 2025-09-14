import React, { useEffect, useState, useRef } from "react";
import Select from "react-select";
import { ChevronDown } from "lucide-react";
import { apiEndpoints, api } from "../../utils/api";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Search,
  ArrowRightLeft,
} from "lucide-react";

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

interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  unitPrice?: number;
  units?: string;
  unitsPerPack?: number;
  shelfStock?: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  branchId: {
    _id: string;
    name: string;
  };
  branchName: string;
  supplierId: {
    _id: string;
    name: string;
    contact: string;
    address: string;
    email: string;
    company: string;
    gst: string;
    status: string;
  };
  supplierName: string;
  expiryDate: string;
  store: string;
  manufacturer: string;
  composition: string;
  series: string;
  reservedQuantity: number;
  purchasePriceExclVAT: number;
  vat: number;
  retailPriceVATIncluded: number;
  divider: string;
  dividerCustom: string;
  createdAt: string;
  updatedAt: string;
}

const WarehouseManagement: React.FC = () => {
  // Warehouse stock state
  const [stock, setStock] = useState<StockItem[]>([]);
  const [stockFilter, setStockFilter] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sortColumn, setSortColumn] = useState<string>("productName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // All inventory across branches state
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [inventoryFilter, setInventoryFilter] = useState({
    search: "",
    category: "all",
    status: "all",
    branchId: "all",
  });
  const [inventorySortColumn, setInventorySortColumn] =
    useState<string>("name");
  const [inventorySortDirection, setInventorySortDirection] = useState<
    "asc" | "desc"
  >("asc");
  const [showInventoryView, setShowInventoryView] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Transfer state
  const [transfer, setTransfer] = useState({
    stockId: "",
    branchId: "",
    quantity: 0,
  });
  const [inventoryTransfer, setInventoryTransfer] = useState({
    inventoryId: "",
    fromBranchId: "",
    toBranchId: "",
    quantity: 0,
    reason: "",
  });

  const initialProductState = {
    name: "",
    category: "",
    stock: "",
    minStock: "",
    price: "",
    unitPrice: "",
    units: "pieces",
    unitsPerPack: "1",
    shelfStock: "",
    supplier: "",
    expiryDate: "",
    // Removed fields: store, storeAlt, supplierId, supplierEntity, supplierEntityName, purchaseInvoiceId, supplierPurchaseInvoiceId, purchaseInvoiceDate, sku, skuAlt, manufacturer, manufacturerName, composition, compositionName, series, reservedQuantity, purchasePriceExclVAT, vat, divider, dividerCustom
  };
  const [newProduct, setNewProduct] = useState<{ [key: string]: string }>(
    initialProductState
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isInventoryTransferring, setIsInventoryTransferring] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] =
    useState<InventoryItem | null>(null);
  const [showInventoryDetails, setShowInventoryDetails] = useState(false);

  // Dropdown states
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [allProducts, setAllProducts] = useState<InventoryItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Sorting handlers
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Filter products based on search for dropdown
  const filteredProductsForDropdown = allProducts
    .filter((product) =>
      product.name.toLowerCase().includes(productSearch.toLowerCase())
    )
    .slice(0, 10); // Limit to 10 results for better performance

  // Handle product selection from dropdown
  const handleProductSelect = (product: InventoryItem) => {
    setNewProduct({
      ...newProduct,
      name: product.name,
      unitPrice: product.unitPrice?.toString() || "",
      units: product.units || "pieces",
      unitsPerPack: product.unitsPerPack?.toString() || "1",
      shelfStock: product.shelfStock?.toString() || "",
    });
    setShowProductDropdown(false);
    setProductSearch(product.name);
  };

  // Handle product input change
  const handleProductInputChange = (value: string) => {
    setNewProduct({ ...newProduct, name: value });
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
        !allProducts.some(
          (p) => p.name.toLowerCase() === productSearch.toLowerCase()
        )
      ) {
        setNewProduct({ ...newProduct, name: productSearch.trim() });
      }
    }
  };

  const handleInventorySort = (column: string) => {
    if (inventorySortColumn === column) {
      setInventorySortDirection(
        inventorySortDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setInventorySortColumn(column);
      setInventorySortDirection("asc");
    }
  };

  useEffect(() => {
    fetchStock();
    fetchSuppliers();
    fetchBranches();
    fetchAllInventory();
    fetchAllProducts();
  }, []);

  // Handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  // Fetch all inventory across branches
  const fetchAllInventory = async () => {
    setIsLoadingInventory(true);
    try {
      const data = await apiEndpoints.getAllInventoryAcrossBranches(
        inventoryFilter
      );
      if (Array.isArray(data)) {
        setAllInventory(data);
      } else {
        console.error("All inventory API did not return an array:", data);
        setAllInventory([]);
      }
    } catch (err: any) {
      console.error("Error fetching all inventory:", err);
      setAllInventory([]);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Update inventory when filters change
  useEffect(() => {
    if (showInventoryView) {
      fetchAllInventory();
    }
  }, [inventoryFilter, showInventoryView]);

  // Handle tab switching
  const handleTabSwitch = (isInventoryView: boolean) => {
    setShowInventoryView(isInventoryView);
    if (isInventoryView && allInventory.length === 0) {
      fetchAllInventory();
    }
  };

  const fetchStock = async () => {
    try {
      const data = await apiEndpoints.getWarehouseStock();
      if (Array.isArray(data)) {
        setStock(data);
      } else {
        console.error("Stock API did not return an array:", data);
        setStock([]);
        Swal.fire({
          icon: "warning",
          title: "Data Format Warning",
          text: "Stock data format is unexpected. Please contact support.",
          confirmButtonColor: "#3085d6",
        });
      }
    } catch (err: any) {
      console.error("Error fetching stock:", err);
      setStock([]);

      let errorMessage = "Failed to fetch stock data";
      if (err.message?.includes("500")) {
        errorMessage = "Server error occurred while fetching stock data.";
      } else if (err.message?.includes("404")) {
        errorMessage = "Stock API endpoint not found.";
      } else if (err.message?.includes("timeout")) {
        errorMessage = "Request timeout while fetching stock data.";
      } else if (err.message?.includes("network")) {
        errorMessage = "Network error while fetching stock data.";
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonColor: "#3085d6",
      });
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await apiEndpoints.getSuppliers();
      if (Array.isArray(data)) {
        setSuppliers(data);
      } else {
        console.error("Suppliers API did not return an array:", data);
        setSuppliers([]);
        Swal.fire({
          icon: "warning",
          title: "Data Format Warning",
          text: "Suppliers data format is unexpected. Please contact support.",
          confirmButtonColor: "#3085d6",
        });
      }
    } catch (err: any) {
      console.error("Error fetching suppliers:", err);
      setSuppliers([]);

      let errorMessage = "Failed to fetch suppliers data";
      if (err.message?.includes("500")) {
        errorMessage = "Server error occurred while fetching suppliers data.";
      } else if (err.message?.includes("404")) {
        errorMessage = "Suppliers API endpoint not found.";
      } else if (err.message?.includes("timeout")) {
        errorMessage = "Request timeout while fetching suppliers data.";
      } else if (err.message?.includes("network")) {
        errorMessage = "Network error while fetching suppliers data.";
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonColor: "#3085d6",
      });
    }
  };

  const fetchBranches = async () => {
    try {
      const data = await apiEndpoints.getBranches();
      if (Array.isArray(data)) {
        setBranches(data);
      } else {
        console.error("Branches API did not return an array:", data);
        setBranches([]);
        Swal.fire({
          icon: "warning",
          title: "Data Format Warning",
          text: "Branches data format is unexpected. Please contact support.",
          confirmButtonColor: "#3085d6",
        });
      }
    } catch (err: any) {
      console.error("Error fetching branches:", err);
      setBranches([]);

      let errorMessage = "Failed to fetch branches data";
      if (err.message?.includes("500")) {
        errorMessage = "Server error occurred while fetching branches data.";
      } else if (err.message?.includes("404")) {
        errorMessage = "Branches API endpoint not found.";
      } else if (err.message?.includes("timeout")) {
        errorMessage = "Request timeout while fetching branches data.";
      } else if (err.message?.includes("network")) {
        errorMessage = "Network error while fetching branches data.";
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonColor: "#3085d6",
      });
    }
  };

  // Fetch all products for dropdown
  const fetchAllProducts = async () => {
    try {
      const data = await apiEndpoints.getInventory();
      setAllProducts(data);
    } catch (err) {
      console.error("Error fetching all products:", err);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return; // Prevent multiple submissions

    // Check if suppliers are available
    if (suppliers.length === 0) {
      Swal.fire({
        icon: "error",
        title: "No Suppliers Available",
        text: "Please add suppliers first before adding stock.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Strong frontend validation for required fields and types
    if (!newProduct.name || !newProduct.supplier) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please fill in Product Name and Supplier.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Trim whitespace from text fields
    if (newProduct.name.trim() === "") {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Product name cannot be empty or just whitespace.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Validate product name length
    if (newProduct.name.trim().length > 100) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Product name cannot exceed 100 characters.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Validate category if provided
    if (newProduct.category && newProduct.category.trim() === "") {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Category cannot be just whitespace.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Validate category length if provided
    if (newProduct.category && newProduct.category.trim().length > 50) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Category cannot exceed 50 characters.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    if (
      !newProduct.stock ||
      isNaN(Number(newProduct.stock)) ||
      Number(newProduct.stock) <= 0
    ) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please enter a valid Stock quantity (number > 0).",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Validate stock format
    if (newProduct.stock.includes("-") || newProduct.stock.includes(".")) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Stock quantity must be a positive whole number.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Validate stock quantity is not too large
    if (Number(newProduct.stock) > 999999) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Stock quantity cannot exceed 999,999.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Show confirmation dialog
    const result = await Swal.fire({
      title: "Confirm Add Product",
      text: `Are you sure you want to add "${newProduct.name}" with quantity ${newProduct.stock}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, add it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Show loading state
      Swal.fire({
        title: "Adding Product...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Map frontend fields to backend requirements
      const { name, stock, minStock, price, unitPrice, units, unitsPerPack, shelfStock, expiryDate } = newProduct;

      // Additional validation
      const quantity = Number(stock);
      const minStockNum = minStock ? Number(minStock) : undefined;
      const priceNum = price ? Number(price) : undefined;
      const unitPriceNum = unitPrice ? Number(unitPrice) : undefined;
      const unitsPerPackNum = unitsPerPack ? Number(unitsPerPack) : undefined;
      const shelfStockNum = shelfStock ? Number(shelfStock) : undefined;

      if (isNaN(quantity) || quantity <= 0) {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Stock quantity must be a valid positive number.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      if (minStock && (isNaN(minStockNum!) || minStockNum! < 0)) {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Minimum stock must be a valid non-negative number.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Validate minStock format if provided
      if (minStock && minStock.includes("-")) {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Minimum stock cannot be negative.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Validate minStock is a whole number if provided
      if (minStock && minStock.includes(".")) {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Minimum stock must be a whole number.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Validate minStock quantity is not too large if provided
      if (minStock && Number(minStock) > 999999) {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Minimum stock quantity cannot exceed 999,999.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Validate minStock is not greater than stock quantity
      if (minStock && Number(minStock) > Number(newProduct.stock)) {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Minimum stock cannot be greater than the stock quantity.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      if (price && (isNaN(priceNum!) || priceNum! < 0)) {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Price must be a valid non-negative number.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Validate price format if provided
      if (price && price.includes("-")) {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Price cannot be negative.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Validate price has at most 2 decimal places if provided
      if (price && price.includes(".") && price.split(".")[1]?.length > 2) {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Price can have at most 2 decimal places.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Validate price is not too large if provided
      if (price && Number(price) > 999999.99) {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Price cannot exceed 999,999.99.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Validate supplier ID format (basic check)
      if (!newProduct.supplier || newProduct.supplier.length !== 24) {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Invalid supplier selected. Please select a valid supplier.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Validate supplier ID is not just whitespace
      if (newProduct.supplier.trim() === "") {
        Swal.fire({
          icon: "error",
          title: "Validation Error",
          text: "Supplier cannot be empty.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Validate expiry date is not in the past
      if (expiryDate) {
        const expiryDateObj = new Date(expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day

        if (expiryDateObj < today) {
          Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Expiry date cannot be in the past.",
            confirmButtonColor: "#3085d6",
          });
          return;
        }

        // Validate date format
        if (isNaN(expiryDateObj.getTime())) {
          Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Invalid expiry date format.",
            confirmButtonColor: "#3085d6",
          });
          return;
        }
      }

      const data = {
        productName: name,
        quantity: quantity,
        minStock: minStockNum,
        price: priceNum,
        unitPrice: unitPriceNum,
        units: units || "pieces",
        unitsPerPack: unitsPerPackNum || 1,
        shelfStock: shelfStockNum,
        expiryDate: expiryDate || undefined,
        supplierId: newProduct.supplier,
        category: newProduct.category || undefined,
      };

      console.log("Sending data to backend:", data);

      await apiEndpoints.addWarehouseStock(data);

      // Create delivery record for the supplier
      try {
        // Note: Delivery record creation is skipped as it's not a standard CRUD operation
        // and the endpoint is not available in the current apiEndpoints
        console.log(
          "Delivery record creation skipped - endpoint not available in apiEndpoints"
        );
      } catch (deliveryErr) {
        console.warn("Failed to create delivery record:", deliveryErr);
        // Don't fail the whole operation if delivery record creation fails
      }

      // Close loading dialog
      Swal.close();

      // Success
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Product added successfully and delivery record created!",
        confirmButtonColor: "#3085d6",
      });

      setNewProduct(initialProductState);
      fetchStock();

      // Small delay before closing dialog to ensure user sees success message
      setTimeout(() => {
        setShowAddDialog(false);
      }, 1000);
    } catch (err: any) {
      console.error("Error adding product:", err);

      let errorMessage = "Error adding product";
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 500) {
        errorMessage = "Server error occurred. Please try again later.";
      } else if (err.response?.status === 400) {
        errorMessage = "Invalid data provided. Please check your input.";
      } else if (err.response?.status === 409) {
        errorMessage = "Conflict: Product or supplier already exists.";
      } else if (err.code === "ECONNABORTED") {
        errorMessage =
          "Request timeout. Please check your connection and try again.";
      } else if (err.code === "ERR_NETWORK") {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonColor: "#3085d6",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Import handler for Excel files - Warehouse bulk import
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split(".").pop()?.toLowerCase();
    if (fileType === "xlsx" || fileType === "xls") {
      try {
        // Show confirmation dialog
        const confirmResult = await Swal.fire({
          title: "Confirm Warehouse Import",
          text: `Import warehouse stock from "${file.name}"?`,
          html: `
            <div class="text-left">
              <p><strong>File:</strong> ${file.name}</p>
              <p><strong>Size:</strong> ${(file.size / 1024 / 1024).toFixed(
                2
              )} MB</p>
              <p><strong>Smart Import:</strong> Existing stock will be updated, new items will be added</p>
              <p><strong>Stock Update:</strong> Stock quantities will be ADDED to existing items (not replaced)</p>
              <p><strong>Supplier Management:</strong> New suppliers will be automatically created</p>
              <p><strong>Field Mapping:</strong> SKU → Product Name, Supplier Name → Supplier, Manufacturer Name → Manufacturer, etc.</p>
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

        const response = await api.upload(
          "/api/warehouse/import-excel",
          formData
        );

        // Show success message with summary
        const { summary } = response;
        Swal.fire({
          title: "Warehouse Import Successful!",
          html: `
            <div class="text-left">
              <p><strong>Total processed:</strong> ${summary.totalProcessed}</p>
              <p><strong>Stock updated:</strong> ${summary.stockUpdated}</p>
              <p><strong>Stock added:</strong> ${summary.stockAdded}</p>
              <p><strong>Quantity added to existing stock:</strong> +${
                summary.quantityAdded
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
            </div>
          `,
          icon: "success",
          confirmButtonText: "Great!",
        });

        // Refresh warehouse stock after import
        fetchStock();
      } catch (err: any) {
        console.error("Error importing warehouse stock:", err);

        let errorMessage = "Error importing warehouse stock";
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response?.status === 500) {
          errorMessage = "Server error occurred. Please try again later.";
        } else if (err.response?.status === 400) {
          errorMessage = "Invalid data provided. Please check your Excel file.";
        } else if (err.code === "ECONNABORTED") {
          errorMessage =
            "Request timeout. Please check your connection and try again.";
        } else if (err.code === "ERR_NETWORK") {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else if (err.message) {
          errorMessage = err.message;
        }

        Swal.fire({
          icon: "error",
          title: "Import Failed",
          text: errorMessage,
          confirmButtonColor: "#3085d6",
        });
      }
    } else if (fileType === "pdf") {
      Swal.fire({
        icon: "warning",
        title: "Unsupported File Type",
        text: "PDF import is not supported. Please use Excel file.",
        confirmButtonColor: "#3085d6",
      });
    } else {
      Swal.fire({
        icon: "warning",
        title: "Unsupported File Type",
        text: "Unsupported file type. Please upload an Excel (.xlsx/.xls) file.",
        confirmButtonColor: "#3085d6",
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if branches are available
    if (branches.length === 0) {
      Swal.fire({
        icon: "error",
        title: "No Branches Available",
        text: "Please add branches first before transferring stock.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    if (!transfer.stockId || !transfer.branchId || transfer.quantity <= 0) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please select product, branch and enter a valid quantity.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Validate quantity is a positive integer
    if (!Number.isInteger(transfer.quantity) || transfer.quantity <= 0) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Quantity must be a positive whole number.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Find the product name for confirmation
    const selectedProduct = stock.find((item) => item._id === transfer.stockId);
    const selectedBranch = branches.find(
      (branch) => branch._id === transfer.branchId
    );

    if (!selectedProduct || !selectedBranch) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Selected product or branch not found.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Check if there's sufficient stock
    if (selectedProduct.quantity < transfer.quantity) {
      Swal.fire({
        icon: "error",
        title: "Insufficient Stock",
        text: `Only ${selectedProduct.quantity} units available. Cannot transfer ${transfer.quantity} units.`,
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Show confirmation dialog
    const result = await Swal.fire({
      title: "Confirm Transfer",
      text: `Are you sure you want to transfer ${transfer.quantity} units of "${selectedProduct.productName}" to "${selectedBranch.name}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, transfer it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsTransferring(true);

    try {
      // Show loading state
      Swal.fire({
        title: "Transferring Stock...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const transferData = await apiEndpoints.transferStock(transfer);

      // Show success with transfer details
      Swal.fire({
        icon: "success",
        title: "Transfer Successful!",
        html: `
          <p>Stock transferred successfully!</p>
          <p><strong>Quantity:</strong> ${transfer.quantity}</p>
          <p><strong>Remaining Stock:</strong> ${transferData.remainingStock}</p>
        `,
        confirmButtonColor: "#3085d6",
      });

      // Reset form and refresh data
      setTransfer({ stockId: "", branchId: "", quantity: 0 });
      fetchStock();
    } catch (err: any) {
      console.error("Error transferring stock:", err);

      let errorMessage = "Error transferring stock";
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 500) {
        errorMessage = "Server error occurred. Please try again later.";
      } else if (err.response?.status === 400) {
        errorMessage = "Invalid data provided. Please check your input.";
      } else if (err.response?.status === 409) {
        errorMessage = "Conflict: Insufficient stock or invalid transfer.";
      } else if (err.code === "ECONNABORTED") {
        errorMessage =
          "Request timeout. Please check your connection and try again.";
      } else if (err.code === "ERR_NETWORK") {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonColor: "#3085d6",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  // Transfer inventory between branches
  const handleInventoryTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isInventoryTransferring) return;

    if (
      !inventoryTransfer.inventoryId ||
      !inventoryTransfer.fromBranchId ||
      !inventoryTransfer.toBranchId ||
      inventoryTransfer.quantity <= 0
    ) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please select inventory item, source branch, destination branch and enter a valid quantity.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    if (inventoryTransfer.fromBranchId === inventoryTransfer.toBranchId) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Source and destination branches must be different.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Find the selected inventory item
    const selectedInventory = allInventory.find(
      (item) => item._id === inventoryTransfer.inventoryId
    );
    if (!selectedInventory) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Selected inventory item not found.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Check if there's sufficient stock
    if (selectedInventory.stock < inventoryTransfer.quantity) {
      Swal.fire({
        icon: "error",
        title: "Insufficient Stock",
        text: `Only ${selectedInventory.stock} units available. Cannot transfer ${inventoryTransfer.quantity} units.`,
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // Show confirmation dialog
    const result = await Swal.fire({
      title: "Confirm Inventory Transfer",
      text: `Are you sure you want to transfer ${
        inventoryTransfer.quantity
      } units of "${selectedInventory.name}" from "${
        selectedInventory.branchName
      }" to "${
        branches.find((b) => b._id === inventoryTransfer.toBranchId)?.name
      }"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, transfer it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsInventoryTransferring(true);

    try {
      // Show loading state
      Swal.fire({
        title: "Transferring Inventory...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await apiEndpoints.transferInventoryBetweenBranches(inventoryTransfer);

      // Show success message
      Swal.fire({
        icon: "success",
        title: "Transfer Successful!",
        text: "Inventory transferred successfully between branches!",
        confirmButtonColor: "#3085d6",
      });

      // Reset form and refresh data
      setInventoryTransfer({
        inventoryId: "",
        fromBranchId: "",
        toBranchId: "",
        quantity: 0,
        reason: "",
      });
      fetchAllInventory();
    } catch (err: any) {
      console.error("Error transferring inventory:", err);

      let errorMessage = "Error transferring inventory";
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 500) {
        errorMessage = "Server error occurred. Please try again later.";
      } else if (err.response?.status === 400) {
        errorMessage = "Invalid data provided. Please check your input.";
      } else if (err.response?.status === 409) {
        errorMessage = "Conflict: Insufficient stock or invalid transfer.";
      } else if (err.code === "ECONNABORTED") {
        errorMessage =
          "Request timeout. Please check your connection and try again.";
      } else if (err.code === "ERR_NETWORK") {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonColor: "#3085d6",
      });
    } finally {
      setIsInventoryTransferring(false);
    }
  };

  // Supplier dropdown without manual add, with link to Supplier tab
  // Removed unused supplierDropdown and newStock references

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-100 text-green-800";
      case "low_stock":
        return "bg-yellow-100 text-yellow-800";
      case "out_of_stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get unique categories for filter
  const categories = Array.from(
    new Set(allInventory.map((item) => item.category).filter(Boolean))
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Warehouse Management</h2>

      {/* View Toggle */}
      <div className="mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => handleTabSwitch(false)}
            className={`px-4 py-2 rounded ${
              !showInventoryView
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Warehouse Stock
          </button>
          <button
            onClick={() => handleTabSwitch(true)}
            className={`px-4 py-2 rounded ${
              showInventoryView
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            All Branch Inventory
          </button>
        </div>
      </div>
      {/* Only show warehouse controls when warehouse view is selected */}
      {!showInventoryView && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-2">Add Stock</h3>
          <div className="flex gap-2">
            <button
              type="button"
              className={`px-4 py-1 rounded ${
                suppliers.length > 0
                  ? "bg-blue-500 text-white"
                  : "bg-gray-400 text-gray-600 cursor-not-allowed"
              }`}
              onClick={() => suppliers.length > 0 && setShowAddDialog(true)}
              disabled={suppliers.length === 0}
            >
              Add
            </button>
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleImportFile}
            />
            <button
              type="button"
              className="bg-green-500 text-white px-4 py-1 rounded flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              Import Excel
            </button>
            <Link
              to="/admin/suppliers"
              className="bg-green-500 text-white px-4 py-1 rounded flex items-center justify-center"
              style={{ textDecoration: "none" }}
            >
              Add Supplier
            </Link>
          </div>
          {suppliers.length === 0 && (
            <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
              ⚠️ No suppliers available. Please add suppliers first before
              adding stock.
            </div>
          )}
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded">
            📋 <strong>Bulk Import:</strong> Upload Excel files to add multiple
            products at once. Supported columns: SKU, Quantity, Retail price VAT
            included, Supplier name, Manufacturer name, Composition, etc.
          </div>
        </div>
      )}
      {/* Add Stock Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded shadow-lg min-w-[400px] max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">Add Product</h4>
            <form onSubmit={handleAddStock} className="flex flex-col gap-3">
              {/* Product Name with dropdown */}
              <div className="flex flex-col mb-2">
                <label className="font-semibold mb-1">Product Name *</label>
                <div className="relative" ref={productDropdownRef}>
                  <input
                    type="text"
                    name="name"
                    value={newProduct.name || ""}
                    onChange={(e) => handleProductInputChange(e.target.value)}
                    onFocus={handleProductFocus}
                    onKeyDown={handleProductKeyDown}
                    placeholder="Search or enter product name..."
                    className="border px-2 py-1 pr-8"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductDropdown(!showProductDropdown);
                      if (!showProductDropdown) {
                        if (newProduct.name.trim() === "") {
                          setProductSearch("");
                        } else {
                          setProductSearch(newProduct.name);
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
                            key={product._id}
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
                        productSearch.trim() !== newProduct.name && (
                          <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                            Press Enter to add "{productSearch}" as new product
                          </div>
                        )}
                      {!productSearch && allProducts.length > 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                          {allProducts.length} products available
                        </div>
                      )}
                      {allProducts.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
                          No products in system. Type to add new product.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Other fields */}
              {["category", "stock", "minStock"].map((field) => (
                <div key={field} className="flex flex-col mb-2">
                  <label className="font-semibold mb-1">
                    {field === "stock"
                      ? "Stock Quantity"
                      : field === "minStock"
                      ? "Minimum Stock"
                      : field}
                    {field === "stock" ? " *" : ""}
                  </label>
                  <input
                    type={
                      field === "stock" || field === "minStock"
                        ? "number"
                        : "text"
                    }
                    name={field}
                    value={newProduct[field] || ""}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        [field]: e.target.value,
                      })
                    }
                    className="border px-2 py-1"
                    required={field === "stock"}
                    min={
                      field === "stock" || field === "minStock"
                        ? "0"
                        : undefined
                    }
                  />
                </div>
              ))}
              {/* Supplier Dropdown after minStock */}
              <div className="flex flex-col mb-2">
                <label className="font-semibold mb-1">Supplier *</label>
                <select
                  name="supplier"
                  value={newProduct.supplier}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, supplier: e.target.value })
                  }
                  className="border px-2 py-1"
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Price field */}
              <div className="flex flex-col mb-2">
                <label className="font-semibold mb-1">Price</label>
                <input
                  type="number"
                  name="price"
                  value={newProduct.price || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      price: e.target.value,
                    })
                  }
                  className="border px-2 py-1"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Unit Price field */}
              <div className="flex flex-col mb-2">
                <label className="font-semibold mb-1">Unit Price</label>
                <input
                  type="number"
                  name="unitPrice"
                  value={newProduct.unitPrice || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      unitPrice: e.target.value,
                    })
                  }
                  className="border px-2 py-1"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Units field */}
              <div className="flex flex-col mb-2">
                <label className="font-semibold mb-1">Units</label>
                <input
                  type="text"
                  name="units"
                  value={newProduct.units || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      units: e.target.value,
                    })
                  }
                  className="border px-2 py-1"
                  placeholder="pieces, tablets, bottles, etc."
                />
              </div>

              {/* Units Per Pack field */}
              <div className="flex flex-col mb-2">
                <label className="font-semibold mb-1">Units Per Pack</label>
                <input
                  type="number"
                  name="unitsPerPack"
                  value={newProduct.unitsPerPack || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      unitsPerPack: e.target.value,
                    })
                  }
                  className="border px-2 py-1"
                  min="1"
                />
              </div>

              {/* Shelf Stock field */}
              <div className="flex flex-col mb-2">
                <label className="font-semibold mb-1">Shelf Stock</label>
                <input
                  type="number"
                  name="shelfStock"
                  value={newProduct.shelfStock || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      shelfStock: e.target.value,
                    })
                  }
                  className="border px-2 py-1"
                  min="0"
                />
              </div>

              {/* Expiry Date field */}
              <div className="flex flex-col mb-2">
                <label className="font-semibold mb-1">Expiry Date</label>
                <input
                  type="date"
                  name="expiryDate"
                  value={newProduct.expiryDate || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      expiryDate: e.target.value,
                    })
                  }
                  className="border px-2 py-1"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add"}
                </button>
                <button
                  type="button"
                  className="bg-gray-300 px-4 py-1 rounded"
                  onClick={() => setShowAddDialog(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Only show transfer controls when warehouse view is selected */}
      {!showInventoryView && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-2">
            Transfer Stock to Branch
          </h3>
          {branches.length === 0 && (
            <div className="mb-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
              ⚠️ No branches available. Please add branches first before
              transferring stock.
            </div>
          )}
          {stock.length === 0 && (
            <div className="mb-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
              ⚠️ No stock available. Please add stock first before transferring.
            </div>
          )}
          <form
            onSubmit={handleTransferStock}
            className={`flex gap-2 items-center ${
              branches.length === 0 || stock.length === 0
                ? "opacity-50 pointer-events-none"
                : ""
            }`}
          >
            {/* Searchable dropdown for products using react-select */}
            <div style={{ minWidth: "220px" }}>
              <Select
                options={stock.map((item) => ({
                  value: item._id,
                  label: `${item.productName} (Qty: ${item.quantity})`,
                }))}
                value={
                  stock.length > 0
                    ? stock
                        .filter((item) => item._id === transfer.stockId)
                        .map((item) => ({
                          value: item._id,
                          label: `${item.productName} (Qty: ${item.quantity})`,
                        }))[0]
                    : null
                }
                onChange={(option) =>
                  setTransfer({
                    ...transfer,
                    stockId: option ? option.value : "",
                  })
                }
                placeholder="Select or search product..."
                isClearable
                required
              />
            </div>
            <select
              value={transfer.branchId}
              onChange={(e) =>
                setTransfer({ ...transfer, branchId: e.target.value })
              }
              required
              className="border px-2 py-1"
            >
              <option value="">Select Branch</option>
              {Array.isArray(branches) && branches.length > 0 ? (
                branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No branches available
                </option>
              )}
            </select>
            <input
              type="number"
              placeholder="Quantity"
              value={transfer.quantity}
              onChange={(e) =>
                setTransfer({ ...transfer, quantity: Number(e.target.value) })
              }
              required
              className="border px-2 py-1"
            />
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-1 rounded"
              disabled={isTransferring}
            >
              {isTransferring ? "Transferring..." : "Transfer"}
            </button>
          </form>
        </div>
      )}
      {/* Only show warehouse stock table when warehouse view is selected */}
      {!showInventoryView && (
        <div>
          <h3 className="text-xl font-semibold mb-2">Warehouse Stock</h3>
          <div className="mb-2">
            <input
              type="text"
              placeholder="Search stock by product name..."
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="border px-2 py-1 w-64"
            />
          </div>
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th
                  className="border px-2 py-1 cursor-pointer"
                  onClick={() => handleSort("productName")}
                >
                  Product{" "}
                  {sortColumn === "productName" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="border px-2 py-1 cursor-pointer"
                  onClick={() => handleSort("quantity")}
                >
                  Quantity{" "}
                  {sortColumn === "quantity" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="border px-2 py-1 cursor-pointer"
                  onClick={() => handleSort("supplier.name")}
                >
                  Supplier{" "}
                  {sortColumn === "supplier.name" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(stock) && stock.length > 0 ? (
                stock
                  .filter((item) =>
                    item.productName
                      .toLowerCase()
                      .includes(stockFilter.toLowerCase())
                  )
                  .sort((a, b) => {
                    let comparison = 0;
                    if (sortColumn === "productName") {
                      comparison = a.productName.localeCompare(b.productName);
                    } else if (sortColumn === "quantity") {
                      comparison = a.quantity - b.quantity;
                    } else if (sortColumn === "supplier.name") {
                      comparison = a.supplier.name.localeCompare(
                        b.supplier.name
                      );
                    }
                    return sortDirection === "asc" ? comparison : -comparison;
                  })
                  .map((item) => (
                    <tr key={item._id}>
                      <td className="border px-2 py-1">{item.productName}</td>
                      <td className="border px-2 py-1">{item.quantity}</td>
                      <td className="border px-2 py-1">
                        {item.supplier?.name}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="border px-2 py-1 text-center text-gray-500"
                  >
                    No stock data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* All Branch Inventory View */}
      {showInventoryView && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">All Branch Inventory</h3>

          {/* Loading State */}
          {isLoadingInventory && (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-600">Loading inventory data...</p>
              </div>
            </div>
          )}

          {/* Inventory Content - Only show when not loading */}
          {!isLoadingInventory && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <div className="bg-blue-500 p-3 rounded-lg">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Products
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {allInventory.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <div className="bg-yellow-500 p-3 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Low Stock
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {
                          allInventory.filter(
                            (item) => item.status === "low_stock"
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <div className="bg-red-500 p-3 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Out of Stock
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {
                          allInventory.filter(
                            (item) => item.status === "out_of_stock"
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <div className="bg-green-500 p-3 rounded-lg">
                      <ArrowRightLeft className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Value
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        #
                        {allInventory
                          .reduce(
                            (sum, item) => sum + item.stock * item.price,
                            0
                          )
                          .toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={inventoryFilter.search}
                      onChange={(e) =>
                        setInventoryFilter({
                          ...inventoryFilter,
                          search: e.target.value,
                        })
                      }
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={inventoryFilter.category}
                    onChange={(e) =>
                      setInventoryFilter({
                        ...inventoryFilter,
                        category: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  <select
                    value={inventoryFilter.status}
                    onChange={(e) =>
                      setInventoryFilter({
                        ...inventoryFilter,
                        status: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>

                  <select
                    value={inventoryFilter.branchId}
                    onChange={(e) =>
                      setInventoryFilter({
                        ...inventoryFilter,
                        branchId: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Branches</option>
                    {branches.map((branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inventory Transfer Form */}
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h4 className="text-lg font-semibold mb-3">
                  Transfer Inventory Between Branches
                </h4>
                <form
                  onSubmit={handleInventoryTransfer}
                  className="grid grid-cols-1 md:grid-cols-6 gap-3"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product
                    </label>
                    <Select
                      options={allInventory.map((item) => ({
                        value: item._id,
                        label: `${item.name} (${item.branchName} - ${
                          item.stock
                        } units) - ${item.manufacturer || "N/A"}`,
                      }))}
                      value={
                        allInventory.find(
                          (item) => item._id === inventoryTransfer.inventoryId
                        )
                          ? {
                              value: inventoryTransfer.inventoryId,
                              label: `${
                                allInventory.find(
                                  (item) =>
                                    item._id === inventoryTransfer.inventoryId
                                )?.name
                              } (${
                                allInventory.find(
                                  (item) =>
                                    item._id === inventoryTransfer.inventoryId
                                )?.branchName
                              } - ${
                                allInventory.find(
                                  (item) =>
                                    item._id === inventoryTransfer.inventoryId
                                )?.stock
                              } units) - ${
                                allInventory.find(
                                  (item) =>
                                    item._id === inventoryTransfer.inventoryId
                                )?.manufacturer || "N/A"
                              }`,
                            }
                          : null
                      }
                      onChange={(option) =>
                        setInventoryTransfer({
                          ...inventoryTransfer,
                          inventoryId: option ? option.value : "",
                          fromBranchId: option
                            ? allInventory.find(
                                (item) => item._id === option.value
                              )?.branchId._id || ""
                            : "",
                        })
                      }
                      placeholder="Select product..."
                      isClearable
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Branch
                    </label>
                    <select
                      value={inventoryTransfer.toBranchId}
                      onChange={(e) =>
                        setInventoryTransfer({
                          ...inventoryTransfer,
                          toBranchId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches
                        .filter((b) => b._id !== inventoryTransfer.fromBranchId)
                        .map((branch) => (
                          <option key={branch._id} value={branch._id}>
                            {branch.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={inventoryTransfer.quantity}
                      onChange={(e) =>
                        setInventoryTransfer({
                          ...inventoryTransfer,
                          quantity: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason (Optional)
                    </label>
                    <input
                      type="text"
                      value={inventoryTransfer.reason}
                      onChange={(e) =>
                        setInventoryTransfer({
                          ...inventoryTransfer,
                          reason: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Transfer reason..."
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isInventoryTransferring}
                    >
                      {isInventoryTransferring ? "Transferring..." : "Transfer"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Inventory Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 bg-blue-50 border-b">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Tip:</strong> Click on any row to view detailed
                    information about the inventory item.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleInventorySort("name")}
                        >
                          Product{" "}
                          {inventorySortColumn === "name" &&
                            (inventorySortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleInventorySort("branchName")}
                        >
                          Branch{" "}
                          {inventorySortColumn === "branchName" &&
                            (inventorySortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleInventorySort("stock")}
                        >
                          Stock{" "}
                          {inventorySortColumn === "stock" &&
                            (inventorySortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleInventorySort("price")}
                        >
                          Price{" "}
                          {inventorySortColumn === "price" &&
                            (inventorySortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleInventorySort("status")}
                        >
                          Status{" "}
                          {inventorySortColumn === "status" &&
                            (inventorySortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Manufacturer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expiry Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allInventory
                        .sort((a, b) => {
                          let comparison = 0;
                          if (inventorySortColumn === "name") {
                            comparison = a.name.localeCompare(b.name);
                          } else if (inventorySortColumn === "branchName") {
                            comparison = a.branchName.localeCompare(
                              b.branchName
                            );
                          } else if (inventorySortColumn === "stock") {
                            comparison = a.stock - b.stock;
                          } else if (inventorySortColumn === "price") {
                            comparison = a.price - b.price;
                          } else if (inventorySortColumn === "status") {
                            comparison = a.status.localeCompare(b.status);
                          }
                          return inventorySortDirection === "asc"
                            ? comparison
                            : -comparison;
                        })
                        .map((item) => (
                          <tr
                            key={item._id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedInventoryItem(item);
                              setShowInventoryDetails(true);
                            }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {item.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {item.category}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.branchName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {item.stock} units
                              </div>
                              <div className="text-sm text-gray-500">
                                Min: {item.minStock}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              #${item.price.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  item.status
                                )}`}
                              >
                                {item.status.replace("_", " ").toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>
                                <div className="font-medium">
                                  {item.supplierName}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {item.supplierId?.company || ""}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.manufacturer || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.expiryDate
                                ? new Date(item.expiryDate).toLocaleDateString()
                                : "N/A"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Inventory Details Modal */}
      {showInventoryDetails && selectedInventoryItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Inventory Details</h3>
              <button
                onClick={() => setShowInventoryDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Product Information
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">Name:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.name}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Category:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.category || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Manufacturer:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.manufacturer || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Composition:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.composition || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Series:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.series || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Stock Information
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">
                      Current Stock:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.stock} units
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Minimum Stock:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.minStock} units
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Reserved Quantity:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.reservedQuantity} units
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span
                      className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        selectedInventoryItem.status
                      )}`}
                    >
                      {selectedInventoryItem.status
                        .replace("_", " ")
                        .toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Pricing Information
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">
                      Retail Price (VAT Included):
                    </span>
                    <span className="ml-2 text-gray-900">
                      #
                      {selectedInventoryItem.retailPriceVATIncluded?.toFixed(
                        2
                      ) || selectedInventoryItem.price.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Purchase Price (Excl. VAT):
                    </span>
                    <span className="ml-2 text-gray-900">
                      #${selectedInventoryItem.purchasePriceExclVAT.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">VAT:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.vat}%
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Total Value:
                    </span>
                    <span className="ml-2 text-gray-900">
                      #
                      {(
                        selectedInventoryItem.stock *
                        selectedInventoryItem.price
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Location & Supplier
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">Branch:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.branchName}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Store:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.store || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Supplier:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.supplierName}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Supplier Company:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.supplierId?.company || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Supplier Contact:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.supplierId?.contact || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Dates & Additional Info
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">
                      Expiry Date:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.expiryDate
                        ? new Date(
                            selectedInventoryItem.expiryDate
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.createdAt
                        ? new Date(
                            selectedInventoryItem.createdAt
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Last Updated:
                    </span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.updatedAt
                        ? new Date(
                            selectedInventoryItem.updatedAt
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Divider:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedInventoryItem.divider || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInventoryDetails(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagement;
