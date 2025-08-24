
import WarehouseStock from '../models/WarehouseStock.js';
import ProductStock from '../models/ProductStock.js';
import WarehouseTransfer from '../models/WarehouseTransfer.js';
import Supplier from '../models/Supplier.js';
import Branch from '../models/Branch.js';
import Inventory from '../models/Inventory.js';

export async function getStock(req, res) {
  try {
    const stock = await WarehouseStock.find().populate('supplier');
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addStock(req, res) {
  try {
    console.log('Incoming addStock req.body:', req.body);
    const { supplierId, supplierName, ...rest } = req.body;
    let finalSupplierId = supplierId;
    // If supplierName is provided, create a new supplier
    if (supplierName && !supplierId) {
      const newSupplier = new Supplier({
        name: supplierName,
        contact: 'N/A',
        address: 'N/A',
        productsSupplied: [],
      });
      await newSupplier.save();
      finalSupplierId = newSupplier._id;
    }
    // Store all fields in new WarehouseStock table
    console.log('Saving WarehouseStock with:', { ...rest, supplier: finalSupplierId });
    const stock = new WarehouseStock({ ...rest, supplier: finalSupplierId });
    await stock.save();
    res.json(stock);
  } catch (err) {
    console.error('Error in addStock:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function transferStock(req, res) {
  try {
    const { stockId, branchId, quantity } = req.body;
    const stock = await WarehouseStock.findById(stockId);
    if (!stock || stock.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    stock.quantity -= quantity;
    await stock.save();
    // Optionally, add to branch inventory here
    const transfer = new WarehouseTransfer({ stock: stockId, branch: branchId, quantity });
    await transfer.save();
    res.json(transfer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
