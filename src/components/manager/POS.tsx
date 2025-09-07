import GreenProgressBar from "../GreenProgressBar";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { apiEndpoints } from "../../utils/api";
import Swal from "sweetalert2";
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  CreditCard,
  DollarSign,
  Banknote,
} from "lucide-react";

interface Product {
  _id: string;
  id: string;
  name: string;
  price: number;
  unitPrice?: number; // Unit price for individual tablets
  stock: number;
  shelfStock?: number; // Stock on shelf/display
  unitsPerPack?: number; // Number of units per pack
  units?: string; // Unit of measurement (tablets, bottles, boxes, etc.)
  category: string;
  manufacturer?: string;
  minStock?: number;
  status?: "In Stock" | "Low Stock" | "Out of Stock";
  expiryDate?: string;
}

interface CartItem extends Product {
  quantity: number;
  isUnitPurchase?: boolean; // Whether this item was purchased by unit or full pack
  unitsSold?: number; // Total units sold (calculated)
  packsSold?: number; // Total packs sold (calculated)
}

const POS: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBill, setShowBill] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [cashierName, setCashierName] = useState(
    () => localStorage.getItem("cashierName") || ""
  );
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [showPurchaseTypeModal, setShowPurchaseTypeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showUnitQuantityModal, setShowUnitQuantityModal] = useState(false);
  const [unitQuantity, setUnitQuantity] = useState(1);

  // Print styles for receipt
  const printStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      .receipt-print, .receipt-print * {
        visibility: visible;
      }
      .receipt-print {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background: white;
        padding: 20px;
        margin: 0;
        box-shadow: none;
        border: none;
      }
      .receipt-print .print-hidden {
        display: none !important;
      }
    }
  `;

  // Helper to add status to a product (copied from InventoryManagement)
  const addStatus = (product: any) => {
    let status: "In Stock" | "Low Stock" | "Out of Stock";
    if (product.stock === 0) status = "Out of Stock";
    else if (
      product.minStock !== undefined &&
      product.stock <= product.minStock
    )
      status = "Low Stock";
    else status = "In Stock";
    return { ...product, status, id: product._id || product.id };
  };

  // Helper function to calculate units and packs for a cart item
  const calculateUnitsAndPacks = (item: CartItem) => {
    const unitsPerPack = item.unitsPerPack || 1;
    let unitsSold = 0;
    let packsSold = 0;

    if (item.isUnitPurchase) {
      // Selling individual units
      unitsSold = item.quantity;
      packsSold = Math.floor(unitsSold / unitsPerPack);
    } else {
      // Selling full packs
      packsSold = item.quantity;
      unitsSold = packsSold * unitsPerPack;
    }

    return { unitsSold, packsSold };
  };

  // Helper function to calculate total units and packs for all cart items
  const calculateTotalUnitsAndPacks = () => {
    let totalUnits = 0;
    let totalPacks = 0;

    cart.forEach(item => {
      const { unitsSold, packsSold } = calculateUnitsAndPacks(item);
      totalUnits += unitsSold;
      totalPacks += packsSold;
    });

    return { totalUnits, totalPacks };
  };

  // Fetch products from API (filtered by manager's branch)
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use authenticated API endpoint
      const data = await apiEndpoints.getInventory(user?.branchId);

      const productsWithStatus = data.map(addStatus);
      setProducts(productsWithStatus);
    } catch (err: any) {
      setError(err.message || "Error fetching products");
    } finally {
      setLoading(false);
    }
  }, [user?.branchId]);

  useEffect(() => {
    fetchProducts();
    fetchBranchInfo();
  }, [fetchProducts]);

  // Fetch branch information
  const fetchBranchInfo = useCallback(async () => {
    if (user?.branchId) {
      try {
        const branches = await apiEndpoints.getBranches();
        const currentBranch = branches.find(
          (branch: any) => branch._id === user.branchId
        );
        if (currentBranch) {
          setBranchInfo(currentBranch);
        }
      } catch (err) {
        console.error("Error fetching branch info:", err);
      }
    }
  }, [user?.branchId]);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.manufacturer &&
        product.manufacturer
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    // Always show purchase type selection modal for all products
    setSelectedProduct(product);
    setShowPurchaseTypeModal(true);
  };

  const addToCartDirect = (product: Product, isUnitPurchase: boolean, quantity: number = 1) => {
    const existingItem = cart.find((item) => item._id === product._id && item.isUnitPurchase === isUnitPurchase);
    
    // Determine available stock based on purchase type
    const availableStock = isUnitPurchase 
      ? (product.shelfStock !== undefined ? product.shelfStock : product.stock)
      : product.stock;
    
    if (existingItem) {
      if (existingItem.quantity + quantity <= availableStock) {
        const updatedItem = { ...existingItem, quantity: existingItem.quantity + quantity };
        const { unitsSold, packsSold } = calculateUnitsAndPacks(updatedItem);
        updatedItem.unitsSold = unitsSold;
        updatedItem.packsSold = packsSold;
        
        setCart(
          cart.map((item) =>
            item._id === product._id && item.isUnitPurchase === isUnitPurchase
              ? updatedItem
              : item
          )
        );
      } else {
        Swal.fire({
          title: "Stock Limit Reached",
          text: `Cannot add ${quantity} more ${product.name}. Only ${availableStock - existingItem.quantity} available in ${isUnitPurchase ? 'shelf' : 'total'} stock.`,
          icon: "warning",
          confirmButtonText: "OK",
        });
      }
    } else {
      if (availableStock >= quantity) {
        const newItem: CartItem = { ...product, quantity: quantity, isUnitPurchase };
        const { unitsSold, packsSold } = calculateUnitsAndPacks(newItem);
        newItem.unitsSold = unitsSold;
        newItem.packsSold = packsSold;
        
        setCart([...cart, newItem]);
      } else {
        Swal.fire({
          title: "Insufficient Stock",
          text: `Cannot add ${quantity} ${product.name}. Only ${availableStock} available in ${isUnitPurchase ? 'shelf' : 'total'} stock.`,
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const updateQuantity = (_id: string, quantity: number, isUnitPurchase?: boolean) => {
    if (quantity === 0) {
      setCart(cart.filter((item) => !(item._id === _id && item.isUnitPurchase === isUnitPurchase)));
    } else {
      const product = products.find((p) => p._id === _id);
      if (product) {
        // Determine available stock based on purchase type
        const availableStock = isUnitPurchase 
          ? (product.shelfStock !== undefined ? product.shelfStock : product.stock)
          : product.stock;
          
        if (quantity <= availableStock) {
          setCart(
            cart.map((item) => {
              if (item._id === _id && item.isUnitPurchase === isUnitPurchase) {
                const updatedItem = { ...item, quantity };
                const { unitsSold, packsSold } = calculateUnitsAndPacks(updatedItem);
                updatedItem.unitsSold = unitsSold;
                updatedItem.packsSold = packsSold;
                return updatedItem;
              }
              return item;
            })
          );
        } else {
          Swal.fire({
            title: "Stock Limit Exceeded",
            text: `Cannot set quantity to ${quantity}. Only ${availableStock} available in ${isUnitPurchase ? 'shelf' : 'total'} stock.`,
            icon: "warning",
            confirmButtonText: "OK",
          });
        }
      }
    }
  };

  const removeFromCart = (_id: string, isUnitPurchase?: boolean) => {
    setCart(cart.filter((item) => !(item._id === _id && item.isUnitPurchase === isUnitPurchase)));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => {
      const price = item.isUnitPurchase && item.unitPrice ? item.unitPrice : item.price;
      return total + price * item.quantity;
    }, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // Persist cashier name
  useEffect(() => {
    localStorage.setItem("cashierName", cashierName);
  }, [cashierName]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Swal.fire({
        title: "Empty Cart",
        text: "Cart is empty",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    if (!user?.branchId) {
      Swal.fire({
        title: "Branch Access Required",
        text: "Branch information not available. Please contact administrator.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    // Validate stock quantities before proceeding
    for (const item of cart) {
      const availableStock = item.isUnitPurchase 
        ? (item.shelfStock !== undefined ? item.shelfStock : item.stock)
        : item.stock;
        
      if (item.quantity > availableStock) {
        Swal.fire({
          title: "Stock Validation Failed",
          text: `Cannot complete transaction: ${item.name} quantity (${item.quantity}) exceeds available ${item.isUnitPurchase ? 'shelf' : 'total'} stock (${availableStock})`,
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }
    }

    // Branch and company info
    const BRANCH_ADDRESS =
      branchInfo?.address || "Professional Healthcare Services";
    const BRANCH_NAME = branchInfo?.name || "Main Branch";
    const MANAGER_CONTACT = branchInfo?.phone || "+1 (555) 123-4567";
    const ADDITIONAL_NOTE =
      "Thank you for shopping with us! No returns after 7 days.";

    // Map cart items to match backend schema
    const transaction = {
      transactionId: `TXN${Date.now()}`,
      items: cart.map((item) => {
        const { unitsSold, packsSold } = calculateUnitsAndPacks(item);
        return {
          productId: item._id,
          quantity: item.quantity,
          price: item.isUnitPurchase && item.unitPrice ? item.unitPrice : item.price,
          isUnitPurchase: item.isUnitPurchase || false,
          unitsSold: unitsSold,
          packsSold: packsSold,
        };
      }),
      totalAmount: getTotalAmount(),
      customerName: customerName.trim() ? customerName : undefined,
      cashierName: cashierName.trim() ? cashierName : undefined,
      paymentMethod: paymentMethod,
      branchId: user?.branchId,
      date: new Date(),
    };

    try {
      // Send transaction to backend using authenticated API
      await apiEndpoints.createTransaction(transaction);

      // Update stock quantities after successful transaction
      await updateStockQuantities();

      // Show bill using the original transaction object (with all display info)
      setLastTransaction({
        items: cart,
        total: getTotalAmount(),
        paymentMethod,
        date: new Date().toLocaleString(),
        branchName: BRANCH_NAME,
        branchAddress: BRANCH_ADDRESS,
        managerContact: MANAGER_CONTACT,
        additionalNote: ADDITIONAL_NOTE,
        cashierName: cashierName.trim() ? cashierName : "N/A",
        transactionId: transaction.transactionId,
      });
      setShowBill(true);
      // Clear cart and reset form
      setCart([]);
      setCustomerName("");
      setPaymentMethod("cash");
      // Refresh products in case stock changed
      fetchProducts();
    } catch (err: any) {
      Swal.fire({
        title: "Transaction Failed",
        text: "Error completing transaction: " + (err.message || err),
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Function to update stock quantities after sale
  const updateStockQuantities = async () => {
    try {
      // Update stock for each item in cart
      for (const item of cart) {
        const { unitsSold, packsSold } = calculateUnitsAndPacks(item);
        
        // Calculate new stock based on what was actually sold
        let newStock = item.stock;
        let newShelfStock = item.shelfStock;
        
        if (item.isUnitPurchase) {
          // Selling individual units - reduce by units sold
          newStock = item.stock - unitsSold;
          if (item.shelfStock !== undefined) {
            newShelfStock = Math.max(0, item.shelfStock - unitsSold);
          }
        } else {
          // Selling full packs - reduce by packs sold
          newStock = item.stock - packsSold;
          // For pack sales, also reduce shelf stock by the units in those packs
          if (item.shelfStock !== undefined) {
            newShelfStock = Math.max(0, item.shelfStock - unitsSold);
          }
        }

        try {
          // Prepare update data
          const updateData: any = { stock: newStock };
          if (item.shelfStock !== undefined) {
            updateData.shelfStock = newShelfStock;
          }

          await apiEndpoints.updateInventory(item._id, updateData);
        } catch (error) {
          console.error(
            `Failed to update stock for product ${item.name}:`,
            error
          );
          // Log the error but don't fail the entire transaction
          // The stock will be refreshed when fetchProducts() is called
        }
      }

      // Update local products state to reflect new stock quantities
      setProducts((prevProducts) =>
        prevProducts.map((product) => {
          const cartItem = cart.find((item) => item._id === product._id);
          if (cartItem) {
            const { unitsSold, packsSold } = calculateUnitsAndPacks(cartItem);
            const updatedProduct = {
              ...product,
              stock: cartItem.isUnitPurchase 
                ? product.stock - unitsSold 
                : product.stock - packsSold,
            };
            
            // Update shelf stock for both unit and pack purchases
            if (product.shelfStock !== undefined) {
              updatedProduct.shelfStock = Math.max(0, product.shelfStock - unitsSold);
            }
            
            return updatedProduct;
          }
          return product;
        })
      );
    } catch (error) {
      console.error("Error updating stock quantities:", error);
      // Even if stock update fails, we don't want to fail the entire transaction
      // The stock will be refreshed when fetchProducts() is called
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Point of Sale</h2>
          <p className="text-gray-600">Process customer transactions</p>
        </div>
        <div className="mt-2 sm:mt-0 sm:ml-4 flex flex-col items-end">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cashier Name
          </label>
          <input
            type="text"
            value={cashierName}
            onChange={(e) => setCashierName(e.target.value)}
            placeholder="Enter cashier name"
            className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-400 mt-1">
            This will remain until changed or cleared.
          </div>
        </div>
      </div>

      {/* Stock Summary */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {products.length}
              </div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {products.filter((p) => p.stock > (p.minStock || 5)).length}
              </div>
              <div className="text-sm text-gray-600">In Stock</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {
                  products.filter(
                    (p) => p.stock > 0 && p.stock <= (p.minStock || 5)
                  ).length
                }
              </div>
              <div className="text-sm text-gray-600">Low Stock</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
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
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {products.filter((p) => p.stock === 0).length}
              </div>
              <div className="text-sm text-gray-600">Out of Stock</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-gray-900">Products</h3>
                {user?.branchId && (
                  <span className="text-sm text-gray-500">
                    Showing products from your branch
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <GreenProgressBar loading={loading}>
              {error ? (
                <div className="text-center text-red-500 py-8">{error}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => {
                    // Expiry and stock logic
                    let isExpired = false;
                    let expiryDisplay = null;
                    if (product.expiryDate) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const expiry = new Date(product.expiryDate);
                      expiry.setHours(0, 0, 0, 0);
                      isExpired = expiry.getTime() < today.getTime();
                      expiryDisplay = (
                        <span
                          className={
                            "text-xs font-semibold " +
                            (isExpired ? "text-red-600" : "text-gray-500")
                          }
                        >
                          Expiry: {expiry.toLocaleDateString()}
                        </span>
                      );
                    }
                    const isOutOfStock = product.stock === 0;
                    return (
                      <div
                        key={product._id}
                        className={
                          "border border-gray-200 rounded-lg p-4 transition-shadow " +
                          (isExpired ? "bg-red-100 " : "") +
                          (product.stock === 0 ? "bg-gray-100 " : "") +
                          (product.stock > 0 &&
                          product.stock <= (product.minStock || 5)
                            ? "bg-yellow-100 "
                            : "") +
                          (!isOutOfStock && !isExpired
                            ? "hover:shadow-md cursor-pointer"
                            : "opacity-60 cursor-not-allowed")
                        }
                        onClick={() => {
                          if (!isOutOfStock && !isExpired) addToCart(product);
                        }}
                      >
                        <h3 className="font-medium text-gray-900 text-sm mb-1">
                          {product.name}
                        </h3>
                        {product.manufacturer && (
                          <p className="text-xs text-gray-600 mb-1">
                            {product.manufacturer}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mb-2">
                          {product.category}
                        </p>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-blue-600">
                              ${product.price}
                            </span>
                            {product.unitPrice && product.unitPrice > 0 && (
                              <span className="text-xs text-green-600 font-medium">
                                ${product.unitPrice} per unit
                              </span>
                            )}
                            {product.unitsPerPack && product.unitsPerPack > 1 && (
                              <span className="text-xs text-gray-500">
                                ({product.unitsPerPack} {product.units || 'units'} per pack)
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span
                              className={
                                "text-xs font-semibold " +
                                (isOutOfStock
                                  ? "text-red-600"
                                  : product.stock <= (product.minStock || 5)
                                  ? "text-yellow-600"
                                  : "text-green-600")
                              }
                            >
                              {product.stock} in stock
                            </span>
                            {product.shelfStock !== undefined && product.shelfStock > 0 && (
                              <div className="text-xs text-blue-600 font-medium">
                                {product.shelfStock} on shelf
                              </div>
                            )}
                          </div>
                        </div>
                        {expiryDisplay}
                        {product.stock > 0 &&
                          product.stock <= (product.minStock || 5) && (
                            <div className="text-xs text-yellow-600 font-semibold mt-1">
                              ⚠️ Low Stock Alert
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}
            </GreenProgressBar>
          </div>
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Cart</h3>
              <div className="flex items-center">
                <ShoppingCart className="h-5 w-5 text-gray-400 mr-1" />
                <span className="text-sm text-gray-600">
                  {getTotalItems()} items
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Cart is empty</p>
              ) : (
                cart.map((item, index) => {
                  const currentPrice = item.isUnitPurchase && item.unitPrice ? item.unitPrice : item.price;
                  const priceLabel = item.isUnitPurchase ? "per unit" : "per pack";
                  
                  return (
                    <div
                      key={`${item._id}-${item.isUnitPurchase ? 'unit' : 'pack'}-${index}`}
                      className="flex items-center justify-between border-b border-gray-100 pb-3"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          ${currentPrice.toFixed(2)} {priceLabel}
                        </p>
                        {item.isUnitPurchase && (
                          <p className="text-xs text-blue-600 font-medium">
                            Unit Purchase
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          Stock: {item.stock - item.quantity} remaining
                          {item.shelfStock !== undefined && (
                            <span className="ml-2 text-blue-600">
                              (Shelf: {item.shelfStock - (item.isUnitPurchase ? item.quantity : (item.quantity * (item.unitsPerPack || 1)))} remaining)
                            </span>
                          )}
                        </p>
                        {/* Show units and packs breakdown */}
                        <div className="text-xs text-gray-500 mt-1">
                          {item.isUnitPurchase ? (
                            <span>
                              Units: {item.unitsSold || 0} | Packs: {item.packsSold || 0}
                            </span>
                          ) : (
                            <span>
                              Packs: {item.packsSold || 0} | Units: {item.unitsSold || 0}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            updateQuantity(item._id, item.quantity - 1, item.isUnitPurchase)
                          }
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item._id, item.quantity + 1, item.isUnitPurchase)
                          }
                          className="p-1 rounded-full hover:bg-gray-100"
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item._id, item.isUnitPurchase)}
                          className="p-1 rounded-full hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {cart.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {/* Units and Packs Summary */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Sale Summary:</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Units:</span>
                      <span className="font-semibold text-blue-600">
                        {calculateTotalUnitsAndPacks().totalUnits}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Packs:</span>
                      <span className="font-semibold text-green-600">
                        {calculateTotalUnitsAndPacks().totalPacks}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium text-gray-900">
                    Total:
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    ${getTotalAmount().toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Customer & Payment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Customer & Payment
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="cash"
                      checked={paymentMethod === "cash"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <DollarSign className="h-4 w-4 mr-1" />
                    Cash
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <CreditCard className="h-4 w-4 mr-1" />
                    Card
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="transfer"
                      checked={paymentMethod === "transfer"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <Banknote className="h-4 w-4 mr-1" />
                    Transfer
                  </label>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Complete Transaction
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Modal */}
      {showBill && lastTransaction && (
        <>
          {/* Inject print styles */}
          <style dangerouslySetInnerHTML={{ __html: printStyles }} />

          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md relative receipt-print max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 print:hidden"
                  onClick={() => setShowBill(false)}
                >
                  &times;
                </button>

                {/* Pharmacy Header */}
                <div className="text-center mb-6 border-b-2 border-blue-600 pb-4">
                  {/* Logo */}
                  <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center">
                    <img
                      src="/invoice_logo.jpg"
                      alt="Drugwell Pharmacy Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h1 className="text-2xl font-bold text-blue-800 mb-1">
                    DRUGWELL PHARMACY
                  </h1>
                  <p className="text-sm text-gray-600 font-medium">
                    Your Health, Our Priority
                  </p>
                  <div className="text-xs text-gray-500 mt-1 font-semibold">
                    {lastTransaction.branchName || "Main Branch"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {lastTransaction.branchAddress ||
                      "Professional Healthcare Services"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    📞 Contact:{" "}
                    {lastTransaction.managerContact || "+1 (555) 123-4567"} | 📧
                    info@drugwell.com
                  </div>
                </div>

                {/* Transaction Info */}
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-gray-600">
                        Date:{" "}
                        {new Date(lastTransaction.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Time:{" "}
                        {new Date(lastTransaction.date).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="bg-blue-100 px-3 py-1 rounded-full">
                        <span className="text-xs font-medium text-blue-800">
                          Receipt #
                          {lastTransaction.transactionId?.slice(-8) || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-2 font-semibold text-gray-700">
                          Product
                        </th>
                        <th className="text-right py-2 font-semibold text-gray-700">
                          Price
                        </th>
                        <th className="text-right py-2 font-semibold text-gray-700">
                          Qty
                        </th>
                        <th className="text-right py-2 font-semibold text-gray-700">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastTransaction.items.map((item: any, index: number) => {
                        const currentPrice = item.isUnitPurchase && item.unitPrice ? item.unitPrice : item.price;
                        const priceLabel = item.isUnitPurchase ? " (per unit)" : " (per pack)";
                        
                        return (
                          <tr
                            key={item._id || index}
                            className="border-b border-gray-100"
                          >
                            <td className="py-2 text-gray-800">
                              <div className="font-medium">{item.name}</div>
                              {item.isUnitPurchase && (
                                <div className="text-xs text-blue-600 font-medium">
                                  Unit Purchase
                                </div>
                              )}
                              {item.unitsSold && item.packsSold && (
                                <div className="text-xs text-gray-500">
                                  {item.isUnitPurchase ? (
                                    <span>Units: {item.unitsSold} | Packs: {item.packsSold}</span>
                                  ) : (
                                    <span>Packs: {item.packsSold} | Units: {item.unitsSold}</span>
                                  )}
                                </div>
                              )}
                              {item.composition && (
                                <div className="text-xs text-gray-500">
                                  {item.composition}
                                </div>
                              )}
                            </td>
                            <td className="text-right py-2 text-gray-700">
                              ${currentPrice.toFixed(2)}{priceLabel}
                            </td>
                            <td className="text-right py-2 text-gray-700">
                              {item.quantity}
                            </td>
                            <td className="text-right py-2 font-medium text-gray-800">
                              ${(currentPrice * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Total Section */}
                <div className="border-t-2 border-gray-300 pt-3 mb-4">
                  <div className="flex justify-between items-center text-lg font-bold text-gray-800 mb-2">
                    <span>Total Amount:</span>
                    <span className="text-2xl text-blue-600">
                      ${lastTransaction.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    Payment Method:{" "}
                    <span className="font-semibold text-gray-800">
                      {lastTransaction.paymentMethod?.toUpperCase() || "CASH"}
                    </span>
                  </div>
                  {lastTransaction.additionalNote && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <span className="font-medium">Note:</span>{" "}
                      {lastTransaction.additionalNote}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="text-center border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-600 mb-3">
                    <p className="font-semibold text-blue-800">
                      Thank you for choosing Drugwell Pharmacy!
                    </p>
                    <p className="mt-1">
                      We appreciate your trust in our healthcare services
                    </p>
                    <p className="mt-1">
                      For any queries, please contact our customer service
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Cashier: {lastTransaction.cashierName || "Staff"}</p>
                    <p>Branch: {lastTransaction.branchName || "Main Branch"}</p>
                    <p>
                      Transaction ID: {lastTransaction.transactionId || "N/A"}
                    </p>
                    <p className="mt-3 text-gray-400">
                      This is a computer generated receipt
                    </p>
                    <p className="text-gray-400">
                      Valid for returns/exchanges within 30 days
                    </p>
                  </div>
                </div>

                {/* Print Button */}
                <div className="text-center mt-6 print-hidden">
                  <button
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
                    onClick={() => {
                      window.print();
                      setShowBill(false);
                    }}
                  >
                    🖨️ Print Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Purchase Type Selection Modal */}
      {showPurchaseTypeModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Purchase Type
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                How would you like to purchase <strong>{selectedProduct.name}</strong>?
                {!selectedProduct.unitPrice || selectedProduct.unitPrice === 0 ? (
                  <span className="block text-xs text-gray-500 mt-1">
                    (This product is only available as a full pack)
                  </span>
                ) : null}
              </p>
              
              <div className="space-y-4">
                {/* Full Pack Option */}
                <button
                  onClick={() => {
                    addToCartDirect(selectedProduct, false, 1);
                    setShowPurchaseTypeModal(false);
                    setSelectedProduct(null);
                  }}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Full Pack</div>
                      <div className="text-sm text-gray-600">
                        ${selectedProduct.price.toFixed(2)} per pack
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedProduct.stock} packs available
                        {selectedProduct.unitsPerPack && selectedProduct.unitsPerPack > 1 && (
                          <span className="block text-gray-400">
                            ({selectedProduct.unitsPerPack} {selectedProduct.units || 'units'} per pack)
                          </span>
                        )}
                        {selectedProduct.shelfStock !== undefined && selectedProduct.shelfStock > 0 && (
                          <span className="block text-blue-600">
                            {selectedProduct.shelfStock} on shelf
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-2xl">📦</div>
                  </div>
                </button>

                {/* Unit Purchase Option - Only show if product has unitPrice */}
                {selectedProduct.unitPrice && selectedProduct.unitPrice > 0 && (
                  <button
                    onClick={() => {
                      setUnitQuantity(1);
                      setShowPurchaseTypeModal(false);
                      setShowUnitQuantityModal(true);
                    }}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Individual Units</div>
                        <div className="text-sm text-gray-600">
                          ${selectedProduct.unitPrice.toFixed(2)} per unit
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedProduct.shelfStock !== undefined ? selectedProduct.shelfStock : selectedProduct.stock} units available
                          {selectedProduct.shelfStock !== undefined && selectedProduct.shelfStock !== selectedProduct.stock && (
                            <span className="block text-gray-400">
                              (Total stock: {selectedProduct.stock})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-2xl">💊</div>
                    </div>
                  </button>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowPurchaseTypeModal(false);
                    setSelectedProduct(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unit Quantity Selection Modal */}
      {showUnitQuantityModal && selectedProduct && selectedProduct.unitPrice && selectedProduct.unitPrice > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add Units to Cart
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                How many units of <strong>{selectedProduct.name}</strong> do you want to add?
              </p>
              
              <div className="mb-6">
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unit Price:</span>
                    <span className="font-semibold text-green-600">
                      ${selectedProduct.unitPrice?.toFixed(2) || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">Available Stock:</span>
                    <span className="font-semibold text-blue-600">
                      {selectedProduct.shelfStock !== undefined ? selectedProduct.shelfStock : selectedProduct.stock} units
                      {selectedProduct.shelfStock !== undefined && selectedProduct.shelfStock !== selectedProduct.stock && (
                        <span className="text-xs text-gray-500 ml-1">
                          (Shelf)
                        </span>
                      )}
                    </span>
                  </div>
                  {selectedProduct.unitsPerPack && selectedProduct.unitsPerPack > 1 && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-500">Units per Pack:</span>
                      <span className="text-sm text-gray-500">
                        {selectedProduct.unitsPerPack} {selectedProduct.units || 'units'}
                      </span>
                    </div>
                  )}
                  {selectedProduct.shelfStock !== undefined && selectedProduct.shelfStock !== selectedProduct.stock && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-500">Total Stock:</span>
                      <span className="text-sm text-gray-500">
                        {selectedProduct.stock} units
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => setUnitQuantity(Math.max(1, unitQuantity - 1))}
                    className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    disabled={unitQuantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct.shelfStock !== undefined ? selectedProduct.shelfStock : selectedProduct.stock}
                    value={unitQuantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      const maxStock = selectedProduct.shelfStock !== undefined ? selectedProduct.shelfStock : selectedProduct.stock;
                      setUnitQuantity(Math.max(1, Math.min(maxStock, value)));
                    }}
                    className="w-20 text-center text-lg font-semibold border border-gray-300 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <button
                    onClick={() => {
                      const maxStock = selectedProduct.shelfStock !== undefined ? selectedProduct.shelfStock : selectedProduct.stock;
                      setUnitQuantity(Math.min(maxStock, unitQuantity + 1));
                    }}
                    className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    disabled={unitQuantity >= (selectedProduct.shelfStock !== undefined ? selectedProduct.shelfStock : selectedProduct.stock)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="text-center mt-4">
                  <div className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-lg text-green-600">
                      ${((selectedProduct.unitPrice || 0) * unitQuantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUnitQuantityModal(false);
                    setSelectedProduct(null);
                    setUnitQuantity(1);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    addToCartDirect(selectedProduct, true, unitQuantity);
                    setShowUnitQuantityModal(false);
                    setSelectedProduct(null);
                    setUnitQuantity(1);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
