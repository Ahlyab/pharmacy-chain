import React, { useState, useEffect, useRef } from "react";
import { api, apiEndpoints } from "../../utils/api";
import Swal from "sweetalert2";

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
}

interface SupplyProduct {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  expiryDate: string;
  category?: string;
  manufacturer?: string;
  composition?: string;
  units?: string;
  unitsPerPack?: number;
  minStock?: number;
  vat?: number;
  purchasePriceExclVAT?: number;
  retailPriceVATIncluded?: number;
}

interface BulkSupplyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  onSuccess: () => void;
}

const BulkSupplyDialog: React.FC<BulkSupplyDialogProps> = ({
  isOpen,
  onClose,
  suppliers,
  onSuccess,
}) => {
  interface ExistingInventoryProduct {
    _id: string;
    name: string;
    category?: string;
    manufacturer?: string;
    composition?: string;
    units?: string;
    unitsPerPack?: number;
    minStock?: number;
    vat?: number;
    purchasePriceExclVAT?: number;
    retailPriceVATIncluded?: number;
    unitPrice?: number;
  }

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [supplyDate, setSupplyDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [products, setProducts] = useState<SupplyProduct[]>([]);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<ExistingInventoryProduct[]>(
    []
  );
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const productNameInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [newProduct, setNewProduct] = useState<Partial<SupplyProduct>>({
    name: "",
    quantity: 1,
    unitPrice: 0,
    expiryDate: "",
    category: "",
    manufacturer: "",
    composition: "",
    units: "pieces",
    unitsPerPack: 1,
    minStock: 10,
    vat: 0,
    purchasePriceExclVAT: 0,
    retailPriceVATIncluded: 0,
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form when dialog opens
      setSelectedSupplier(null);
      setSelectedBranchId("");
      setProducts([]);
      setInvoiceFile(null);
      setInvoiceNumber("");
      setNotes("");
      setNewProduct({
        name: "",
        quantity: 1,
        unitPrice: 0,
        expiryDate: "",
        category: "",
        manufacturer: "",
        composition: "",
        units: "pieces",
        unitsPerPack: 1,
        minStock: 10,
        vat: 0,
        purchasePriceExclVAT: 0,
        retailPriceVATIncluded: 0,
      });
      // Fetch existing inventory to power autocomplete
      (async () => {
        try {
          const data = await apiEndpoints.getInventory();
          // Normalize to minimal fields used in prefill
          const mapped: ExistingInventoryProduct[] = (data || []).map(
            (p: any) => ({
              _id: p._id || p.id,
              name: p.name || "",
              category: p.category || "",
              manufacturer: p.manufacturer || "",
              composition: p.composition || "",
              units: p.units || "pieces",
              unitsPerPack: p.unitsPerPack || 1,
              minStock: p.minStock ?? 10,
              vat: p.vat ?? 0,
              purchasePriceExclVAT: p.purchasePriceExclVAT ?? p.unitPrice ?? 0,
              retailPriceVATIncluded:
                p.retailPriceVATIncluded ?? p.unitPrice ?? 0,
              unitPrice: p.unitPrice ?? 0,
            })
          );
          setAllProducts(mapped);
        } catch (err) {
          console.error("Error fetching inventory for autocomplete:", err);
        }
      })();
      // Fetch branches for branch selection
      (async () => {
        try {
          const data = await apiEndpoints.getBranches();
          setBranches(data || []);
        } catch (err) {
          console.error("Error fetching branches:", err);
        }
      })();
    }
  }, [isOpen]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        productNameInputRef.current &&
        !productNameInputRef.current.contains(e.target as Node)
      ) {
        setShowProductSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const calculateTotalPrice = (product: Partial<SupplyProduct>) => {
    const quantity = product.quantity || 0;
    const unitPrice = product.unitPrice || 0;
    return quantity * unitPrice;
  };

  const calculateGrandTotal = () => {
    return products.reduce((total, product) => total + product.totalPrice, 0);
  };

  const addProduct = () => {
    if (
      !newProduct.name ||
      !newProduct.quantity ||
      !newProduct.unitPrice ||
      !newProduct.expiryDate ||
      !newProduct.retailPriceVATIncluded
    ) {
      Swal.fire({
        title: "Error",
        text: "Please fill in all required fields (Name, Quantity, Unit Price, Selling Price, Expiry Date)",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    const product: SupplyProduct = {
      id: Date.now().toString(),
      name: newProduct.name,
      quantity: newProduct.quantity,
      unitPrice: newProduct.unitPrice,
      totalPrice: calculateTotalPrice(newProduct),
      expiryDate: newProduct.expiryDate,
      category: newProduct.category,
      manufacturer: newProduct.manufacturer,
      composition: newProduct.composition,
      units: newProduct.units || "pieces",
      unitsPerPack: newProduct.unitsPerPack || 1,
      minStock: newProduct.minStock || 10,
      vat: newProduct.vat || 0,
      purchasePriceExclVAT:
        newProduct.purchasePriceExclVAT || newProduct.unitPrice || 0,
      retailPriceVATIncluded:
        newProduct.retailPriceVATIncluded || newProduct.unitPrice || 0,
    };

    setProducts([...products, product]);
    setNewProduct({
      name: "",
      quantity: 1,
      unitPrice: 0,
      expiryDate: "",
      category: "",
      manufacturer: "",
      composition: "",
      units: "pieces",
      unitsPerPack: 1,
      minStock: 10,
      vat: 0,
      purchasePriceExclVAT: 0,
      retailPriceVATIncluded: 0,
    });
  };

  const removeProduct = (productId: string) => {
    setProducts(products.filter((p) => p.id !== productId));
  };

  const updateProduct = (
    productId: string,
    field: keyof SupplyProduct,
    value: any
  ) => {
    setProducts(
      products.map((p) => {
        if (p.id === productId) {
          const updated = { ...p, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updated.totalPrice = calculateTotalPrice(updated);
          }
          return updated;
        }
        return p;
      })
    );
  };

  const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          title: "Invalid File Type",
          text: "Please upload a valid image (JPEG, PNG, GIF) or PDF file",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: "File Too Large",
          text: "Please upload a file smaller than 5MB",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      setInvoiceFile(file);
    }
  };

  const processBulkSupply = async () => {
    if (!selectedSupplier) {
      Swal.fire({
        title: "Error",
        text: "Please select a supplier",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    if (!selectedBranchId) {
      Swal.fire({
        title: "Error",
        text: "Please select a branch",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    if (products.length === 0) {
      Swal.fire({
        title: "Error",
        text: "Please add at least one product",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      setLoading(true);

      // Process bulk supply using the new API endpoint
      const bulkSupplyData = {
        supplierId: selectedSupplier.id,
        branchId: selectedBranchId,
        supplyDate: supplyDate,
        products: products,
        invoiceNumber: invoiceNumber || null,
        notes: notes || "",
        totalAmount: calculateGrandTotal(),
      };

      await api.post("/api/supplier/bulk-supply", bulkSupplyData);

      // Upload invoice file if provided
      if (invoiceFile) {
        const formData = new FormData();
        formData.append("invoice", invoiceFile);
        formData.append("supplierId", selectedSupplier.id);
        formData.append("deliveryDate", supplyDate);
        formData.append("invoiceNumber", invoiceNumber);

        await api.upload("/api/supplier/invoice-upload", formData);
      }

      Swal.fire({
        title: "Success",
        text: `Successfully added ${products.length} products from ${selectedSupplier.name} to inventory`,
        icon: "success",
        confirmButtonText: "OK",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error processing bulk supply:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to process bulk supply. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold">Bulk Supply from Supplier</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Supplier Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Supplier *
            </label>
            <select
              value={selectedSupplier?.id || ""}
              onChange={(e) => {
                const supplier = suppliers.find((s) => s.id === e.target.value);
                setSelectedSupplier(supplier || null);
              }}
              className="border p-2 w-full rounded"
              required
            >
              <option value="">Choose a supplier...</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}{" "}
                  {supplier.company ? `(${supplier.company})` : ""}
                </option>
              ))}
            </select>

            {/* Selected Supplier Info */}
            {selectedSupplier && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800">
                  {selectedSupplier.name}
                </h4>
                <div className="text-sm text-blue-600">
                  <div>Company: {selectedSupplier.company || "N/A"}</div>
                  <div>Email: {selectedSupplier.email || "N/A"}</div>
                  <div>Contact: {selectedSupplier.contact}</div>
                  <div>Address: {selectedSupplier.address}</div>
                </div>
              </div>
            )}
          </div>

          {/* Branch Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Branch *
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="border p-2 w-full rounded"
              required
            >
              <option value="">Choose a branch...</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Supply Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supply Date *
              </label>
              <input
                type="date"
                value={supplyDate}
                onChange={(e) => setSupplyDate(e.target.value)}
                className="border p-2 w-full rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Enter invoice number"
                className="border p-2 w-full rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice File
              </label>
              <input
                type="file"
                onChange={handleInvoiceUpload}
                accept="image/*,.pdf"
                className="border p-2 w-full rounded"
              />
            </div>
          </div>

          {/* Add Product Form */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="text-lg font-semibold mb-4">Add Product</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  ref={productNameInputRef}
                  type="text"
                  value={newProduct.name || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewProduct({ ...newProduct, name: value });
                    setShowProductSuggestions(!!value && value.length >= 1);
                  }}
                  onFocus={() =>
                    setShowProductSuggestions(
                      !!(newProduct.name && newProduct.name.length >= 1)
                    )
                  }
                  placeholder="Start typing to search existing products"
                  className="border p-2 w-full rounded text-sm"
                />
                {showProductSuggestions &&
                  (newProduct.name || "").length >= 1 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-60 overflow-auto"
                    >
                      {allProducts
                        .filter((p) =>
                          p.name
                            .toLowerCase()
                            .includes((newProduct.name || "").toLowerCase())
                        )
                        .slice(0, 10)
                        .map((p) => (
                          <button
                            key={p._id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                            onClick={() => {
                              // Prefill fields from selected product
                              setNewProduct({
                                ...newProduct,
                                name: p.name,
                                category: p.category || "",
                                manufacturer: p.manufacturer || "",
                                composition: p.composition || "",
                                units: p.units || "pieces",
                                unitsPerPack: p.unitsPerPack || 1,
                                minStock:
                                  typeof p.minStock === "number"
                                    ? p.minStock
                                    : 10,
                                vat: typeof p.vat === "number" ? p.vat : 0,
                                purchasePriceExclVAT:
                                  typeof p.purchasePriceExclVAT === "number"
                                    ? p.purchasePriceExclVAT
                                    : p.unitPrice || 0,
                                retailPriceVATIncluded:
                                  typeof p.retailPriceVATIncluded === "number"
                                    ? p.retailPriceVATIncluded
                                    : p.unitPrice || 0,
                                unitPrice:
                                  typeof p.unitPrice === "number"
                                    ? p.unitPrice
                                    : 0,
                              });
                              setShowProductSuggestions(false);
                            }}
                          >
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-gray-500">
                              {p.manufacturer || p.category
                                ? `${p.manufacturer || ""}${
                                    p.manufacturer && p.category ? " • " : ""
                                  }${p.category || ""}`
                                : "Existing product"}
                            </div>
                          </button>
                        ))}
                      {allProducts.filter((p) =>
                        p.name
                          .toLowerCase()
                          .includes((newProduct.name || "").toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No matches found
                        </div>
                      )}
                    </div>
                  )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={newProduct.quantity || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  min="1"
                  className="border p-2 w-full rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price *
                </label>
                <input
                  type="number"
                  value={newProduct.unitPrice || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      unitPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="0.01"
                  className="border p-2 w-full rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price *
                </label>
                <input
                  type="number"
                  value={newProduct.retailPriceVATIncluded || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      retailPriceVATIncluded: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="0.01"
                  className="border p-2 w-full rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  value={newProduct.expiryDate || ""}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, expiryDate: e.target.value })
                  }
                  className="border p-2 w-full rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={newProduct.category || ""}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, category: e.target.value })
                  }
                  placeholder="e.g., Medicine, Supplements"
                  className="border p-2 w-full rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={newProduct.manufacturer || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      manufacturer: e.target.value,
                    })
                  }
                  placeholder="Manufacturer name"
                  className="border p-2 w-full rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Units
                </label>
                <select
                  value={newProduct.units || "pieces"}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, units: e.target.value })
                  }
                  className="border p-2 w-full rounded text-sm"
                >
                  <option value="pieces">Pieces</option>
                  <option value="tablets">Tablets</option>
                  <option value="bottles">Bottles</option>
                  <option value="boxes">Boxes</option>
                  <option value="strips">Strips</option>
                  <option value="tubes">Tubes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Units per Pack
                </label>
                <input
                  type="number"
                  value={newProduct.unitsPerPack || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      unitsPerPack: parseInt(e.target.value) || 1,
                    })
                  }
                  min="1"
                  className="border p-2 w-full rounded text-sm"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={addProduct}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Add Product
              </button>
            </div>
          </div>

          {/* Products List */}
          {products.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-4">
                Products to Add ({products.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left">
                        Product
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        Quantity
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        Unit Price
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        Selling Price
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        Total
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        Expiry
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="border border-gray-300 p-2">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              {product.category}
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="number"
                            value={product.quantity}
                            onChange={(e) =>
                              updateProduct(
                                product.id,
                                "quantity",
                                parseInt(e.target.value) || 0
                              )
                            }
                            min="1"
                            className="border p-1 w-20 rounded text-sm"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="number"
                            value={product.unitPrice}
                            onChange={(e) =>
                              updateProduct(
                                product.id,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            min="0"
                            step="0.01"
                            className="border p-1 w-24 rounded text-sm"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="number"
                            value={product.retailPriceVATIncluded || 0}
                            onChange={(e) =>
                              updateProduct(
                                product.id,
                                "retailPriceVATIncluded",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            min="0"
                            step="0.01"
                            className="border p-1 w-24 rounded text-sm"
                          />
                        </td>
                        <td className="border border-gray-300 p-2 font-medium">
                          #{product.totalPrice.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="date"
                            value={product.expiryDate}
                            onChange={(e) =>
                              updateProduct(
                                product.id,
                                "expiryDate",
                                e.target.value
                              )
                            }
                            className="border p-1 rounded text-sm"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <button
                            onClick={() => removeProduct(product.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Total Amount */}
          {products.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Amount:</span>
                <span className="text-2xl font-bold text-blue-600">
                  #{calculateGrandTotal().toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this supply..."
              rows={3}
              className="border p-2 w-full rounded"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={processBulkSupply}
            disabled={loading || !selectedSupplier || products.length === 0}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Process Supply"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkSupplyDialog;
