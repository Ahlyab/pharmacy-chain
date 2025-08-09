import mongoose from 'mongoose';

const POSSchema = new mongoose.Schema({
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  paymentMethod: { type: String, required: true },
  customerName: { type: String, required: true },
});

export default mongoose.model('POS', POSSchema);
