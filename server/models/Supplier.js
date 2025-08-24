import mongoose from "mongoose";

const DeliverySchema = new mongoose.Schema({
  date: { type: String, required: true },
  deliveryTime: { type: String, required: true },
  products: { type: String, required: true },
  quantity: { type: Number, required: true },
  notes: { type: String },
});

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  address: { type: String, required: true },
  productsSupplied: [{ type: String, required: true }],
  deliveries: [DeliverySchema],
  email: { type: String, default: '' },
  company: { type: String, default: '' },
  gst: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  notes: { type: String, default: '' },
});

export default mongoose.model("Supplier", SupplierSchema);
