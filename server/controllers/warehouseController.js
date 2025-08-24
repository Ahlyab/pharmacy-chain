
import WarehouseStock from '../models/WarehouseStock.js';
import ProductStock from '../models/ProductStock.js';
import WarehouseTransfer from '../models/WarehouseTransfer.js';
import Supplier from '../models/Supplier.js';
import Branch from '../models/Branch.js';
import Inventory from '../models/Inventory.js';
import mongoose from 'mongoose';

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
    const { supplierId, productName, quantity, minStock, price, expiryDate, category } = req.body;
    
    // Validate required fields
    if (!supplierId) {
      return res.status(400).json({ error: 'Supplier ID is required' });
    }
    
    if (!productName) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    
    if (!quantity || isNaN(Number(quantity))) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }
    
    // Validate supplier ID format
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ error: 'Invalid supplier ID format' });
    }
    
    // Create the stock data object matching the model schema
    const stockData = {
      productName: productName,
      quantity: Number(quantity),
      supplier: supplierId,
      name: productName,
      category: category || '',
      stock: quantity.toString(),
      minStock: minStock ? minStock.toString() : '',
      price: price ? price.toString() : '',
      expiryDate: expiryDate || ''
    };
    
    console.log('Saving WarehouseStock with:', stockData);
    const stock = new WarehouseStock(stockData);
    await stock.save();
    
    // Populate supplier info before sending response
    await stock.populate('supplier');
    res.json(stock);
  } catch (err) {
    console.error('Error in addStock:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function transferStock(req, res) {
  try {
    const { stockId, branchId, quantity } = req.body;
    
    // Validate input
    if (!stockId || !branchId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid transfer data' });
    }
    
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(stockId) || !mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if stock exists and has sufficient quantity
    const stock = await WarehouseStock.findById(stockId).populate('supplier');
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    
    if (stock.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    // Check if branch exists
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    // Check if product already exists in branch inventory
    let existingInventory = await Inventory.findOne({
      name: stock.productName,
      branchId: branchId
    });
    
    if (existingInventory) {
      // Update existing inventory
      existingInventory.stock += quantity;
      await existingInventory.save();
    } else {
      // Create new inventory item for the branch
      const newInventory = new Inventory({
        name: stock.productName,
        category: stock.category || 'General',
        stock: quantity,
        minStock: stock.minStock ? Number(stock.minStock) : 0,
        price: stock.price ? Number(stock.price) : 0,
        supplier: stock.supplier.name || stock.supplier.toString(),
        expiryDate: stock.expiryDate ? new Date(stock.expiryDate) : new Date(),
        branchId: branchId
      });
      await newInventory.save();
    }
    
    // Reduce warehouse stock
    stock.quantity -= quantity;
    await stock.save();
    
    // Create transfer record for audit trail
    const transfer = new WarehouseTransfer({ 
      stock: stockId, 
      branch: branchId, 
      quantity,
      date: new Date()
    });
    await transfer.save();
    
    res.json({ 
      message: 'Stock transferred successfully',
      transfer: transfer,
      remainingStock: stock.quantity
    });
  } catch (err) {
    console.error('Error in transferStock:', err);
    res.status(500).json({ error: err.message });
  }
}
