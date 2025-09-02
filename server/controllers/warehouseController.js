
import WarehouseStock from '../models/WarehouseStock.js';
import ProductStock from '../models/ProductStock.js';
import WarehouseTransfer from '../models/WarehouseTransfer.js';
import Supplier from '../models/Supplier.js';
import Branch from '../models/Branch.js';
import Inventory from '../models/Inventory.js';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { logInventoryAction, logBulkOperation, logFailedAction, logCustomAction } from '../utils/auditLogger.js';

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

    // Log the action
    await logInventoryAction(
      req,
      "STOCK_ADDED",
      stock._id,
      stock.productName,
      {
        category: stock.category,
        quantity: stock.quantity,
        price: stock.price,
        supplier: stock.supplier,
        expiryDate: stock.expiryDate
      }
    );

    res.json(stock);
  } catch (err) {
    console.error('Error in addStock:', err);
    
    // Log failed action
    try {
      await logFailedAction(
        req,
        "STOCK_ADDED",
        "WarehouseStock",
        null,
        req.body.productName || "Unknown Product",
        "Failed to add warehouse stock",
        err,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

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
      const previousStock = existingInventory.stock;
      existingInventory.stock += quantity;
      await existingInventory.save();

      // Log inventory update
      await logInventoryAction(
        req,
        "STOCK_UPDATED",
        existingInventory._id,
        existingInventory.name,
        {
          previousStock: previousStock,
          newStock: existingInventory.stock,
          quantityChanged: quantity,
          source: "Warehouse Transfer"
        }
      );
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

      // Log inventory creation
      await logInventoryAction(
        req,
        "PRODUCT_CREATED",
        newInventory._id,
        newInventory.name,
        {
          category: newInventory.category,
          stock: newInventory.stock,
          price: newInventory.price,
          supplier: newInventory.supplier,
          expiryDate: newInventory.expiryDate,
          source: "Warehouse Transfer"
        }
      );
    }
    
    // Reduce warehouse stock
    const previousWarehouseStock = stock.quantity;
    stock.quantity -= quantity;
    await stock.save();

    // Log warehouse stock update
    await logInventoryAction(
      req,
      "STOCK_UPDATED",
      stock._id,
      stock.productName,
      {
        previousStock: previousWarehouseStock,
        newStock: stock.quantity,
        quantityChanged: -quantity,
        destination: `Branch: ${branch.name}`,
        source: "Warehouse"
      }
    );
    
    // Create transfer record for audit trail
    const transfer = new WarehouseTransfer({ 
      stock: stockId, 
      branch: branchId, 
      quantity,
      date: new Date()
    });
    await transfer.save();

    // Log the transfer action
    await logCustomAction(
      req,
      "WAREHOUSE_TRANSFER",
      "WarehouseTransfer",
      transfer._id,
      `Transfer ${quantity} ${stock.productName} to ${branch.name}`,
      `Transferred ${quantity} units of ${stock.productName} from warehouse to branch ${branch.name}`,
      {
        stockId: stockId,
        branchId: branchId,
        quantity: quantity,
        productName: stock.productName,
        branchName: branch.name
      }
    );
    
    res.json({ 
      message: 'Stock transferred successfully',
      transfer: transfer,
      remainingStock: stock.quantity
    });
  } catch (err) {
    console.error('Error in transferStock:', err);
    
    // Log failed action
    try {
      await logFailedAction(
        req,
        "WAREHOUSE_TRANSFER",
        "WarehouseTransfer",
        req.body.stockId,
        "Unknown Product",
        "Failed to transfer stock",
        err,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(500).json({ error: err.message });
  }
}

export async function importExcel(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Process the Excel file
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return res.status(400).json({ error: "Excel file is empty or has no data" });
    }

    // Check if required columns exist
    const firstRow = rawData[0];
    const hasRequiredColumns = firstRow && (
      (firstRow.SKU || firstRow.sku || firstRow.Sku) &&
      (firstRow.Quantity || firstRow.quantity || firstRow.QUANTITY) &&
      (firstRow['Retail price VAT included'] || firstRow['retail price VAT included'] || firstRow.retail_price_VAT_included)
    );

    if (!hasRequiredColumns) {
      return res.status(400).json({ 
        error: "Excel file must contain columns: SKU, Quantity, and Retail price VAT included (case insensitive)" 
      });
    }

    // Helper function to check if a column is an ID/UUID column
    const isIdColumn = (columnName) => {
      if (!columnName) return false;
      const lowerCol = columnName.toLowerCase();
      return lowerCol.includes('id') || 
             lowerCol.includes('uuid') || 
             lowerCol.endsWith('_id') || 
             lowerCol === 'id' ||
             lowerCol === 'uuid';
    };

    // Helper function to get the human-readable name column
    const getReadableColumn = (row, baseName) => {
      // Priority order: name column first, then base column
      const nameColumn = row[`${baseName}_name`] || row[`${baseName} name`] || row[`${baseName}Name`];
      const baseColumn = row[baseName] || row[baseName.charAt(0).toUpperCase() + baseName.slice(1)];
      
      return nameColumn || baseColumn || '';
    };

    console.log('Processing warehouse import with data:', rawData);

    // Process the data - Skip ID columns, keep only human-readable names
    const jsonData = rawData
      .map((row) => {
        // Map only human-readable columns from Excel to our data structure
        const processedRow = {
          // Core required fields
          productName: row.SKU_1 || row.sku_1 || row.Sku_1 || row.SKU || row.sku || row.Sku || '',
          category: '',
          quantity: parseInt(row.Quantity || row.quantity || row.QUANTITY || '0') || 0,
          minStock: parseInt(row['Reserved quantity'] || row['reserved quantity'] || row.reserved_quantity || '0') || 0,
          retailPriceVATIncluded: parseFloat(row['Retail price VAT included'] || row['retail price VAT included'] || row.retail_price_VAT_included || '0') || 0,
          supplier: row['Supplier name'] || row['supplier name'] || row.supplier_name || '',
          
          // Human-readable fields only (skip ID columns)
          supplierCompany: row['supplier_entity_name'] || '',
          store: row.Store_1 || row.store_1 || row.STORE_1 || row.Store || row.store || row.STORE || '',
          manufacturer: row['Manufacturer name'] || row['manufacturer name'] || row.manufacturer_name || row.Manufacturer || row.manufacturer || '',
          composition: row.composition_name || row['Composition name'] || row['composition name'] || row.composition_name || row.COMPOSITION_NAME || row.Composition || row.composition || row.COMPOSITION || '',
          series: row.Series || row.series || row.SERIES || '',
          reservedQuantity: parseInt(row['Reserved quantity'] || row['reserved quantity'] || row.reserved_quantity || '0') || 0,
          purchasePriceExclVAT: parseFloat(row['Purchase price VAT excluded'] || row['purchase price VAT excluded'] || row.purchase_price_VAT_excluded || '0') || 0,
          vat: parseFloat(row.VAT || row.vat || row.Vat || '0') || 0,
          divider: row.Divider || row.divider || row.DIVIDER || '',
          dividerCustom: row['divider_custom'] || row['Divider custom'] || row['divider custom'] || '',
        };
        
        // Process date fields
        if (processedRow.expiryDate) {
          const d = new Date(processedRow.expiryDate);
          if (!isNaN(d.getTime())) {
            processedRow.expiryDate = d.toISOString().slice(0, 10);
          } else {
            // If date parsing fails, set to a default future date
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            processedRow.expiryDate = futureDate.toISOString().slice(0, 10);
          }
        } else {
          // Set default expiry date to 1 year from now
          const futureDate = new Date();
          futureDate.setFullYear(futureDate.getFullYear() + 1);
          processedRow.expiryDate = futureDate.toISOString().slice(0, 10);
        }
        
        return processedRow;
      })
      .filter((row) => {
        // Filter out rows with missing essential data
        return row.productName && row.productName.trim() !== '' && 
               row.quantity >= 0 && row.retailPriceVATIncluded > 0;
      });

    if (jsonData.length === 0) {
      return res.status(400).json({ error: "No valid products found in the Excel file" });
    }

    // Get unique suppliers from imported data (using human-readable names)
    const supplierMap = new Map();
    for (const product of jsonData) {
      if (product.supplier && product.supplier.trim() !== '') {
        const supplierName = product.supplier.trim();
        if (!supplierMap.has(supplierName)) {
          // Find the corresponding supplier entity from the original data
          const originalRow = rawData.find(row => 
            (row['Supplier name'] || row['supplier name'] || row.supplier_name || '') === supplierName
          );
          
          supplierMap.set(supplierName, {
            name: supplierName,
            contact: 'Imported from Excel',
            address: 'Address to be updated',
            email: '',
            company: product.supplierCompany || originalRow?.['Supplier entity'] || originalRow?.['supplier entity'] || originalRow?.supplier_entity || '',
            gst: '',
            notes: '',
            productsSupplied: [],
            status: 'Active'
          });
        }
      }
    }

    // Create new suppliers if needed and get their IDs
    const suppliersToCreate = [];
    const supplierIdMap = new Map(); // Map supplier name to MongoDB ID
    
    for (const [supplierName, supplierDetails] of supplierMap) {
      const existingSupplier = await Supplier.findOne({ 
        name: { $regex: new RegExp(`^${supplierName}$`, 'i') } 
      });
      
      if (existingSupplier) {
        // Supplier exists, use its ID
        supplierIdMap.set(supplierName, existingSupplier._id);
      } else {
        // Supplier doesn't exist, create new one
        suppliersToCreate.push(supplierDetails);
      }
    }

    let suppliersCreated = 0;
    for (const supplier of suppliersToCreate) {
      try {
        const newSupplier = new Supplier(supplier);
        await newSupplier.save();
        supplierIdMap.set(supplier.name, newSupplier._id);
        suppliersCreated++;
      } catch (error) {
        console.error(`Failed to create supplier ${supplier.name}:`, error);
      }
    }

    // Update jsonData to include supplier IDs
    jsonData.forEach(product => {
      if (product.supplier && supplierIdMap.has(product.supplier)) {
        product.supplierId = supplierIdMap.get(product.supplier);
      }
    });

    // Check existing warehouse stock and prepare update/insert operations
    const existingWarehouseStock = await WarehouseStock.find();
    const stockToUpdate = [];
    const stockToInsert = [];

    for (const importedProduct of jsonData) {
      const existingStock = existingWarehouseStock.find((es) => 
        es.productName.toLowerCase() === importedProduct.productName.toLowerCase() &&
        es.composition?.toLowerCase() === importedProduct.composition?.toLowerCase() &&
        es.supplier.toString() === importedProduct.supplierId?.toString()
      );
      
      if (existingStock) {
        // Stock exists, prepare for update with quantity addition
        const updatedStock = {
          id: existingStock._id,
          productName: importedProduct.productName,
          category: importedProduct.category,
          quantity: existingStock.quantity + importedProduct.quantity, // Add to existing quantity
          minStock: importedProduct.minStock, // Update min stock
          price: importedProduct.retailPriceVATIncluded.toString(), // Use VAT included price
          supplier: importedProduct.supplierId, // Store supplier MongoDB ID
          expiryDate: importedProduct.expiryDate,
          // Update all other fields
          name: importedProduct.productName,
          stock: (existingStock.quantity + importedProduct.quantity).toString(),
          store: importedProduct.store,
          manufacturer: importedProduct.manufacturer,
          composition: importedProduct.composition,
          series: importedProduct.series,
          reservedQuantity: importedProduct.reservedQuantity.toString(),
          purchasePriceExclVAT: importedProduct.purchasePriceExclVAT.toString(),
          vat: importedProduct.vat.toString(),
          retailPriceVATIncluded: importedProduct.retailPriceVATIncluded.toString(),
          divider: importedProduct.divider,
          dividerCustom: importedProduct.dividerCustom,
        };
        stockToUpdate.push(updatedStock);
      } else {
        // New stock, prepare for insert
        const newStock = {
          productName: importedProduct.productName,
          category: importedProduct.category,
          quantity: importedProduct.quantity,
          minStock: importedProduct.minStock,
          price: importedProduct.retailPriceVATIncluded.toString(), // Use VAT included price
          supplier: importedProduct.supplierId, // Store supplier MongoDB ID
          expiryDate: importedProduct.expiryDate,
          // Include all fields
          name: importedProduct.productName,
          stock: importedProduct.quantity.toString(),
          // Additional fields
          store: importedProduct.store,
          manufacturer: importedProduct.manufacturer,
          composition: importedProduct.composition,
          series: importedProduct.series,
          reservedQuantity: importedProduct.reservedQuantity.toString(),
          purchasePriceExclVAT: importedProduct.purchasePriceExclVAT.toString(),
          vat: importedProduct.vat.toString(),
          retailPriceVATIncluded: importedProduct.retailPriceVATIncluded.toString(),
          divider: importedProduct.divider,
          dividerCustom: importedProduct.dividerCustom,
        };
        stockToInsert.push(newStock);
      }
    }

    // Process updates and inserts
    let updatedCount = 0;
    let insertedCount = 0;

    // Update existing warehouse stock
    for (const stock of stockToUpdate) {
      try {
        const { id, ...updateData } = stock;
        await WarehouseStock.findByIdAndUpdate(id, updateData);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update warehouse stock ${stock.productName}:`, error);
      }
    }

    // Insert new warehouse stock
    if (stockToInsert.length > 0) {
      try {
        const insertResult = await WarehouseStock.insertMany(stockToInsert);
        insertedCount = insertResult.length;
      } catch (error) {
        throw new Error(`Error inserting new warehouse stock: ${error.message}`);
      }
    }

    // Calculate summary statistics
    const importedCategories = [...new Set(jsonData.map(p => p.category))];
    const totalValue = jsonData.reduce((sum, p) => sum + (p.quantity * p.retailPriceVATIncluded), 0);
    const totalPurchaseValue = jsonData.reduce((sum, p) => sum + (p.quantity * p.purchasePriceExclVAT), 0);
    const uniqueSuppliers = [...new Set(jsonData.map(p => p.supplier).filter(Boolean))];
    const uniqueManufacturers = [...new Set(jsonData.map(p => p.manufacturer).filter(Boolean))];
    const uniqueStores = [...new Set(jsonData.map(p => p.store).filter(Boolean))];

    // Calculate quantity addition for updated stock
    let totalQuantityAdded = 0;
    if (stockToUpdate.length > 0) {
      totalQuantityAdded = stockToUpdate.reduce((sum, p) => {
        const originalStock = existingWarehouseStock.find((es) => es._id.toString() === p.id);
        return sum + (p.quantity - (originalStock?.quantity || 0));
      }, 0);
    }

    // Log the bulk operation
    await logBulkOperation(
      req,
      "BULK_UPLOAD",
      `Warehouse Import - ${new Date().toISOString()}`,
      jsonData.length,
      updatedCount + insertedCount,
      0, // No errors in this case
      []
    );

    res.status(200).json({
      success: true,
      message: `Successfully imported ${jsonData.length} warehouse stock items`,
      summary: {
        totalProcessed: jsonData.length,
        stockUpdated: updatedCount,
        stockAdded: insertedCount,
        quantityAdded: totalQuantityAdded,
        suppliersCreated: suppliersCreated,
        uniqueSuppliers: uniqueSuppliers.length,
        uniqueManufacturers: uniqueManufacturers.length,
        uniqueStores: uniqueStores.length,
        categories: importedCategories,
        totalRetailValue: totalValue,
        totalPurchaseValue: totalPurchaseValue,
        dataEfficiency: "ID columns skipped, only human-readable names stored"
      }
    });

  } catch (error) {
    console.error('Warehouse Excel import error:', error);
    
    // Log the failed operation
    try {
      await logBulkOperation(
        req,
        "BULK_UPLOAD",
        `Failed Warehouse Import - ${new Date().toISOString()}`,
        0,
        0,
        1,
        [error.message]
      );
    } catch (logError) {
      console.error("Failed to log failed bulk operation:", logError);
    }

    res.status(500).json({ 
      error: "Error processing Excel file", 
      details: error.message 
    });
  }
}
