import mongoose from "mongoose";

const ReturnSchema = new mongoose.Schema({
  originalTransactionId: { 
    type: String, 
    required: true,
    ref: "Transaction"
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },
  returnDate: { 
    type: Date, 
    default: Date.now 
  },
  returnReason: { 
    type: String, 
    required: true 
  },
  returnItems: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Inventory",
        required: true,
      },
      name: { type: String, required: true },
      originalQuantity: { type: Number, required: true },
      returnQuantity: { type: Number, required: true },
      price: { type: Number, required: true },
      returnAmount: { type: Number, required: true },
    },
  ],
  totalReturnAmount: { 
    type: Number, 
    required: true 
  },
  originalTotalAmount: { 
    type: Number, 
    required: true 
  },
  processedBy: { 
    type: String, 
    required: true 
  },
  notes: { 
    type: String 
  },
}, {
  timestamps: true
});

export default mongoose.model("Return", ReturnSchema);
