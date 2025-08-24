import mongoose from 'mongoose';

const productStockSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  addedAt: { type: Date, default: Date.now },
});

const ProductStock = mongoose.model('ProductStock', productStockSchema);
export default ProductStock;
