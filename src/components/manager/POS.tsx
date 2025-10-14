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
  const [cumulativeUnitsSold, setCumulativeUnitsSold] = useState<{
    [productId: string]: number;
  }>({});

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

  // Helper function to calculate total units sold for a product (from all transactions)
  const getTotalUnitsSold = (productId: string) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return 0;

    // Get previously sold units from persistent state
    const previouslySoldUnits = cumulativeUnitsSold[productId] || 0;

    // Calculate total units from current cart items for this product (unit purchases only)
    let currentCartUnits = 0;
    cart.forEach((item) => {
      if (item._id === productId && item.isUnitPurchase) {
        currentCartUnits += item.quantity;
      }
    });

    return previouslySoldUnits + currentCartUnits;
  };

  // Helper function to calculate remaining stock after unit sales
  const calculateRemainingStock = (productId: string) => {
    const product = products.find((p) => p._id === productId);
    if (!product)
      return {
        totalUnits: 0,
        shelfUnits: 0,
        completePacks: 0,
        remainingUnits: 0,
      };

    const unitsPerPack = product.unitsPerPack || 1;
    const totalUnitsSold = getTotalUnitsSold(productId);

    // Calculate remaining units after all unit sales
    const remainingTotalUnits = Math.max(
      0,
      product.stock * unitsPerPack - totalUnitsSold
    );
    const completePacks = Math.floor(remainingTotalUnits / unitsPerPack);
    const remainingUnits = remainingTotalUnits % unitsPerPack;

    // Calculate remaining shelf units
    // After fetchProducts(), product.shelfStock should already be updated
    // So we don't need to subtract totalUnitsSold again
    const shelfUnits =
      product.shelfStock !== undefined
        ? Math.max(0, product.shelfStock)
        : remainingTotalUnits;

    return {
      totalUnits: remainingTotalUnits,
      shelfUnits: shelfUnits,
      completePacks: completePacks,
      remainingUnits: remainingUnits,
    };
  };

  // Helper function to calculate units and packs for a cart item
  const calculateUnitsAndPacks = (item: CartItem) => {
    const unitsPerPack = item.unitsPerPack || 1;
    let unitsSold = 0;
    let packsSold = 0;

    if (item.isUnitPurchase) {
      // For unit purchases, show the current item's units
      unitsSold = item.quantity;
      // Packs sold is calculated from total cumulative units sold
      const totalUnitsSold = getTotalUnitsSold(item._id);
      packsSold = Math.floor(totalUnitsSold / unitsPerPack);
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

    cart.forEach((item) => {
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
      // Check if user has a valid branchId
      if (!user?.branchId) {
        setError("No branch assigned. Please contact administrator.");
        setProducts([]);
        return;
      }

      // Use authenticated API endpoint
      const data = await apiEndpoints.getInventory(user.branchId);

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

  const addToCartDirect = (
    product: Product,
    isUnitPurchase: boolean,
    quantity: number = 1
  ) => {
    const existingItem = cart.find(
      (item) =>
        item._id === product._id && item.isUnitPurchase === isUnitPurchase
    );

    if (isUnitPurchase) {
      // For unit purchases, check against available shelf units
      const availableUnits =
        product.shelfStock !== undefined
          ? product.shelfStock
          : product.stock * (product.unitsPerPack || 1);

      const totalUnitsSold = getTotalUnitsSold(product._id);
      const remainingUnits = availableUnits;

      console.log("remainingUnits", remainingUnits);
      console.log("totalUnitsSold", totalUnitsSold);
      console.log("availableUnits", availableUnits);

      if (quantity > remainingUnits) {
        Swal.fire({
          title: "Insufficient Stock",
          text: `Cannot add ${quantity} units. Only ${remainingUnits} units available on shelf.`,
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }
    } else {
      // For pack purchases, check available complete packs
      const remainingStock = calculateRemainingStock(product._id);
      if (quantity > remainingStock.completePacks) {
        Swal.fire({
          title: "Insufficient Stock",
          text: `Cannot add ${quantity} packs. Only ${remainingStock.completePacks} complete packs available.`,
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }
    }

    if (existingItem) {
      const updatedItem = {
        ...existingItem,
        quantity: existingItem.quantity + quantity,
      };
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
      const newItem: CartItem = {
        ...product,
        quantity: quantity,
        isUnitPurchase,
      };
      const { unitsSold, packsSold } = calculateUnitsAndPacks(newItem);
      newItem.unitsSold = unitsSold;
      newItem.packsSold = packsSold;

      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (
    _id: string,
    quantity: number,
    isUnitPurchase?: boolean
  ) => {
    if (quantity === 0) {
      setCart(
        cart.filter(
          (item) =>
            !(item._id === _id && item.isUnitPurchase === isUnitPurchase)
        )
      );
    } else {
      const product = products.find((p) => p._id === _id);
      if (product) {
        if (isUnitPurchase) {
          // For unit purchases, check against available shelf units
          const availableUnits =
            product.shelfStock !== undefined
              ? product.shelfStock
              : product.stock * (product.unitsPerPack || 1);

          const totalUnitsSold = getTotalUnitsSold(_id);
          const remainingUnits = availableUnits - totalUnitsSold;

          console.log("remainingUnits", remainingUnits);
          console.log("totalUnitsSold", totalUnitsSold);
          console.log("availableUnits", availableUnits);
          console.log("quantity", quantity);

          if (quantity > remainingUnits) {
            Swal.fire({
              title: "Stock Limit Exceeded",
              text: `Cannot set quantity to ${quantity}. Only ${remainingUnits} units available on shelf.`,
              icon: "warning",
              confirmButtonText: "OK",
            });
            return;
          }
        } else {
          // For pack purchases, check available complete packs
          const remainingStock = calculateRemainingStock(_id);
          if (quantity > remainingStock.completePacks) {
            Swal.fire({
              title: "Stock Limit Exceeded",
              text: `Cannot set quantity to ${quantity}. Only ${remainingStock.completePacks} complete packs available.`,
              icon: "warning",
              confirmButtonText: "OK",
            });
            return;
          }
        }

        setCart(
          cart.map((item) => {
            if (item._id === _id && item.isUnitPurchase === isUnitPurchase) {
              const updatedItem = { ...item, quantity };
              const { unitsSold, packsSold } =
                calculateUnitsAndPacks(updatedItem);
              updatedItem.unitsSold = unitsSold;
              updatedItem.packsSold = packsSold;
              return updatedItem;
            }
            return item;
          })
        );
      }
    }
  };

  const removeFromCart = (_id: string, isUnitPurchase?: boolean) => {
    setCart(
      cart.filter(
        (item) => !(item._id === _id && item.isUnitPurchase === isUnitPurchase)
      )
    );
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => {
      const price =
        item.isUnitPurchase && item.unitPrice ? item.unitPrice : item.price;
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
        ? item.shelfStock !== undefined
          ? item.shelfStock
          : item.stock
        : item.stock;

      if (item.quantity > availableStock) {
        Swal.fire({
          title: "Stock Validation Failed",
          text: `Cannot complete transaction: ${item.name} quantity (${
            item.quantity
          }) exceeds available ${
            item.isUnitPurchase ? "shelf" : "total"
          } stock (${availableStock})`,
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
          price:
            item.isUnitPurchase && item.unitPrice ? item.unitPrice : item.price,
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
      // DON'T clear cumulative units tracking - keep it across transactions
      // setCumulativeUnitsSold({});
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
      // Group cart items by product to handle cumulative unit tracking
      const productGroups: {
        [productId: string]: { unitItems: CartItem[]; packItems: CartItem[] };
      } = {};

      cart.forEach((item) => {
        if (!productGroups[item._id]) {
          productGroups[item._id] = { unitItems: [], packItems: [] };
        }
        if (item.isUnitPurchase) {
          productGroups[item._id].unitItems.push(item);
        } else {
          productGroups[item._id].packItems.push(item);
        }
      });

      // Process each product group
      for (const [productId, group] of Object.entries(productGroups)) {
        const product = products.find((p) => p._id === productId);
        if (!product) continue;

        const unitsPerPack = product.unitsPerPack || 1;

        // Calculate total units sold from unit items in this transaction
        let currentTransactionUnits = 0;
        group.unitItems.forEach((item) => {
          currentTransactionUnits += item.quantity;
        });

        // Calculate total packs sold from pack items in this transaction
        let currentTransactionPacks = 0;
        group.packItems.forEach((item) => {
          currentTransactionPacks += item.quantity;
        });

        // Get previously sold units from persistent state
        const previouslySoldUnits = cumulativeUnitsSold[productId] || 0;
        const newTotalUnitsSold = previouslySoldUnits + currentTransactionUnits;

        // Calculate how many complete packs are now sold due to unit sales
        const newCompletePacksFromUnits = Math.floor(
          newTotalUnitsSold / unitsPerPack
        );
        const previousCompletePacksFromUnits = Math.floor(
          previouslySoldUnits / unitsPerPack
        );
        const additionalCompletePacksFromUnits =
          newCompletePacksFromUnits - previousCompletePacksFromUnits;

        // Total packs to deduct from stock
        const totalPacksToDeduct =
          currentTransactionPacks + additionalCompletePacksFromUnits;

        // Calculate new stock values
        const newStock = Math.max(0, product.stock - totalPacksToDeduct);
        let newShelfStock = product.shelfStock;

        if (product.shelfStock !== undefined) {
          // For shelf stock: deduct unit sales directly
          newShelfStock = Math.max(
            0,
            product.shelfStock - currentTransactionUnits
          );

          // For pack sales: we don't deduct from shelf stock because packs are taken from warehouse
          // The shelf stock remains as is (minus any unit sales)
        }

        // Debug logging
        console.log(`Product: ${product.name}`);
        console.log(`Previously sold units: ${previouslySoldUnits}`);
        console.log(`Current transaction units: ${currentTransactionUnits}`);
        console.log(`Current transaction packs: ${currentTransactionPacks}`);
        console.log(`New total units sold: ${newTotalUnitsSold}`);
        console.log(
          `Additional complete packs from units: ${additionalCompletePacksFromUnits}`
        );
        console.log(`Total packs to deduct: ${totalPacksToDeduct}`);
        console.log(
          `New stock: ${newStock}, New shelf stock: ${newShelfStock}`
        );

        try {
          // Prepare update data
          const updateData: any = { stock: newStock };
          if (product.shelfStock !== undefined) {
            updateData.shelfStock = newShelfStock;
          }

          await apiEndpoints.updateInventory(productId, updateData);
        } catch (error) {
          console.error(
            `Failed to update stock for product ${product.name}:`,
            error
          );
        }
      }

      // Update cumulative units sold state
      const newCumulativeUnits = { ...cumulativeUnitsSold };
      Object.keys(productGroups).forEach((productId) => {
        const group = productGroups[productId];
        let currentTransactionUnits = 0;
        group.unitItems.forEach((item) => {
          currentTransactionUnits += item.quantity;
        });
        newCumulativeUnits[productId] =
          (newCumulativeUnits[productId] || 0) + currentTransactionUnits;
      });
      setCumulativeUnitsSold(newCumulativeUnits);

      // Refresh products from API to get updated stock values
      await fetchProducts();
    } catch (error) {
      console.error("Error updating stock quantities:", error);
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
          <button
            onClick={() => {
              setCumulativeUnitsSold({});
              console.log("Cumulative units reset");
            }}
            className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
          >
            Reset Cumulative Units
          </button>
          <button
            onClick={() => {
              // Test scenario: 5 packs, 5 units each = 25 total, 10 on shelf
              console.log("=== TEST SCENARIO ===");
              console.log(
                "Initial: 5 packs (25 units total), 10 units on shelf"
              );
              console.log("After selling 1 unit:");
              console.log("- 9 units on shelf (10 - 1)");
              console.log("- 24 total units (25 - 1)");
              console.log("- 4 complete packs (24 ÷ 5 = 4 with remainder 4)");
              console.log("- 4 remaining units (24 % 5 = 4)");

              // Test the calculation functions
              const testProduct = {
                _id: "test",
                stock: 5,
                shelfStock: 10,
                unitsPerPack: 5,
              };

              // Simulate selling 1 unit
              const totalUnitsSold = 1;
              const remainingTotalUnits =
                testProduct.stock * testProduct.unitsPerPack - totalUnitsSold;
              const completePacks = Math.floor(
                remainingTotalUnits / testProduct.unitsPerPack
              );
              const remainingUnits =
                remainingTotalUnits % testProduct.unitsPerPack;
              const shelfUnits = Math.max(
                0,
                testProduct.shelfStock - totalUnitsSold
              );

              console.log("Calculated results:");
              console.log(`- Total units remaining: ${remainingTotalUnits}`);
              console.log(`- Complete packs: ${completePacks}`);
              console.log(`- Remaining units: ${remainingUnits}`);
              console.log(`- Shelf units: ${shelfUnits}`);
            }}
            className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
          >
            Test Logic
          </button>
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
                {
                  products.filter((p) => {
                    const remaining = calculateRemainingStock(p._id);
                    return remaining.totalUnits > (p.minStock || 5);
                  }).length
                }
              </div>
              <div className="text-sm text-gray-600">In Stock</div>
              <div className="text-xs text-gray-500">
                {
                  products.filter((p) => {
                    const remaining = calculateRemainingStock(p._id);
                    return (
                      p.shelfStock !== undefined && remaining.shelfUnits > 0
                    );
                  }).length
                }{" "}
                on shelf
              </div>
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
                  products.filter((p) => {
                    const remaining = calculateRemainingStock(p._id);
                    return (
                      remaining.totalUnits > 0 &&
                      remaining.totalUnits <= (p.minStock || 5)
                    );
                  }).length
                }
              </div>
              <div className="text-sm text-gray-600">Low Stock</div>
              <div className="text-xs text-gray-500">
                {
                  products.filter((p) => {
                    const remaining = calculateRemainingStock(p._id);
                    return (
                      p.shelfStock !== undefined &&
                      remaining.shelfUnits > 0 &&
                      remaining.shelfUnits <= (p.minStock || 5)
                    );
                  }).length
                }{" "}
                shelf low
              </div>
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
                {
                  products.filter((p) => {
                    const remaining = calculateRemainingStock(p._id);
                    return remaining.totalUnits === 0;
                  }).length
                }
              </div>
              <div className="text-sm text-gray-600">Out of Stock</div>
              <div className="text-xs text-gray-500">
                {
                  products.filter((p) => {
                    const remaining = calculateRemainingStock(p._id);
                    return (
                      p.shelfStock !== undefined && remaining.shelfUnits === 0
                    );
                  }).length
                }{" "}
                shelf empty
              </div>
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
                    const remainingStock = calculateRemainingStock(product._id);
                    const isOutOfStock = remainingStock.totalUnits === 0;
                    return (
                      <div
                        key={product._id}
                        className={
                          "border border-gray-200 rounded-lg p-4 transition-shadow " +
                          (isExpired ? "bg-red-100 " : "") +
                          (remainingStock.totalUnits === 0
                            ? "bg-gray-100 "
                            : "") +
                          (remainingStock.totalUnits > 0 &&
                          remainingStock.totalUnits <= (product.minStock || 5)
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
                              #{product.price}
                            </span>
                            {product.unitPrice && product.unitPrice > 0 && (
                              <span className="text-xs text-green-600 font-medium">
                                #{product.unitPrice} per unit
                              </span>
                            )}
                            {product.unitsPerPack &&
                              product.unitsPerPack > 1 && (
                                <span className="text-xs text-gray-500">
                                  ({product.unitsPerPack} per pack)
                                </span>
                              )}
                          </div>
                          <div className="text-right">
                            <div className="flex flex-col items-end space-y-1">
                              {(() => {
                                const remainingStock = calculateRemainingStock(
                                  product._id
                                );
                                return (
                                  <>
                                    <span
                                      className={
                                        "text-xs font-semibold " +
                                        (remainingStock.totalUnits === 0
                                          ? "text-red-600"
                                          : remainingStock.totalUnits <=
                                            (product.minStock || 5)
                                          ? "text-yellow-600"
                                          : "text-green-600")
                                      }
                                    >
                                      {remainingStock.totalUnits} total units
                                    </span>
                                    <span
                                      className={
                                        "text-xs font-medium " +
                                        (remainingStock.completePacks === 0
                                          ? "text-red-500"
                                          : remainingStock.completePacks <=
                                            (product.minStock || 5)
                                          ? "text-yellow-500"
                                          : "text-green-500")
                                      }
                                    >
                                      {remainingStock.completePacks} complete
                                      packs
                                    </span>
                                    {product.shelfStock !== undefined && (
                                      <span
                                        className={
                                          "text-xs font-medium " +
                                          (remainingStock.shelfUnits === 0
                                            ? "text-red-500"
                                            : remainingStock.shelfUnits <=
                                              (product.minStock || 5)
                                            ? "text-yellow-500"
                                            : "text-blue-600")
                                        }
                                      >
                                        {remainingStock.shelfUnits} on shelf
                                      </span>
                                    )}
                                    {remainingStock.remainingUnits > 0 && (
                                      <span className="text-xs text-orange-600 font-medium">
                                        {remainingStock.remainingUnits} partial
                                        pack
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                        {expiryDisplay}
                        {remainingStock.totalUnits > 0 &&
                          remainingStock.totalUnits <=
                            (product.minStock || 5) && (
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
                  const currentPrice =
                    item.isUnitPurchase && item.unitPrice
                      ? item.unitPrice
                      : item.price;
                  const priceLabel = item.isUnitPurchase
                    ? "per unit"
                    : "per pack";

                  return (
                    <div
                      key={`${item._id}-${
                        item.isUnitPurchase ? "unit" : "pack"
                      }-${index}`}
                      className="flex items-center justify-between border-b border-gray-100 pb-3"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          #{currentPrice.toFixed(2)} {priceLabel}
                        </p>
                        {item.isUnitPurchase && (
                          <p className="text-xs text-blue-600 font-medium">
                            Unit Purchase
                          </p>
                        )}
                        <div className="text-xs text-gray-400 space-y-1">
                          {(() => {
                            const remainingStock = calculateRemainingStock(
                              item._id
                            );
                            return (
                              <>
                                <div>
                                  Total Stock: {remainingStock.totalUnits} units
                                  remaining
                                </div>
                                <div>
                                  Complete Packs: {remainingStock.completePacks}{" "}
                                  remaining
                                </div>
                                {item.shelfStock !== undefined && (
                                  <div className="text-blue-600">
                                    Shelf Stock: {remainingStock.shelfUnits}{" "}
                                    units remaining
                                  </div>
                                )}
                                {remainingStock.remainingUnits > 0 && (
                                  <div className="text-orange-600 font-medium">
                                    Partial Pack:{" "}
                                    {remainingStock.remainingUnits} units
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        {/* Show units and packs breakdown */}
                        <div className="text-xs text-gray-500 mt-1">
                          {item.isUnitPurchase ? (
                            <div>
                              <div>
                                Current Units: {item.unitsSold || 0} | Total
                                Packs Sold: {item.packsSold || 0}
                              </div>
                            </div>
                          ) : (
                            <span>
                              Packs: {item.packsSold || 0} | Units:{" "}
                              {item.unitsSold || 0}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item._id,
                              item.quantity - 1,
                              item.isUnitPurchase
                            )
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
                            updateQuantity(
                              item._id,
                              item.quantity + 1,
                              item.isUnitPurchase
                            )
                          }
                          className="p-1 rounded-full hover:bg-gray-100"
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() =>
                            removeFromCart(item._id, item.isUnitPurchase)
                          }
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
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Sale Summary:
                  </div>
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
                    #{getTotalAmount().toFixed(2)}
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
                        const currentPrice =
                          item.isUnitPurchase && item.unitPrice
                            ? item.unitPrice
                            : item.price;
                        const priceLabel = item.isUnitPurchase
                          ? " (per unit)"
                          : " (per pack)";

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
                                    <span>
                                      Units: {item.unitsSold} | Packs:{" "}
                                      {item.packsSold}
                                    </span>
                                  ) : (
                                    <span>
                                      Packs: {item.packsSold} | Units:{" "}
                                      {item.unitsSold}
                                    </span>
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
                              #{currentPrice.toFixed(2)}
                              {priceLabel}
                            </td>
                            <td className="text-right py-2 text-gray-700">
                              {item.quantity}
                            </td>
                            <td className="text-right py-2 font-medium text-gray-800">
                              #{(currentPrice * item.quantity).toFixed(2)}
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
                      #{lastTransaction.total.toFixed(2)}
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
                How would you like to purchase{" "}
                <strong>{selectedProduct.name}</strong>?
                {!selectedProduct.unitPrice ||
                selectedProduct.unitPrice === 0 ? (
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
                        #{selectedProduct.price.toFixed(2)} per pack
                      </div>
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const remaining = calculateRemainingStock(
                            selectedProduct._id
                          );
                          return remaining.completePacks;
                        })()}{" "}
                        packs available
                        {selectedProduct.unitsPerPack &&
                          selectedProduct.unitsPerPack > 1 && (
                            <span className="block text-gray-400">
                              ({selectedProduct.unitsPerPack} per pack)
                            </span>
                          )}
                        {selectedProduct.shelfStock !== undefined &&
                          (() => {
                            const remaining = calculateRemainingStock(
                              selectedProduct._id
                            );
                            return (
                              remaining.shelfUnits > 0 && (
                                <span className="block text-blue-600">
                                  {remaining.shelfUnits} on shelf
                                </span>
                              )
                            );
                          })()}
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
                        <div className="font-medium text-gray-900">
                          Individual Units
                        </div>
                        <div className="text-sm text-gray-600">
                          #{selectedProduct.unitPrice.toFixed(2)} per unit
                        </div>
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const remaining = calculateRemainingStock(
                              selectedProduct._id
                            );
                            return remaining.shelfUnits;
                          })()}{" "}
                          units available
                          {selectedProduct.shelfStock !== undefined &&
                            (() => {
                              const remaining = calculateRemainingStock(
                                selectedProduct._id
                              );
                              return (
                                remaining.totalUnits !==
                                  remaining.shelfUnits && (
                                  <span className="block text-gray-400">
                                    (Total stock: {remaining.totalUnits})
                                  </span>
                                )
                              );
                            })()}
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
      {showUnitQuantityModal &&
        selectedProduct &&
        selectedProduct.unitPrice &&
        selectedProduct.unitPrice > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Add Units to Cart
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  How many units of <strong>{selectedProduct.name}</strong> do
                  you want to add?
                </p>

                <div className="mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Unit Price:</span>
                      <span className="font-semibold text-green-600">
                        #{selectedProduct.unitPrice?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-600">
                        Available Stock:
                      </span>
                      <span className="font-semibold text-blue-600">
                        {(() => {
                          const remaining = calculateRemainingStock(
                            selectedProduct._id
                          );
                          return remaining.shelfUnits;
                        })()}{" "}
                        units
                        {selectedProduct.shelfStock !== undefined && (
                          <span className="text-xs text-gray-500 ml-1">
                            (Shelf)
                          </span>
                        )}
                      </span>
                    </div>
                    {selectedProduct.unitsPerPack &&
                      selectedProduct.unitsPerPack > 1 && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-gray-500">
                            Units per Pack:
                          </span>
                          <span className="text-sm text-gray-500">
                            {selectedProduct.unitsPerPack}{" "}
                          </span>
                        </div>
                      )}
                    {selectedProduct.shelfStock !== undefined &&
                      selectedProduct.shelfStock !== selectedProduct.stock && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-gray-500">
                            Total Stock:
                          </span>
                          <span className="text-sm text-gray-500">
                            {selectedProduct.stock} units
                          </span>
                        </div>
                      )}
                  </div>

                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={() =>
                        setUnitQuantity(Math.max(1, unitQuantity - 1))
                      }
                      className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                      disabled={unitQuantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <input
                      type="number"
                      min="1"
                      max={(() => {
                        const remaining = calculateRemainingStock(
                          selectedProduct._id
                        );
                        return remaining.shelfUnits;
                      })()}
                      value={unitQuantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        const remaining = calculateRemainingStock(
                          selectedProduct._id
                        );
                        const maxStock = remaining.shelfUnits;
                        setUnitQuantity(Math.max(1, Math.min(maxStock, value)));
                      }}
                      className="w-20 text-center text-lg font-semibold border border-gray-300 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <button
                      onClick={() => {
                        const remaining = calculateRemainingStock(
                          selectedProduct._id
                        );
                        const maxStock = remaining.shelfUnits;
                        setUnitQuantity(Math.min(maxStock, unitQuantity + 1));
                      }}
                      className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                      disabled={
                        unitQuantity >=
                        (() => {
                          const remaining = calculateRemainingStock(
                            selectedProduct._id
                          );
                          return remaining.shelfUnits;
                        })()
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="text-center mt-4">
                    <div className="text-sm text-gray-600">
                      Total:{" "}
                      <span className="font-semibold text-lg text-green-600">
                        #
                        {(
                          (selectedProduct.unitPrice || 0) * unitQuantity
                        ).toFixed(2)}
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
