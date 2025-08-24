
import mongoose from 'mongoose';


const warehouseStockSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  name: { type: String },
  category: { type: String },
  stock: { type: String },
  minStock: { type: String },
  price: { type: String },
  expiryDate: { type: String },
  // Add more fields as needed from the frontend dialog
});

const WarehouseStock = mongoose.model('WarehouseStock', warehouseStockSchema);
export default WarehouseStock;
