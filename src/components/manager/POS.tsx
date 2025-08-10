import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, ShoppingCart, Trash2, CreditCard, DollarSign } from 'lucide-react';

interface Product {
  _id: string;
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  minStock?: number;
  status?: 'In Stock' | 'Low Stock' | 'Out of Stock';
  expiryDate?: string;
}

interface CartItem extends Product {
  quantity: number;
}

const POS: React.FC = () => {

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBill, setShowBill] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [cashierName, setCashierName] = useState(() => localStorage.getItem('cashierName') || '');

  // Helper to add status to a product (copied from InventoryManagement)
  const addStatus = (product: any) => {
    let status: 'In Stock' | 'Low Stock' | 'Out of Stock';
    if (product.stock === 0) status = 'Out of Stock';
    else if (product.minStock !== undefined && product.stock <= product.minStock) status = 'Low Stock';
    else status = 'In Stock';
    return { ...product, status, id: product._id || product.id };
  };

  // Fetch products from API (same as InventoryManagement)
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const BASE_URL = 'http://localhost:5000/api';
      const res = await fetch(`${BASE_URL}/inventory`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      const productsWithStatus = data.map(addStatus);
      setProducts(productsWithStatus);
    } catch (err: any) {
      setError(err.message || 'Error fetching products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item._id === product._id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item =>
          (item._id === product._id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (_id: string, quantity: number) => {
    if (quantity === 0) {
      setCart(cart.filter(item => item._id !== _id));
    } else {
      const product = products.find(p => p._id === _id);
      if (product && quantity <= product.stock) {
        setCart(cart.map(item =>
          item._id === _id ? { ...item, quantity } : item
        ));
      }
    }
  };

  const removeFromCart = (_id: string) => {
    setCart(cart.filter(item => item._id !== _id));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // Persist cashier name
  useEffect(() => {
    localStorage.setItem('cashierName', cashierName);
  }, [cashierName]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    // Branch and company info (replace with real data as needed)
    const COMPANY_NAME = 'Ahlyab Pharmacy Chain';
    const BRANCH_ADDRESS = '123 Main Street, City, Country';
    const MANAGER_CONTACT = '+1 234-567-8901';
    const ADDITIONAL_NOTE = 'Thank you for shopping with us! No returns after 7 days.';

    // Map cart items to match backend schema
    const transaction = {
      transactionId: `TXN${Date.now()}`,
      items: cart.map(item => ({
        productId: item._id,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: getTotalAmount(),
      customerName: customerName.trim() ? customerName : undefined,
      cashierName: cashierName.trim() ? cashierName : undefined,
      date: new Date(),
    };

    try {
      // Send transaction to backend
      const BASE_URL = 'http://localhost:5000/api';
      const response = await fetch(`${BASE_URL}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      if (!response.ok) {
        throw new Error('Failed to save transaction');
      }
      // Show bill using the original transaction object (with all display info)
      setLastTransaction({
        customer: customerName.trim() ? customerName : COMPANY_NAME,
        items: cart,
        total: getTotalAmount(),
        paymentMethod,
        date: new Date().toLocaleString(),
        branchAddress: BRANCH_ADDRESS,
        managerContact: MANAGER_CONTACT,
        additionalNote: ADDITIONAL_NOTE,
        cashierName: cashierName.trim() ? cashierName : 'N/A',
      });
      setShowBill(true);
      // Clear cart and reset form
      setCart([]);
      setCustomerName('');
      setPaymentMethod('cash');
      // Refresh products in case stock changed
      fetchProducts();
    } catch (err: any) {
      alert('Error completing transaction: ' + (err.message || err));
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Cashier Name</label>
          <input
            type="text"
            value={cashierName}
            onChange={e => setCashierName(e.target.value)}
            placeholder="Enter cashier name"
            className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-400 mt-1">This will remain until changed or cleared.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
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

            {loading ? (
              <div className="text-center text-gray-500 py-8">Loading products...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">{error}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => {
                  // Expiry and stock logic
                  let isExpired = false;
                  let expiryDisplay = null;
                  if (product.expiryDate) {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const expiry = new Date(product.expiryDate);
                    expiry.setHours(0,0,0,0);
                    isExpired = expiry.getTime() < today.getTime();
                    expiryDisplay = (
                      <span className={
                        'text-xs font-semibold ' + (isExpired ? 'text-red-600' : 'text-gray-500')
                      }>
                        Expiry: {expiry.toLocaleDateString()}
                      </span>
                    );
                  }
                  const isOutOfStock = product.stock === 0;
                  return (
                    <div
                      key={product._id}
                      className={
                        'border border-gray-200 rounded-lg p-4 transition-shadow ' +
                        (isExpired ? 'bg-red-100 ' : '') +
                        (!isOutOfStock && !isExpired ? 'hover:shadow-md cursor-pointer' : 'opacity-60 cursor-not-allowed')
                      }
                      onClick={() => {
                        if (!isOutOfStock && !isExpired) addToCart(product);
                      }}
                    >
                      <h3 className="font-medium text-gray-900 text-sm mb-1">{product.name}</h3>
                      <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-lg font-bold text-blue-600">${product.price}</span>
                        <span className={
                          'text-xs ' + (isOutOfStock ? 'text-red-600 font-semibold' : 'text-gray-500')
                        }>
                          {product.stock} in stock
                        </span>
                      </div>
                      {expiryDisplay}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Cart</h3>
              <div className="flex items-center">
                <ShoppingCart className="h-5 w-5 text-gray-400 mr-1" />
                <span className="text-sm text-gray-600">{getTotalItems()} items</span>
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Cart is empty</p>
              ) : (
                cart.map((item) => (
                  <div key={item._id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                      <p className="text-xs text-gray-500">${item.price} each</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="p-1 rounded-full hover:bg-red-100 text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-blue-600">${getTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Customer & Payment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer & Payment</h3>
            
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
                      checked={paymentMethod === 'cash'}
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
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <CreditCard className="h-4 w-4 mr-1" />
                    Card
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
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowBill(false)}
          >
            &times;
          </button>
          <h2 className="text-xl font-bold mb-2 text-center">{lastTransaction.customer}</h2>
          <div className="text-center text-xs text-gray-500 mb-2">{lastTransaction.branchAddress}</div>
          <div className="text-center text-xs text-gray-500 mb-4">Manager: {lastTransaction.managerContact}</div>
          <div className="mb-2 text-xs text-gray-500">Date: {lastTransaction.date}</div>
          <div className="mb-2 text-xs text-gray-500">Cashier: {lastTransaction.cashierName}</div>
          <table className="w-full text-xs mb-4">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Product</th>
                <th className="text-right py-1">Price</th>
                <th className="text-right py-1">Qty</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {lastTransaction.items.map((item: any) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td className="text-right">${item.price.toFixed(2)}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between font-bold text-base mb-2">
            <span>Total:</span>
            <span>${lastTransaction.total.toFixed(2)}</span>
          </div>
          <div className="mb-2 text-xs">Payment Method: <span className="font-semibold">{lastTransaction.paymentMethod.toUpperCase()}</span></div>
          <div className="mb-2 text-xs text-gray-500">{lastTransaction.additionalNote}</div>
          <div className="text-center mt-4">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => {
                window.print();
                setShowBill(false);
              }}
            >
              Print Bill
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default POS;