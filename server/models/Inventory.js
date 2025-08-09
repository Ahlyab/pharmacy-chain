import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  stock: { type: Number, required: true },
  minStock: { type: Number, required: true },
  price: { type: Number, required: true },
  supplier: { type: String, required: true },
  expiryDate: { type: Date, required: true },
});

export default mongoose.model('Inventory', InventorySchema);
