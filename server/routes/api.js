import express from "express";
const router = express.Router();
import warehouseRoutes from "./warehouse.js";
import Supplier from "../models/Supplier.js";
import jwt from "jsonwebtoken";
import Billing from "../models/Billing.js";
import Inventory from "../models/Inventory.js";
import Transaction from "../models/Transaction.js";
import POS from "../models/POS.js";
import User from "../models/User.js";
import mongoose from "mongoose"; // Added for health check
import Manager from "../models/Manager.js";
import multer from "multer";
import * as XLSX from "xlsx";
import {
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,
  updateManager,
  deleteManager,
} from "../controllers/branchController.js";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') || 
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});
// Branch Routes
router.post("/branch", createBranch);
router.get("/branch", getBranches);
router.patch("/branch/:id", updateBranch);
router.delete("/branch/:id", deleteBranch);
// Supplier Routes
router.post("/supplier", async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/supplier", async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.status(200).json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/supplier/:id", async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.status(200).json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/supplier/:id", async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.status(200).json({ message: "Supplier deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Supplier Delivery Routes
router.post("/supplier/:id/delivery", async (req, res) => {
  try {
    const { date, deliveryTime, products, quantity, notes } = req.body;
    if (!date || !deliveryTime || !products || !quantity) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    
    const newDelivery = {
      date,
      deliveryTime,
      products,
      quantity,
      notes: notes || ""
    };
    
    supplier.deliveries.push(newDelivery);
    await supplier.save();
    
    res.status(201).json(newDelivery);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/supplier/:id/deliveries", async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    
    res.status(200).json(supplier.deliveries || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/supplier/:id/delivery/:deliveryId", async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    
    const delivery = supplier.deliveries.id(req.params.deliveryId);
    if (!delivery) {
      return res.status(404).json({ error: "Delivery not found" });
    }
    
    Object.assign(delivery, req.body);
    await supplier.save();
    
    res.status(200).json(delivery);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/supplier/:id/delivery/:deliveryId", async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    
    supplier.deliveries.pull(req.params.deliveryId);
    await supplier.save();
    
    res.status(200).json({ message: "Delivery deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
// Manager Routes
router.post("/manager", async (req, res) => {
  try {
    const { name, email, phone, branchId, status, password } = req.body;
    if (!name || !email || !phone || !branchId || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    // Check if manager already exists
    const existingManager = await Manager.findOne({ email });
    if (existingManager) {
      return res
        .status(400)
        .json({ error: "Manager with this email already exists" });
    }
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }
    // Create manager document (store branch as ObjectId)
    const manager = new Manager({
      name,
      email,
      phone,
      branch: branchId,
      status,
    });
    await manager.save();
    // Create user document for login (branchId is id)
    const user = new User({ name, email, password, role: "manager", branchId });
    await user.save();
    // Return manager info (populate branch name for convenience)
    const populated = await Manager.findById(manager._id).populate(
      "branch",
      "name"
    );
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/manager", async (req, res) => {
  try {
    const managers = await Manager.find().populate("branch", "name");
    res.status(200).json(managers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/manager/:id", updateManager);
router.delete("/manager/:id", deleteManager);

// Health check endpoint
router.get("/health", async (req, res) => {
  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus[dbState] || "unknown",
        readyState: dbState,
      },
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// JWT secret key
const JWT_SECRET = "your_jwt_secret_key";

// User Signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }
    const user = new User({ name, email, password, role });
    await user.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({
      token,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId, // Include branchId if applicable
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Get current user info from token
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Billing Routes
router.post("/billing", async (req, res) => {
  try {
    const billing = new Billing(req.body);
    await billing.save();
    res.status(201).json(billing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/billing", async (req, res) => {
  try {
    const { branchId } = req.query;
    let query = {};

    // If branchId is provided, filter by it
    if (branchId && branchId !== "all") {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const billings = await Billing.find(query);
    res.status(200).json(billings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inventory Routes
router.post("/inventory", async (req, res) => {
  console.log("POST /inventory body:", req.body);
  try {
    const requiredFields = [
      "name",
      "category",
      "stock",
      "minStock",
      "price",
      "supplier",
      "expiryDate",
    ];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        console.error(`Missing field: ${field}`);
        return res.status(400).json({ error: `Missing field: ${field}` });
      }
    }

    // Convert types
    const inventoryData = {
      name: req.body.name,
      category: req.body.category,
      stock: Number(req.body.stock),
      minStock: Number(req.body.minStock),
      price: Number(req.body.price),
      supplier: req.body.supplier,
      supplierId: req.body.supplierId, // Include supplierId if provided
      expiryDate: new Date(req.body.expiryDate),
      branchId: req.body.branchId
        ? new mongoose.Types.ObjectId(req.body.branchId)
        : undefined,
    };

    // Validate numbers
    if (
      isNaN(inventoryData.stock) ||
      isNaN(inventoryData.minStock) ||
      isNaN(inventoryData.price)
    ) {
      return res
        .status(400)
        .json({ error: "Stock, minStock, and price must be numbers" });
    }
    // Validate date
    if (isNaN(inventoryData.expiryDate.getTime())) {
      return res.status(400).json({ error: "Invalid expiryDate" });
    }

    console.log("POST /inventory body:", inventoryData);
    const inventory = new Inventory(inventoryData);
    await inventory.save();
    
    // Populate supplier information before sending response
    const populatedInventory = await Inventory.findById(inventory._id)
      .populate("supplierId", "name company contact email address gst status")
      .populate("branchId", "name");
      
    res.status(201).json(populatedInventory);
  } catch (error) {
    console.error("Error in POST /inventory:", error);
    res.status(500).json({ error: error.message });
  }
});
// Update Inventory Item

// Update Inventory Item (moved below router initialization)
router.patch("/inventory/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }
    if (updateData.branchId) {
      updateData.branchId = new mongoose.Types.ObjectId(updateData.branchId);
    }
    if (updateData.supplierId) {
      updateData.supplierId = new mongoose.Types.ObjectId(updateData.supplierId);
    }
    
    const updated = await Inventory.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    
    if (!updated) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    
    // Populate supplier information before sending response
    const populatedInventory = await Inventory.findById(id)
      .populate("supplierId", "name company contact email address gst status")
      .populate("branchId", "name");
      
    res.status(200).json(populatedInventory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Inventory Item
router.delete("/inventory/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Inventory.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    res.status(200).json({ message: "Inventory item deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/inventory", async (req, res) => {
  try {
    const { branchId } = req.query;
    let query = {};

    // If branchId is provided, filter by it
    if (branchId && branchId !== "all") {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const inventories = await Inventory.find(query)
      .populate("branchId", "name")
      .populate("supplierId", "name company contact email address gst status"); // Populate supplier details
    res.status(200).json(inventories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import inventory from Excel
router.post("/inventory/import", async (req, res) => {
  try {
    const { branchId, products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: "Products must be an array" });
    }

    if (!branchId) {
      return res.status(400).json({ error: "branchId is required" });
    }

    const inventoryData = products.map((product) => ({
      name: product.name || product.Product || "",
      category: product.category || product.Composition || "",
      stock: Number(product.stock || product.Quantity || 0),
      minStock: Number(product.minStock || 0),
      price: Number(product.price || product["Retail price VAT included"] || 0),
      supplier: product.supplier || product["Supplier name"] || "",
      expiryDate: product.expiryDate
        ? new Date(product.expiryDate)
        : new Date(),
      branchId: branchId ? new mongoose.Types.ObjectId(branchId) : undefined,
      // Map other fields from Excel if available
      store: product.store || product.Store,
      supplierId: product.supplierId || product.Supplier,
      manufacturer: product.manufacturer || product.Manufacturer,
      composition: product.composition || product.Composition,
      sku: product.sku || product.SKU,
    }));

    console.log(`Importing ${inventoryData.length} products for branch: ${branchId}`);
    
    const result = await Inventory.insertMany(inventoryData);
    
    console.log(`Successfully imported ${result.length} products for branch: ${branchId}`);
    
    res.status(201).json({
      message: `Imported ${result.length} products to branch`,
      products: result,
      branchId: branchId
    });
  } catch (error) {
    console.error("Error in inventory import:", error);
    res.status(500).json({ 
      error: error.message,
      details: "Failed to import products to database"
    });
  }
});

// Excel File Upload and Import Endpoint
router.post("/inventory/import-excel", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { branchId } = req.body;
    if (!branchId) {
      return res.status(400).json({ error: "Branch ID is required" });
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

    console.log(rawData);

    // Process the data - Skip ID columns, keep only human-readable names
    const jsonData = rawData
      .map((row) => {
        // Map only human-readable columns from Excel to our data structure
        const processedRow = {
          // Core required fields - Updated mapping based on user requirements
          //sku has two column choose second on
          name: row.SKU_1 || row.sku_1 || row.Sku_1 || row.SKU || row.sku || row.Sku || '', // SKU is the product name sku has two column choose second one
          category: '',
          stock: parseInt(row.Quantity || row.quantity || row.QUANTITY || '0') || 0,
          minStock: parseInt(row['Reserved quantity'] || row['reserved quantity'] || row.reserved_quantity || '0') || 0,
          price: parseFloat(row['Retail price VAT included'] || row['retail price VAT included'] || row.retail_price_VAT_included || '0') || 0,
          supplier: row['Supplier name'] || row['supplier name'] || row.supplier_name || '', // Use supplier_name for supplier
          expiryDate: row['Expiration date'] || row['expiration date'] || row.expiration_date || row.Expiry || row.expiry || '',
          
          // Human-readable fields only (skip ID columns)
          supplierCompany: row['supplier_entity_name'] || '',
          store: row.Store_1 || row.store_1 || row.STORE_1 || row.Store || row.store || row.STORE || '',
          manufacturer: row['Manufacturer name'] || row['manufacturer name'] || row.manufacturer_name || row.Manufacturer || row.manufacturer || '',
          composition: row.composition_name || row['Composition name'] || row['composition name'] || row.composition_name || row.COMPOSITION_NAME || row.Composition || row.composition || row.COMPOSITION || '',
          series: row.Series || row.series || row.SERIES || '',
          reservedQuantity: parseInt(row['Reserved quantity'] || row['reserved quantity'] || row.reserved_quantity || '0') || 0,
          purchasePriceExclVAT: parseFloat(row['Purchase price VAT excluded'] || row['purchase price VAT excluded'] || row.purchase_price_VAT_excluded || '0') || 0,
          vat: parseFloat(row.VAT || row.vat || row.Vat || '0') || 0,
          retailPriceVATIncluded: parseFloat(row['Retail price VAT included'] || row['retail price VAT included'] || row.retail_price_VAT_included || '0') || 0,
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
        return row.name && row.name.trim() !== '' && 
               row.stock >= 0 && row.retailPriceVATIncluded > 0;
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

    // Check existing products and prepare update/insert operations
    const existingProducts = await Inventory.find({ branchId });
    const productsToUpdate = [];
    const productsToInsert = [];

    for (const importedProduct of jsonData) {
      const existingProduct = existingProducts.find((ep) => 
        ep.name.toLowerCase() === importedProduct.name.toLowerCase() &&
        ep.composition?.toLowerCase() === importedProduct.composition?.toLowerCase() &&
        ep.supplier.toLowerCase() === importedProduct.supplier.toLowerCase()
      );
      
      if (existingProduct) {
        // Product exists, prepare for update with stock addition
        const updatedProduct = {
          id: existingProduct._id,
          name: importedProduct.name,
          category: importedProduct.category,
          stock: existingProduct.stock + importedProduct.stock, // Add to existing stock
          minStock: importedProduct.minStock, // Update min stock
          price: importedProduct.retailPriceVATIncluded, // Use VAT included price
          supplier: importedProduct.supplier, // Keep supplier name for display
          supplierId: importedProduct.supplierId, // Store supplier MongoDB ID
          expiryDate: importedProduct.expiryDate,
          // Update all other human-readable fields (no ID fields)
          store: importedProduct.store,
          manufacturer: importedProduct.manufacturer,
          composition: importedProduct.composition,
          series: importedProduct.series,
          reservedQuantity: importedProduct.reservedQuantity,
          purchasePriceExclVAT: importedProduct.purchasePriceExclVAT,
          vat: importedProduct.vat,
          retailPriceVATIncluded: importedProduct.retailPriceVATIncluded,
          divider: importedProduct.divider,
          dividerCustom: importedProduct.dividerCustom,
        };
        productsToUpdate.push(updatedProduct);
      } else {
        // New product, prepare for insert with all human-readable fields
        const newProduct = {
          name: importedProduct.name,
          category: importedProduct.category,
          stock: importedProduct.stock,
          minStock: importedProduct.minStock,
          price: importedProduct.retailPriceVATIncluded, // Use VAT included price
          supplier: importedProduct.supplier, // Keep supplier name for display
          supplierId: importedProduct.supplierId, // Store supplier MongoDB ID
          expiryDate: importedProduct.expiryDate,
          branchId: branchId,
          // Include all human-readable fields (no ID fields)
          store: importedProduct.store,
          manufacturer: importedProduct.manufacturer,
          composition: importedProduct.composition,
          series: importedProduct.series,
          reservedQuantity: importedProduct.reservedQuantity,
          purchasePriceExclVAT: importedProduct.purchasePriceExclVAT,
          vat: importedProduct.vat,
          retailPriceVATIncluded: importedProduct.retailPriceVATIncluded,
          divider: importedProduct.divider,
          dividerCustom: importedProduct.dividerCustom,
        };
        productsToInsert.push(newProduct);
      }
    }

    // Process updates and inserts
    let updatedCount = 0;
    let insertedCount = 0;

    // Update existing products
    for (const product of productsToUpdate) {
      try {
        const { id, ...updateData } = product;
        await Inventory.findByIdAndUpdate(id, { ...updateData, branchId });
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update product ${product.name}:`, error);
      }
    }

    // Insert new products
    if (productsToInsert.length > 0) {
      try {
        const insertResult = await Inventory.insertMany(productsToInsert);
        insertedCount = insertResult.length;
      } catch (error) {
        throw new Error(`Error inserting new products: ${error.message}`);
      }
    }

    // Calculate summary statistics
    const importedCategories = [...new Set(jsonData.map(p => p.category))];
    const totalValue = jsonData.reduce((sum, p) => sum + (p.stock * p.retailPriceVATIncluded), 0);
    const totalPurchaseValue = jsonData.reduce((sum, p) => sum + (p.stock * p.purchasePriceExclVAT), 0);
    const uniqueSuppliers = [...new Set(jsonData.map(p => p.supplier).filter(Boolean))];
    const uniqueManufacturers = [...new Set(jsonData.map(p => p.manufacturer).filter(Boolean))];
    const uniqueStores = [...new Set(jsonData.map(p => p.store).filter(Boolean))];

    // Calculate stock addition for updated products
    let totalStockAdded = 0;
    if (productsToUpdate.length > 0) {
      totalStockAdded = productsToUpdate.reduce((sum, p) => {
        const originalProduct = existingProducts.find((ep) => ep._id.toString() === p.id);
        return sum + (p.stock - (originalProduct?.stock || 0));
      }, 0);
    }

    res.status(200).json({
      success: true,
      message: `Successfully imported ${jsonData.length} products`,
      summary: {
        totalProcessed: jsonData.length,
        productsUpdated: updatedCount,
        productsAdded: insertedCount,
        stockAdded: totalStockAdded,
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
    console.error('Excel import error:', error);
    res.status(500).json({ 
      error: "Error processing Excel file", 
      details: error.message 
    });
  }
});

// Transaction Routes
router.post("/transaction", async (req, res) => {
  try {
    const { branchId, paymentMethod, ...transactionData } = req.body;

    // Validate payment method
    if (!["cash", "card", "transfer"].includes(paymentMethod)) {
      return res.status(400).json({
        error: "Invalid payment method. Must be cash, card, or transfer",
      });
    }

    // Validate branchId
    if (!branchId) {
      return res.status(400).json({ error: "branchId is required" });
    }

    // Convert branchId to ObjectId
    const transaction = new Transaction({
      ...transactionData,
      paymentMethod,
      branchId: new mongoose.Types.ObjectId(branchId),
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/transaction", async (req, res) => {
  try {
    const { branchId } = req.query;
    let query = {};

    // If branchId is provided, filter by it
    if (branchId && branchId !== "all") {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    }

    // Populate productId and branchId to get product name and branch name
    const transactions = await Transaction.find(query)
      .populate("items.productId")
      .populate("branchId", "name");
    // Map backend fields to frontend expected fields
    const mapped = transactions.map((t) => ({
      id: t.transactionId,
      date: t.date,
      customer: t.customerName || "",
      items: t.items.map((item) => ({
        name: item.productId?.name || "",
        quantity: item.quantity,
        price: item.price,
      })),
      total: t.totalAmount,
      paymentMethod: t.paymentMethod || "N/A",
      status: t.status || "Completed",
      branchName: t.branchId?.name || "N/A",
    }));
    res.status(200).json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POS Routes
router.post("/pos", async (req, res) => {
  try {
    const pos = new POS(req.body);
    await pos.save();
    res.status(201).json(pos);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/pos", async (req, res) => {
  try {
    const posRecords = await POS.find();
    res.status(200).json(posRecords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get recent sales
router.get("/sales/recent", async (req, res) => {
  try {
    const { branchId } = req.query;
    let query = {};

    // If branchId is provided, filter by it
    if (branchId && branchId !== "all") {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    }

    // populate productId and branchId to get product name and branch name
    const recentSales = await Transaction.find(query)
      .sort({ date: -1 })
      .limit(10)
      .populate("items.productId")
      .populate("branchId", "name");
    // map backend fields to frontend expected fields
    const mapped = recentSales.map((s) => ({
      id: s.transactionId,
      date: s.date,
      customer: s.customerName || "",
      branchName: s.branchId?.name || "N/A",
    }));
    res.status(200).json(recentSales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Routes
router.post("/user", async (req, res) => {
  try {
    const { name, email, password, role, branchId } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    const user = new User({ name, email, password, role, branchId });
    await user.save();

    // Return user info without password
    const { password: _, ...userInfo } = user.toObject();
    res.status(201).json(userInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/user", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // Exclude password field
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id, { password: 0 }); // Exclude password field
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...updateData } = req.body;

    const updateFields = { ...updateData };

    // If password is provided, hash it before updating
    if (password) {
      const bcrypt = await import("bcrypt");
      updateFields.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(id, updateFields, { new: true });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user info without password
    const { password: _, ...userInfo } = user.toObject();
    res.status(200).json(userInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Warehouse routes
router.use("/warehouse", warehouseRoutes);

export default router;
