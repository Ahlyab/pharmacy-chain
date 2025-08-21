import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema(
  {
    // Your existing fields
    name: { type: String, required: true }, // Matches "Product"
    category: { type: String, required: true }, // You may map this from "Composition" or create custom category
    stock: { type: Number, required: true }, // Matches "Quantity"
    minStock: { type: Number, required: true },
    price: { type: Number, required: true }, // Could map from "Retail price VAT included"
    supplier: { type: String, required: true }, // Matches "Supplier name"
    expiryDate: { type: Date, required: true }, // Matches "Expiration date"
    // Branch linkage (store manager's branchId)
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },

    // Extra fields from Excel file
    store: { type: String }, // "Store"
    storeAlt: { type: String }, // "Store.1"
    supplierId: { type: String }, // "Supplier"
    supplierEntity: { type: String }, // "Supplier entity"
    supplierEntityName: { type: String }, // "supplier_entity_name"
    purchaseInvoiceId: { type: String }, // "purchase_invoice_id"
    supplierPurchaseInvoiceId: { type: String }, // "Supplier purchase invoice id"
    purchaseInvoiceDate: { type: Date }, // "Purchase invoice issue date"
    sku: { type: String }, // "SKU"
    skuAlt: { type: String }, // "SKU.1"
    manufacturer: { type: String }, // "Manufacturer"
    manufacturerName: { type: String }, // "Manufacturer name"
    composition: { type: String }, // "Composition"
    compositionName: { type: String }, // "composition_name"
    series: { type: String }, // "Series"
    reservedQuantity: { type: Number }, // "Reserved quantity"
    purchasePriceExclVAT: { type: Number }, // "Purchase price VAT excluded"
    vat: { type: Number }, // "VAT"
    divider: { type: String }, // "Divider"
    dividerCustom: { type: String }, // "divider_custom"
  },
  { timestamps: true }
);

export default mongoose.model("Inventory", InventorySchema);
