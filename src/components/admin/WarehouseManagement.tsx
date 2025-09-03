import React, { useEffect, useState, useRef } from 'react';
import Select from 'react-select';
import { apiEndpoints, api } from '../../utils/api';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

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
  const [sortColumn, setSortColumn] = useState<string>("productName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
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
  const [transfer, setTransfer] = useState({ stockId: '', branchId: '', quantity: 0 });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
    // Removed supplier dialog state

  // Sorting handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    fetchStock();
    fetchSuppliers();
    fetchBranches();
  }, []);

  const fetchStock = async () => {
    try {
      const data = await apiEndpoints.getWarehouseStock();
      if (Array.isArray(data)) {
        setStock(data);
      } else {
        console.error('Stock API did not return an array:', data);
        setStock([]);
        Swal.fire({
          icon: 'warning',
          title: 'Data Format Warning',
          text: 'Stock data format is unexpected. Please contact support.',
          confirmButtonColor: '#3085d6'
        });
      }
    } catch (err: any) {
      console.error('Error fetching stock:', err);
      setStock([]);
      
      let errorMessage = 'Failed to fetch stock data';
      if (err.message?.includes('500')) {
        errorMessage = 'Server error occurred while fetching stock data.';
      } else if (err.message?.includes('404')) {
        errorMessage = 'Stock API endpoint not found.';
      } else if (err.message?.includes('timeout')) {
        errorMessage = 'Request timeout while fetching stock data.';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Network error while fetching stock data.';
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#3085d6'
      });
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await apiEndpoints.getSuppliers();
      if (Array.isArray(data)) {
        setSuppliers(data);
      } else {
        console.error('Suppliers API did not return an array:', data);
        setSuppliers([]);
        Swal.fire({
          icon: 'warning',
          title: 'Data Format Warning',
          text: 'Suppliers data format is unexpected. Please contact support.',
          confirmButtonColor: '#3085d6'
        });
      }
    } catch (err: any) {
      console.error('Error fetching suppliers:', err);
      setSuppliers([]);
      
      let errorMessage = 'Failed to fetch suppliers data';
      if (err.message?.includes('500')) {
        errorMessage = 'Server error occurred while fetching suppliers data.';
      } else if (err.message?.includes('404')) {
        errorMessage = 'Suppliers API endpoint not found.';
      } else if (err.message?.includes('timeout')) {
        errorMessage = 'Request timeout while fetching suppliers data.';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Network error while fetching suppliers data.';
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#3085d6'
      });
    }
  };

  const fetchBranches = async () => {
    try {
      const data = await apiEndpoints.getBranches();
      if (Array.isArray(data)) {
        setBranches(data);
      } else {
        console.error('Branches API did not return an array:', data);
        setBranches([]);
        Swal.fire({
          icon: 'warning',
          title: 'Data Format Warning',
          text: 'Branches data format is unexpected. Please contact support.',
          confirmButtonColor: '#3085d6'
        });
      }
    } catch (err: any) {
      console.error('Error fetching branches:', err);
      setBranches([]);
      
      let errorMessage = 'Failed to fetch branches data';
      if (err.message?.includes('500')) {
        errorMessage = 'Server error occurred while fetching branches data.';
      } else if (err.message?.includes('404')) {
        errorMessage = 'Branches API endpoint not found.';
      } else if (err.message?.includes('timeout')) {
        errorMessage = 'Request timeout while fetching branches data.';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Network error while fetching branches data.';
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#3085d6'
      });
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent multiple submissions
    
    // Check if suppliers are available
    if (suppliers.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'No Suppliers Available',
        text: 'Please add suppliers first before adding stock.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    // Strong frontend validation for required fields and types
    if (!newProduct.name || !newProduct.supplier) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please fill in Product Name and Supplier.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    // Trim whitespace from text fields
    if (newProduct.name.trim() === '') {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Product name cannot be empty or just whitespace.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    // Validate product name length
    if (newProduct.name.trim().length > 100) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Product name cannot exceed 100 characters.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    // Validate category if provided
    if (newProduct.category && newProduct.category.trim() === '') {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Category cannot be just whitespace.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    // Validate category length if provided
    if (newProduct.category && newProduct.category.trim().length > 50) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Category cannot exceed 50 characters.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    if (!newProduct.stock || isNaN(Number(newProduct.stock)) || Number(newProduct.stock) <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please enter a valid Stock quantity (number > 0).',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    // Validate stock format
    if (newProduct.stock.includes('-') || newProduct.stock.includes('.')) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Stock quantity must be a positive whole number.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    // Validate stock quantity is not too large
    if (Number(newProduct.stock) > 999999) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Stock quantity cannot exceed 999,999.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Confirm Add Product',
      text: `Are you sure you want to add "${newProduct.name}" with quantity ${newProduct.stock}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, add it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Show loading state
      Swal.fire({
        title: 'Adding Product...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Map frontend fields to backend requirements
      const { name, stock, minStock, price, expiryDate, } = newProduct;
      
      // Additional validation
      const quantity = Number(stock);
      const minStockNum = minStock ? Number(minStock) : undefined;
      const priceNum = price ? Number(price) : undefined;
      
      if (isNaN(quantity) || quantity <= 0) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Stock quantity must be a valid positive number.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      
      if (minStock && (isNaN(minStockNum!) || minStockNum! < 0)) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Minimum stock must be a valid non-negative number.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      
      // Validate minStock format if provided
      if (minStock && minStock.includes('-')) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Minimum stock cannot be negative.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      
      // Validate minStock is a whole number if provided
      if (minStock && minStock.includes('.')) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Minimum stock must be a whole number.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      
      // Validate minStock quantity is not too large if provided
      if (minStock && Number(minStock) > 999999) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Minimum stock quantity cannot exceed 999,999.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      
      // Validate minStock is not greater than stock quantity
      if (minStock && Number(minStock) > Number(newProduct.stock)) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Minimum stock cannot be greater than the stock quantity.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      
      if (price && (isNaN(priceNum!) || priceNum! < 0)) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Price must be a valid non-negative number.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      
      // Validate price format if provided
      if (price && price.includes('-')) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Price cannot be negative.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      
      // Validate price has at most 2 decimal places if provided
      if (price && price.includes('.') && price.split('.')[1]?.length > 2) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Price can have at most 2 decimal places.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      
      // Validate price is not too large if provided
      if (price && Number(price) > 999999.99) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Price cannot exceed 999,999.99.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      
      // Validate supplier ID format (basic check)
      if (!newProduct.supplier || newProduct.supplier.length !== 24) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Invalid supplier selected. Please select a valid supplier.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      
      // Validate supplier ID is not just whitespace
      if (newProduct.supplier.trim() === '') {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Supplier cannot be empty.',
          confirmButtonColor: '#3085d6'
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
            icon: 'error',
            title: 'Validation Error',
            text: 'Expiry date cannot be in the past.',
            confirmButtonColor: '#3085d6'
          });
          return;
        }
        
        // Validate date format
        if (isNaN(expiryDateObj.getTime())) {
          Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: 'Invalid expiry date format.',
            confirmButtonColor: '#3085d6'
          });
          return;
        }
      }
      
      const data = {
        productName: name,
        quantity: quantity,
        minStock: minStockNum,
        price: priceNum,
        expiryDate: expiryDate || undefined,
        supplierId: newProduct.supplier,
        category: newProduct.category || undefined
      };

      console.log('Sending data to backend:', data);
      
      await apiEndpoints.addWarehouseStock(data);
      
      // Create delivery record for the supplier
      try {
        // Note: Delivery record creation is skipped as it's not a standard CRUD operation
        // and the endpoint is not available in the current apiEndpoints
        console.log('Delivery record creation skipped - endpoint not available in apiEndpoints');
      } catch (deliveryErr) {
        console.warn('Failed to create delivery record:', deliveryErr);
        // Don't fail the whole operation if delivery record creation fails
      }
      
      // Close loading dialog
      Swal.close();
      
      // Success
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Product added successfully and delivery record created!',
        confirmButtonColor: '#3085d6'
      });
      
      setNewProduct(initialProductState);
      fetchStock();
      
      // Small delay before closing dialog to ensure user sees success message
      setTimeout(() => {
        setShowAddDialog(false);
      }, 1000);
      
    } catch (err: any) {
      console.error('Error adding product:', err);
      
      let errorMessage = 'Error adding product';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid data provided. Please check your input.';
      } else if (err.response?.status === 409) {
        errorMessage = 'Conflict: Product or supplier already exists.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection and try again.';
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#3085d6'
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
          title: 'Confirm Warehouse Import',
          text: `Import warehouse stock from "${file.name}"?`,
          html: `
            <div class="text-left">
              <p><strong>File:</strong> ${file.name}</p>
              <p><strong>Size:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Smart Import:</strong> Existing stock will be updated, new items will be added</p>
              <p><strong>Stock Update:</strong> Stock quantities will be ADDED to existing items (not replaced)</p>
              <p><strong>Supplier Management:</strong> New suppliers will be automatically created</p>
              <p><strong>Field Mapping:</strong> SKU → Product Name, Supplier Name → Supplier, Manufacturer Name → Manufacturer, etc.</p>
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
        
        const response = await api.upload('/api/warehouse/import-excel', formData);
        
        // Show success message with summary
        const { summary } = response;
        Swal.fire({
          title: 'Warehouse Import Successful!',
          html: `
            <div class="text-left">
              <p><strong>Total processed:</strong> ${summary.totalProcessed}</p>
              <p><strong>Stock updated:</strong> ${summary.stockUpdated}</p>
              <p><strong>Stock added:</strong> ${summary.stockAdded}</p>
              <p><strong>Quantity added to existing stock:</strong> +${summary.quantityAdded}</p>
              <p><strong>Suppliers created:</strong> ${summary.suppliersCreated}</p>
              <p><strong>Unique suppliers:</strong> ${summary.uniqueSuppliers}</p>
              <p><strong>Unique manufacturers:</strong> ${summary.uniqueManufacturers}</p>
              <p><strong>Categories:</strong> ${summary.categories.join(', ')}</p>
              <p><strong>Total retail value:</strong> $${summary.totalRetailValue.toFixed(2)}</p>
              <p><strong>Total purchase value:</strong> $${summary.totalPurchaseValue.toFixed(2)}</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Great!'
        });
        
        // Refresh warehouse stock after import
        fetchStock();
        
      } catch (err: any) {
        console.error('Error importing warehouse stock:', err);
        
        let errorMessage = 'Error importing warehouse stock';
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response?.status === 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        } else if (err.response?.status === 400) {
          errorMessage = 'Invalid data provided. Please check your Excel file.';
        } else if (err.code === 'ECONNABORTED') {
          errorMessage = 'Request timeout. Please check your connection and try again.';
        } else if (err.code === 'ERR_NETWORK') {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Import Failed',
          text: errorMessage,
          confirmButtonColor: '#3085d6'
        });
      }
    } else if (fileType === "pdf") {
      Swal.fire({
        icon: 'warning',
        title: 'Unsupported File Type',
        text: 'PDF import is not supported. Please use Excel file.',
        confirmButtonColor: '#3085d6'
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Unsupported File Type',
        text: 'Unsupported file type. Please upload an Excel (.xlsx/.xls) file.',
        confirmButtonColor: '#3085d6'
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if branches are available
    if (branches.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'No Branches Available',
        text: 'Please add branches first before transferring stock.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    if (!transfer.stockId || !transfer.branchId || transfer.quantity <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please select product, branch and enter a valid quantity.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    // Validate quantity is a positive integer
    if (!Number.isInteger(transfer.quantity) || transfer.quantity <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Quantity must be a positive whole number.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    // Find the product name for confirmation
    const selectedProduct = stock.find(item => item._id === transfer.stockId);
    const selectedBranch = branches.find(branch => branch._id === transfer.branchId);
    
    if (!selectedProduct || !selectedBranch) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Selected product or branch not found.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    // Check if there's sufficient stock
    if (selectedProduct.quantity < transfer.quantity) {
      Swal.fire({
        icon: 'error',
        title: 'Insufficient Stock',
        text: `Only ${selectedProduct.quantity} units available. Cannot transfer ${transfer.quantity} units.`,
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Confirm Transfer',
      text: `Are you sure you want to transfer ${transfer.quantity} units of "${selectedProduct.productName}" to "${selectedBranch.name}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, transfer it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsTransferring(true);

    try {
      // Show loading state
      Swal.fire({
        title: 'Transferring Stock...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const transferData = await apiEndpoints.transferStock(transfer);
      
      // Show success with transfer details
      Swal.fire({
        icon: 'success',
        title: 'Transfer Successful!',
        html: `
          <p>Stock transferred successfully!</p>
          <p><strong>Quantity:</strong> ${transfer.quantity}</p>
          <p><strong>Remaining Stock:</strong> ${transferData.remainingStock}</p>
        `,
        confirmButtonColor: '#3085d6'
      });
      
      // Reset form and refresh data
      setTransfer({ stockId: '', branchId: '', quantity: 0 });
      fetchStock();
    } catch (err: any) {
      console.error('Error transferring stock:', err);
      
      let errorMessage = 'Error transferring stock';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid data provided. Please check your input.';
      } else if (err.response?.status === 409) {
        errorMessage = 'Conflict: Insufficient stock or invalid transfer.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection and try again.';
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setIsTransferring(false);
    }
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
            className={`px-4 py-1 rounded ${suppliers.length > 0 ? 'bg-blue-500 text-white' : 'bg-gray-400 text-gray-600 cursor-not-allowed'}`}
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
            style={{ textDecoration: 'none' }}
          >
            Add Supplier
          </Link>
        </div>
        {suppliers.length === 0 && (
          <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
            ⚠️ No suppliers available. Please add suppliers first before adding stock.
          </div>
        )}
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded">
          📋 <strong>Bulk Import:</strong> Upload Excel files to add multiple products at once. Supported columns: SKU, Quantity, Retail price VAT included, Supplier name, Manufacturer name, Composition, etc.
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
                    <label className="font-semibold mb-1">
                      {field === 'name' ? 'Product Name' : field === 'stock' ? 'Stock Quantity' : field === 'minStock' ? 'Minimum Stock' : field}
                      {field === 'name' || field === 'stock' ? ' *' : ''}
                    </label>
                    <input
                      type={field === 'stock' || field === 'minStock' ? 'number' : 'text'}
                      name={field}
                      value={newProduct[field] || ''}
                      onChange={e => setNewProduct({ ...newProduct, [field]: e.target.value })}
                      className="border px-2 py-1"
                      required={field === 'name' || field === 'stock'}
                      min={field === 'stock' || field === 'minStock' ? '0' : undefined}
                    />
                  </div>
                ))}
                {/* Supplier Dropdown after minStock */}
                <div className="flex flex-col mb-2">
                  <label className="font-semibold mb-1">Supplier *</label>
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
                    <label className="font-semibold mb-1">
                      {field === 'price' ? 'Price' : 'Expiry Date'}
                    </label>
                    <input
                      type={field === 'expiryDate' ? 'date' : 'number'}
                      name={field}
                      value={newProduct[field] || ''}
                      onChange={e => setNewProduct({ ...newProduct, [field]: e.target.value })}
                      className="border px-2 py-1"
                      min={field === 'price' ? '0' : undefined}
                      step={field === 'price' ? '0.01' : undefined}
                    />
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <button 
                    type="submit" 
                    className="bg-blue-500 text-white px-4 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Adding...' : 'Add'}
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
      </div>
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Transfer Stock to Branch</h3>
        {branches.length === 0 && (
          <div className="mb-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
            ⚠️ No branches available. Please add branches first before transferring stock.
          </div>
        )}
        {stock.length === 0 && (
          <div className="mb-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
            ⚠️ No stock available. Please add stock first before transferring.
          </div>
        )}
        <form onSubmit={handleTransferStock} className={`flex gap-2 items-center ${branches.length === 0 || stock.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
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
          <button type="submit" className="bg-green-500 text-white px-4 py-1 rounded" disabled={isTransferring}>
            {isTransferring ? 'Transferring...' : 'Transfer'}
          </button>
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
              <th className="border px-2 py-1 cursor-pointer" onClick={() => handleSort("productName")}>
                Product {sortColumn === "productName" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th className="border px-2 py-1 cursor-pointer" onClick={() => handleSort("quantity")}>
                Quantity {sortColumn === "quantity" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th className="border px-2 py-1 cursor-pointer" onClick={() => handleSort("supplier.name")}>
                Supplier {sortColumn === "supplier.name" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(stock) && stock.length > 0 ? (
              stock
                .filter(item =>
                  item.productName.toLowerCase().includes(stockFilter.toLowerCase())
                )
                .sort((a, b) => {
                  let comparison = 0;
                  if (sortColumn === "productName") {
                    comparison = a.productName.localeCompare(b.productName);
                  } else if (sortColumn === "quantity") {
                    comparison = a.quantity - b.quantity;
                  } else if (sortColumn === "supplier.name") {
                    comparison = a.supplier.name.localeCompare(b.supplier.name);
                  }
                  return sortDirection === "asc" ? comparison : -comparison;
                })
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
