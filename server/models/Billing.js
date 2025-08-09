import mongoose from 'mongoose';

const BillingSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  customer: { type: String, required: true },
  items: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  total: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  status: { type: String, enum: ['Paid', 'Pending', 'Refunded'], required: true },
});

export default mongoose.model('Billing', BillingSchema);
