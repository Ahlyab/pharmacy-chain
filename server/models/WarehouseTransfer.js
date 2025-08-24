
import mongoose from 'mongoose';

const warehouseTransferSchema = new mongoose.Schema({
  stock: { type: mongoose.Schema.Types.ObjectId, ref: 'WarehouseStock', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  quantity: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const WarehouseTransfer = mongoose.model('WarehouseTransfer', warehouseTransferSchema);
export default WarehouseTransfer;
