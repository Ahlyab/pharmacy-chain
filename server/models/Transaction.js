import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Inventory",
        required: true,
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      isUnitPurchase: { type: Boolean, default: false }, // Whether sold as units or packs
      unitsSold: { type: Number, default: 0 }, // Total units sold (calculated)
      packsSold: { type: Number, default: 0 }, // Total packs sold (calculated)
    },
  ],
  totalAmount: { type: Number, required: true },
  customerName: { type: String },
  cashierName: { type: String },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "transfer"],
    required: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },
  date: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ["Completed", "Pending", "Cancelled", "Returned"], 
    default: "Completed" 
  },
});

export default mongoose.model("Transaction", TransactionSchema);
