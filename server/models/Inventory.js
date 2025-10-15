import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema(
  {
    // Core required fields
    name: { type: String, required: true }, // Product name
    category: { type: String, required: false }, // Category/Composition
    stock: { type: Number, required: true }, // Quantity
    minStock: { type: Number, required: true },
    price: { type: Number, required: true }, // Retail price VAT included
    unitPrice: { type: Number, default: 0 }, // Unit price
    pricePerPiece: { type: Number, default: 0 }, // Price per individual piece
    units: { type: String, default: "pieces" }, // Unit of measurement (tablets, bottles, boxes, etc.)
    unitsPerPack: { type: Number, default: 1 }, // Number of units per pack
    shelfStock: { type: Number, default: 0 }, // Stock on shelf/display
    supplier: { type: String, required: true }, // Supplier name (for display)
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" }, // Supplier MongoDB ID reference
    expiryDate: { type: Date, required: true }, // Expiration date
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },

    // Human-readable fields only (no ID/UUID columns)
    store: { type: String }, // Store name (not store ID)
    manufacturer: { type: String }, // Manufacturer name (not manufacturer ID)
    composition: { type: String }, // Composition name (not composition ID)
    series: { type: String }, // Series information
    reservedQuantity: { type: Number, default: 0 }, // Reserved quantity
    purchasePriceExclVAT: { type: Number, default: 0 }, // Purchase price excluding VAT
    vat: { type: Number, default: 0 }, // VAT percentage
    retailPriceVATIncluded: { type: Number, default: 0 }, // Retail price including VAT
    divider: { type: String }, // Divider information
    dividerCustom: { type: String }, // Custom divider information
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Inventory", InventorySchema);
