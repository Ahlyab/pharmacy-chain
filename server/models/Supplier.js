import mongoose from "mongoose";

const DeliverySchema = new mongoose.Schema({
  date: { type: String, required: true },
  deliveryTime: { type: String, required: true },
  products: { type: String, required: true },
  quantity: { type: Number, required: true },
  notes: { type: String },
  totalAmount: { type: Number, default: 0 },
  invoiceNumber: { type: String, default: '' },
});

const InvoiceSchema = new mongoose.Schema({
  // New invoice fields
  store: { type: String, required: true },
  supplier: { type: String, required: true },
  supplierPurchaseInvoiceId: { type: String, required: true },
  issueDate: { type: String, required: true },
  count: { type: Number, default: 0 },
  countOfProductInStock: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  quantityInPackageInStock: { type: Number, default: 0 },
  amountOfProductInStock: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: 'Unknown' },
  
  // Legacy fields (optional for backward compatibility)
  fileName: { type: String, default: '' },
  originalName: { type: String, default: '' },
  deliveryDate: { type: String, default: '' },
  invoiceNumber: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
  filePath: { type: String, default: '' },
});

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  address: { type: String, required: true },
  productsSupplied: [{ type: String, required: true }],
  deliveries: [DeliverySchema],
  invoices: [InvoiceSchema],
  email: { type: String, default: '' },
  company: { type: String, default: '' },
  gst: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  notes: { type: String, default: '' },
});

export default mongoose.model("Supplier", SupplierSchema);
