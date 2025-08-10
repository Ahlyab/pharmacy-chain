import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  customerName: { type: String },
  cashierName: { type: String },
  paymentMethod: { type: String },
  date: { type: Date, default: Date.now },
});

export default mongoose.model('Transaction', TransactionSchema);
