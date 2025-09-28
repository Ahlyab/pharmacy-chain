import mongoose from 'mongoose';

const stockTakingSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  actualStock: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['IN_STOCK', 'MISSING', 'PART', 'SHRINKAGE'],
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recordedAt: {
    type: Date,
    default: Date.now
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
stockTakingSchema.index({ productId: 1, recordedAt: -1 });
stockTakingSchema.index({ branchId: 1, recordedAt: -1 });
stockTakingSchema.index({ sessionId: 1 });

export default mongoose.model('StockTaking', stockTakingSchema);
