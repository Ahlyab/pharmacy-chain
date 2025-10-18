import express from "express";
const router = express.Router();
import warehouseRoutes from "./warehouse.js";
import auditRoutes from "./audit.js";
import Supplier from "../models/Supplier.js";
import jwt from "jsonwebtoken";
import Billing from "../models/Billing.js";
import Inventory from "../models/Inventory.js";
import Transaction from "../models/Transaction.js";
import POS from "../models/POS.js";
import User from "../models/User.js";
import mongoose from "mongoose"; // Added for health check
import Manager from "../models/Manager.js";
import Return from "../models/Return.js";
import multer from "multer";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import {
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,
  updateManager,
  deleteManager,
} from "../controllers/branchController.js";
import {
  logSupplierAction,
  logFailedAction,
  logUserAction,
  logTransactionAction,
  logInventoryAction,
  logBulkOperation,
  logCustomAction,
} from "../utils/auditLogger.js";
import {
  authenticate,
  authorize,
  authorizeBranch,
} from "../middleware/auth.js";
import Branch from "../models/Branch.js";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/invoices";
    const uploadDir = "uploads/invoices";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // For Excel files (existing functionality)
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls")
    ) {
      cb(null, true);
    }
    // For invoice files (new functionality)
    else if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/gif" ||
      file.mimetype === "application/pdf" ||
      file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/i)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only Excel files (.xlsx, .xls) or image/PDF files (.jpg, .jpeg, .png, .gif, .pdf) are allowed"
        )
      );
      cb(
        new Error(
          "Only Excel files (.xlsx, .xls) or image/PDF files (.jpg, .jpeg, .png, .gif, .pdf) are allowed"
        )
      );
    }
  },
});

// Memory storage for Excel imports (needs buffer access)
const memoryStorage = multer.memoryStorage();

const memoryUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // For Excel files
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed"), false);
    }
  },
});
// Branch Routes (Admin only)
router.post("/branch", authenticate, authorize("Admin"), createBranch);
router.get("/branch", authenticate, getBranches);
router.patch("/branch/:id", authenticate, authorize("Admin"), updateBranch);
router.delete("/branch/:id", authenticate, authorize("Admin"), deleteBranch);
// Supplier Routes
router.post("/supplier", authenticate, async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();

    // Log the action
    await logSupplierAction(
      req,
      "SUPPLIER_CREATED",
      supplier._id,
      supplier.name,
      {
        company: supplier.company,
        contact: supplier.contact,
        email: supplier.email,
        address: supplier.address,
        gst: supplier.gst,
        status: supplier.status,
      }
    );

    res.status(201).json(supplier);
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "SUPPLIER_CREATED",
        "Supplier",
        null,
        req.body.name || "Unknown Supplier",
        "Failed to create supplier",
        error,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(400).json({ error: error.message });
  }
});

router.get("/supplier", authenticate, async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.status(200).json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/supplier/:id", authenticate, async (req, res) => {
  try {
    // Get the current supplier for audit logging
    const currentSupplier = await Supplier.findById(req.params.id);
    if (!currentSupplier)
      return res.status(404).json({ error: "Supplier not found" });

    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    // Log the action
    await logSupplierAction(
      req,
      "SUPPLIER_UPDATED",
      supplier._id,
      supplier.name,
      {
        previousName: currentSupplier.name,
        newName: supplier.name,
        previousCompany: currentSupplier.company,
        newCompany: supplier.company,
        previousContact: currentSupplier.contact,
        newContact: supplier.contact,
        previousEmail: currentSupplier.email,
        newEmail: supplier.email,
        previousAddress: currentSupplier.address,
        newAddress: supplier.address,
        previousGst: currentSupplier.gst,
        newGst: supplier.gst,
        previousStatus: currentSupplier.status,
        newStatus: supplier.status,
        changes: Object.keys(req.body),
      }
    );

    res.status(200).json(supplier);
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "SUPPLIER_UPDATED",
        "Supplier",
        req.params.id,
        "Unknown Supplier",
        "Failed to update supplier",
        error,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(400).json({ error: error.message });
  }
});

router.delete("/supplier/:id", authenticate, async (req, res) => {
  try {
    // Get the supplier before deletion for audit logging
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });

    await Supplier.findByIdAndDelete(req.params.id);

    // Log the action
    await logSupplierAction(
      req,
      "SUPPLIER_DELETED",
      req.params.id,
      supplier.name,
      {
        company: supplier.company,
        contact: supplier.contact,
        email: supplier.email,
        address: supplier.address,
        gst: supplier.gst,
        status: supplier.status,
      }
    );

    res.status(200).json({ message: "Supplier deleted" });
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "SUPPLIER_DELETED",
        "Supplier",
        req.params.id,
        "Unknown Supplier",
        "Failed to delete supplier",
        error,
        {}
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(400).json({ error: error.message });
  }
});

// Supplier Delivery Routes
router.post("/supplier/:id/delivery", authenticate, async (req, res) => {
  try {
    const {
      date,
      deliveryTime,
      products,
      quantity,
      notes,
      totalAmount,
      invoiceNumber,
    } = req.body;
    const {
      date,
      deliveryTime,
      products,
      quantity,
      notes,
      totalAmount,
      invoiceNumber,
    } = req.body;
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
      notes: notes || "",
      totalAmount: totalAmount || 0,
      invoiceNumber: invoiceNumber || "",
    };

    supplier.deliveries.push(newDelivery);
    await supplier.save();

    // Log the delivery creation
    await logSupplierAction(
      req,
      "DELIVERY_CREATED",
      req.params.id,
      supplier.name,
      {
        date,
        products,
        quantity,
        totalAmount: totalAmount || 0,
        invoiceNumber: invoiceNumber || "",
      }
    );
    await logSupplierAction(
      req,
      "DELIVERY_CREATED",
      req.params.id,
      supplier.name,
      {
        date,
        products,
        quantity,
        totalAmount: totalAmount || 0,
        invoiceNumber: invoiceNumber || "",
      }
    );

    res.status(201).json(newDelivery);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/supplier/:id/deliveries", authenticate, async (req, res) => {
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

router.patch(
  "/supplier/:id/delivery/:deliveryId",
  authenticate,
  async (req, res) => {
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
  }
);

router.delete(
  "/supplier/:id/delivery/:deliveryId",
  authenticate,
  async (req, res) => {
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
  }
);

// Invoice upload endpoint
router.post(
  "/supplier/invoice-upload",
  authenticate,
  upload.single("invoice"),
  async (req, res) => {
    try {
      const { supplierId, deliveryDate, invoiceNumber } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "No invoice file uploaded" });
      }
router.post(
  "/supplier/invoice-upload",
  authenticate,
  upload.single("invoice"),
  async (req, res) => {
    try {
      const { supplierId, deliveryDate, invoiceNumber } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "No invoice file uploaded" });
      }

      if (!supplierId) {
        return res.status(400).json({ error: "Supplier ID is required" });
      }
      if (!supplierId) {
        return res.status(400).json({ error: "Supplier ID is required" });
      }

      // Verify supplier exists
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      // Verify supplier exists
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }

      // Store file information in supplier record
      const invoiceInfo = {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        deliveryDate: deliveryDate,
        invoiceNumber: invoiceNumber,
        uploadedAt: new Date(),
        filePath: req.file.path,
      };
      // Store file information in supplier record
      const invoiceInfo = {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        deliveryDate: deliveryDate,
        invoiceNumber: invoiceNumber,
        uploadedAt: new Date(),
        filePath: req.file.path,
      };

      // Add invoice to supplier's deliveries or create a separate invoices array
      if (!supplier.invoices) {
        supplier.invoices = [];
      }
      supplier.invoices.push(invoiceInfo);
      await supplier.save();
      // Add invoice to supplier's deliveries or create a separate invoices array
      if (!supplier.invoices) {
        supplier.invoices = [];
      }
      supplier.invoices.push(invoiceInfo);
      await supplier.save();

      // Log the invoice upload
      await logSupplierAction(
        req,
        "INVOICE_UPLOADED",
        supplierId,
        supplier.name,
        {
          fileName: req.file.filename,
          originalName: req.file.originalname,
          deliveryDate: deliveryDate,
          invoiceNumber: invoiceNumber,
        }
      );
      // Log the invoice upload
      await logSupplierAction(
        req,
        "INVOICE_UPLOADED",
        supplierId,
        supplier.name,
        {
          fileName: req.file.filename,
          originalName: req.file.originalname,
          deliveryDate: deliveryDate,
          invoiceNumber: invoiceNumber,
        }
      );

      res.status(200).json({
        message: "Invoice uploaded successfully",
        invoiceInfo: invoiceInfo,
      });
    } catch (error) {
      console.error("Invoice upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);
      res.status(200).json({
        message: "Invoice uploaded successfully",
        invoiceInfo: invoiceInfo,
      });
    } catch (error) {
      console.error("Invoice upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get supplier invoices
router.get("/supplier/:id/invoices", authenticate, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    res.status(200).json(supplier.invoices || []);
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Download supplier invoice
router.get(
  "/supplier/invoice/:invoiceId/download",
  authenticate,
  async (req, res) => {
    try {
      const supplier = await Supplier.findOne({
        "invoices._id": req.params.invoiceId,
      });
      if (!supplier) {
        return res.status(404).json({ error: "Invoice not found" });
      }
router.get(
  "/supplier/invoice/:invoiceId/download",
  authenticate,
  async (req, res) => {
    try {
      const supplier = await Supplier.findOne({
        "invoices._id": req.params.invoiceId,
      });
      if (!supplier) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const invoice = supplier.invoices.id(req.params.invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      const invoice = supplier.invoices.id(req.params.invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Check if file exists
      const fs = require("fs");
      if (!fs.existsSync(invoice.filePath)) {
        return res.status(404).json({ error: "Invoice file not found" });
      }
      // Check if file exists
      const fs = require("fs");
      if (!fs.existsSync(invoice.filePath)) {
        return res.status(404).json({ error: "Invoice file not found" });
      }

      res.download(invoice.filePath, invoice.originalName);
    } catch (error) {
      console.error("Download invoice error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);
      res.download(invoice.filePath, invoice.originalName);
    } catch (error) {
      console.error("Download invoice error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Bulk supply processing endpoint
router.post("/supplier/bulk-supply", authenticate, async (req, res) => {
  try {
    const {
      supplierId,
      branchId,
      supplyDate,
      products,
      invoiceNumber,
      notes,
      totalAmount,
    } = req.body;

    if (
      !supplierId ||
      !supplyDate ||
      !products ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res
        .status(400)
        .json({
          error: "Missing required fields: supplierId, supplyDate, products",
        });
    }

    // Verify supplier exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    // Optional: verify branch exists when provided
    let branchObjectId = undefined;
    if (branchId) {
      try {
        branchObjectId = new mongoose.Types.ObjectId(branchId);
        const branch = await Branch.findById(branchObjectId);
        if (!branch) {
          return res.status(404).json({ error: "Branch not found" });
        }
      } catch (e) {
        return res.status(400).json({ error: "Invalid branchId format" });
      }
    }

    const createdInventory = [];
    const errors = [];

    // Process each product
    for (const product of products) {
      try {
        const inventoryData = {
          name: product.name,
          category: product.category || "",
          stock: product.quantity,
          minStock: product.minStock || 10,
          price: product.retailPriceVATIncluded || product.unitPrice,
          unitPrice: product.unitPrice,
          pricePerPiece: product.pricePerPiece || product.unitPrice,
          units: product.units || "pieces",
          unitsPerPack: product.unitsPerPack || 1,
          shelfStock: product.quantity,
          supplier: supplier.name,
          supplierId: supplierId,
          expiryDate: new Date(product.expiryDate),
          branchId: branchObjectId,
          store: supplier.company || "",
          manufacturer: product.manufacturer || "",
          composition: product.composition || "",
          series: "",
          reservedQuantity: 0,
          purchasePriceExclVAT: product.purchasePriceExclVAT || 0,
          vat: product.vat || 0,
          retailPriceVATIncluded: product.retailPriceVATIncluded || 0,
          packPrice: product.packPrice || 0,
        };

        const inventory = new Inventory(inventoryData);
        await inventory.save();
        createdInventory.push(inventory);

        // Log each inventory creation
        await logInventoryAction(
          req,
          "PRODUCT_CREATED",
          inventory._id,
          inventory.name,
          {
            supplier: supplier.name,
            supplierId: supplierId,
            quantity: product.quantity,
            unitPrice: product.unitPrice,
            totalPrice: product.quantity * product.unitPrice,
            expiryDate: product.expiryDate,
            supplyDate: supplyDate,
            branchId: branchObjectId,
          }
        );
      } catch (error) {
        console.error(
          `Error creating inventory for product ${product.name}:`,
          error
        );
        console.error(
          `Error creating inventory for product ${product.name}:`,
          error
        );
        errors.push({
          product: product.name,
          error: error.message,
          error: error.message,
        });
      }
    }

    // Create delivery records (one entry per product)
    const deliveryTime = new Date().toLocaleTimeString();
    const perProductDeliveries = products.map((p) => ({
      date: supplyDate,
      deliveryTime,
      products: p.name,
      quantity: p.quantity,
      notes: `Bulk supply item - Invoice: ${invoiceNumber || "N/A"}. ${
        notes || ""
      }`,
      totalAmount: p.quantity * (p.unitPrice || 0),
      invoiceNumber: invoiceNumber || null,
    }));

    supplier.deliveries.push(...perProductDeliveries);
    await supplier.save();

    // Log bulk supply action
    await logSupplierAction(
      req,
      "BULK_SUPPLY_PROCESSED",
      supplierId,
      supplier.name,
      {
        supplyDate: supplyDate,
        productsCount: products.length,
        totalAmount: totalAmount,
        invoiceNumber: invoiceNumber,
        createdInventoryCount: createdInventory.length,
        errorsCount: errors.length,
        branchId: branchObjectId,
      }
    );
    await logSupplierAction(
      req,
      "BULK_SUPPLY_PROCESSED",
      supplierId,
      supplier.name,
      {
        supplyDate: supplyDate,
        productsCount: products.length,
        totalAmount: totalAmount,
        invoiceNumber: invoiceNumber,
        createdInventoryCount: createdInventory.length,
        errorsCount: errors.length,
        branchId: branchObjectId,
      }
    );

    res.status(200).json({
      message: `Bulk supply processed successfully. Created ${createdInventory.length} inventory items.`,
      createdInventory: createdInventory.length,
      errors: errors.length,
      details: {
        supplier: supplier.name,
        supplyDate: supplyDate,
        totalAmount: totalAmount,
        invoiceNumber: invoiceNumber,
      },
        invoiceNumber: invoiceNumber,
      },
    });
  } catch (error) {
    console.error("Bulk supply error:", error);
    res.status(500).json({ error: error.message });
  }
});
// Manager Routes (Admin only)
router.post("/manager", authenticate, authorize("Admin"), async (req, res) => {
  try {
    const { name, email, phone, branchId, status, password, role } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // For Admin role, branchId is optional. For other roles, branchId is required.
    if (role !== "Admin" && !branchId) {
      return res.status(400).json({
        error: "Branch is required for Manager and Sale Assistant roles",
      });
      return res.status(400).json({
        error: "Branch is required for Manager and Sale Assistant roles",
      });
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
      branch: branchId, // Will be undefined for Admin role, which is fine
      status,
      role: role || "Manager", // Use the role from request or default to "Manager"
    });
    await manager.save();


    // Create user document for login (branchId is id)
    const user = new User({
      name,
      email,
      password,
      role: role || "Manager",
      branchId: branchId ? new mongoose.Types.ObjectId(branchId) : undefined, // Convert to ObjectId if provided
    });
    await user.save();

    // Log the manager creation
    await logUserAction(req, "USER_CREATED", manager._id, manager.name, {
      email: manager.email,
      phone: manager.phone,
      branchId: manager.branch,
      role: manager.role,
      status: manager.status,
    });

    // Log the user creation
    await logUserAction(req, "USER_CREATED", user._id, user.name, {
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    });

    // Return manager info (populate branch name for convenience)
    const populated = await Manager.findById(manager._id).populate(
      "branch",
      "name"
    );
    res.status(201).json(populated);
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "USER_CREATED",
        "Manager",
        null,
        req.body.name || "Unknown Manager",
        "Failed to create manager",
        error,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(500).json({ error: error.message });
  }
});

router.get("/manager", authenticate, async (req, res) => {
  try {
    const managers = await Manager.find().populate("branch", "name");
    res.status(200).json(managers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/manager/:id", authenticate, authorize("Admin"), updateManager);
router.delete("/manager/:id", authenticate, authorize("Admin"), deleteManager);

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

// JWT secret key - use environment variable or fallback to default
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

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
    const user = await User.findOne({ email }).populate("branchId");
    if (!user || !(await user.comparePassword(password))) {
      // Log failed login attempt
      // try {
      //   await logFailedAction(
      //     req,
      //     "USER_LOGIN",
      //     "User",
      //     null,
      //     email,
      //     "Failed login attempt - invalid credentials",
      //     new Error("Invalid email or password"),
      //     { email }
      //   );
      // } catch (logError) {
      //   console.error("Failed to log failed login:", logError);
      // }

      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "1h",
    });

    // Log successful login
    // try {
    //   await logUserAction(
    //     req,
    //     "USER_LOGIN",
    //     user._id,
    //     user.name,
    //     {
    //       email: user.email,
    //       role: user.role,
    //       branchId: user.branchId?._id,
    //       branchName: user.branchId?.name
    //     }
    //   );
    // } catch (logError) {
    //   console.error("Failed to log successful login:", logError);
    // }

    res.status(200).json({
      token,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId?._id, // Include branchId if applicable
      branchName: user.branchId?.name, // Include branchName if applicable
    });
  } catch (error) {
    // Log failed login due to system error
    // try {
    //   await logFailedAction(
    //     req,
    //     "USER_LOGIN",
    //     "User",
    //     null,
    //     req.body.email || "Unknown",
    //     "Failed login attempt - system error",
    //     error,
    //     { email: req.body.email }
    //   );
    // } catch (logError) {
    //   console.error("Failed to log failed login:", logError);
    // }

    res.status(500).json({ error: error.message });
  }
});

// Authentication middleware is now imported from ../middleware/auth.js

// Get current user info from token
router.get("/me", authenticate, async (req, res) => {
  try {
    //populate branchId from branch model
    const user = await User.findById(req.user.id).populate("branchId");
    console.log("User from /me endpoint:", user);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }


    // Ensure we return the correct branch information
    const response = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user?.branchId?._id || user?.branchId || null,
      branchName: user?.branchId?.name || null,
    };


    console.log("Response from /me endpoint:", response);
    res.status(200).json(response);
  } catch (error) {
    console.error("Error in /me endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

// Billing Routes
router.post("/billing", authenticate, async (req, res) => {
  try {
    const billing = new Billing(req.body);
    await billing.save();

    // Log the billing creation
    await logTransactionAction(
      req,
      "INVOICE_CREATED",
      billing._id,
      `Invoice #${billing.invoiceNumber || billing._id}`,
      {
        invoiceNumber: billing.invoiceNumber,
        totalAmount: billing.totalAmount,
        customerName: billing.customerName,
        itemsCount: billing.items?.length || 0,
        branchId: billing.branchId,
      }
    );

    res.status(201).json(billing);
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "INVOICE_CREATED",
        "Billing",
        null,
        "Unknown Invoice",
        "Failed to create billing",
        error,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(400).json({ error: error.message });
  }
});

router.get("/billing", authenticate, async (req, res) => {
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
router.post("/inventory", authenticate, async (req, res) => {
  console.log("POST /inventory body:", req.body);
  console.log("POST /inventory - unitPrice:", req.body.unitPrice);
  console.log("POST /inventory - units:", req.body.units);
  try {
    const requiredFields = [
      "name",
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
      category: req.body.category || "", // Make category optional
      stock: Number(req.body.stock),
      minStock: Number(req.body.minStock),
      price: Number(req.body.price),
      unitPrice: Number(req.body.unitPrice) || 0,
      pricePerPiece:
        Number(req.body.pricePerPiece) || Number(req.body.unitPrice) || 0,
      units: req.body.units || "pieces",
      unitsPerPack: Number(req.body.unitsPerPack) || 1,
      shelfStock: Number(req.body.shelfStock) || 0,
      supplier: req.body.supplier,
      supplierId: req.body.supplierId, // Include supplierId if provided
      expiryDate: new Date(req.body.expiryDate),
      branchId: req.body.branchId
        ? new mongoose.Types.ObjectId(req.body.branchId)
        : undefined,
      // Include all new fields
      store: req.body.store || "",
      manufacturer: req.body.manufacturer || "",
      composition: req.body.composition || "",
      series: req.body.series || "",
      reservedQuantity: Number(req.body.reservedQuantity) || 0,
      purchasePriceExclVAT: Number(req.body.purchasePriceExclVAT) || 0,
      vat: Number(req.body.vat) || 0,
      retailPriceVATIncluded:
        Number(req.body.retailPriceVATIncluded) || Number(req.body.price) || 0,
      packPrice: Number(req.body.packPrice) || 0,
    };

    // Validate numbers
    if (
      isNaN(inventoryData.stock) ||
      isNaN(inventoryData.minStock) ||
      isNaN(inventoryData.price) ||
      isNaN(inventoryData.unitPrice) ||
      isNaN(inventoryData.pricePerPiece)
    ) {
      return res
        .status(400)
        .json({
          error: "Stock, minStock, price, and unitPrice must be numbers",
        });
    }
    // Validate date
    if (isNaN(inventoryData.expiryDate.getTime())) {
      return res.status(400).json({ error: "Invalid expiryDate" });
    }

    console.log("POST /inventory body:", inventoryData);
    console.log(
      "POST /inventory - inventoryData unitPrice:",
      inventoryData.unitPrice
    );
    console.log(
      "POST /inventory - inventoryData unitPrice:",
      inventoryData.unitPrice
    );
    console.log("POST /inventory - inventoryData units:", inventoryData.units);
    const inventory = new Inventory(inventoryData);
    await inventory.save();
    console.log(
      "POST /inventory - Saved inventory unitPrice:",
      inventory.unitPrice
    );
    console.log(
      "POST /inventory - Saved inventory unitPrice:",
      inventory.unitPrice
    );
    console.log("POST /inventory - Saved inventory units:", inventory.units);

    // Log the action
    await logInventoryAction(
      req,
      "PRODUCT_CREATED",
      inventory._id,
      inventory.name,
      {
        category: inventory.category,
        stock: inventory.stock,
        minStock: inventory.minStock,
        price: inventory.price,
        unitPrice: inventory.unitPrice,
        units: inventory.units,
        shelfStock: inventory.shelfStock,
        supplier: inventory.supplier,
        expiryDate: inventory.expiryDate,
        branchId: inventory.branchId,
        store: inventory.store,
        manufacturer: inventory.manufacturer,
        composition: inventory.composition,
        series: inventory.series,
      }
    );

    // Populate supplier information before sending response
    const populatedInventory = await Inventory.findById(inventory._id)
      .populate("supplierId", "name company contact email address gst status")
      .populate("branchId", "name");

    res.status(201).json(populatedInventory);
  } catch (error) {
    console.error("Error in POST /inventory:", error);

    // Log failed action
    try {
      await logFailedAction(
        req,
        "PRODUCT_CREATED",
        "Inventory",
        null,
        req.body.name || "Unknown Product",
        "Failed to create inventory item",
        error,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(500).json({ error: error.message });
  }
});
// Update Inventory Item

// Update Inventory Item (moved below router initialization)
router.patch("/inventory/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Get the current inventory item for audit logging
    const currentInventory = await Inventory.findById(id);
    if (!currentInventory) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }
    if (updateData.branchId) {
      updateData.branchId = new mongoose.Types.ObjectId(updateData.branchId);
    }
    if (updateData.supplierId) {
      updateData.supplierId = new mongoose.Types.ObjectId(
        updateData.supplierId
      );
    }

    const updated = await Inventory.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    // Log the action with detailed change information
    await logInventoryAction(
      req,
      "PRODUCT_UPDATED",
      updated._id,
      updated.name,
      {
        previousStock: currentInventory.stock,
        newStock: updated.stock,
        quantityChanged: updated.stock - currentInventory.stock,
        previousShelfStock: currentInventory.shelfStock,
        newShelfStock: updated.shelfStock,
        shelfStockChanged:
          (updated.shelfStock || 0) - (currentInventory.shelfStock || 0),
        shelfStockChanged:
          (updated.shelfStock || 0) - (currentInventory.shelfStock || 0),
        previousPrice: currentInventory.price,
        newPrice: updated.price,
        previousExpiry: currentInventory.expiryDate,
        newExpiry: updated.expiryDate,
        previousMinStock: currentInventory.minStock,
        newMinStock: updated.minStock,
        changes: Object.keys(updateData),
      }
    );

    // Populate supplier information before sending response
    const populatedInventory = await Inventory.findById(id)
      .populate("supplierId", "name company contact email address gst status")
      .populate("branchId", "name");

    res.status(200).json(populatedInventory);
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "PRODUCT_UPDATED",
        "Inventory",
        req.params.id,
        "Unknown Product",
        "Failed to update inventory item",
        error,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(400).json({ error: error.message });
  }
});

// Delete Inventory Item
router.delete("/inventory/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the inventory item before deletion for audit logging
    const inventoryToDelete = await Inventory.findById(id);
    if (!inventoryToDelete) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    await Inventory.findByIdAndDelete(id);

    // Log the action
    await logInventoryAction(
      req,
      "PRODUCT_DELETED",
      id,
      inventoryToDelete.name,
      {
        category: inventoryToDelete.category,
        stock: inventoryToDelete.stock,
        price: inventoryToDelete.price,
        supplier: inventoryToDelete.supplier,
        expiryDate: inventoryToDelete.expiryDate,
        branchId: inventoryToDelete.branchId,
      }
    );

    res.status(200).json({ message: "Inventory item deleted successfully" });
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "PRODUCT_DELETED",
        "Inventory",
        req.params.id,
        "Unknown Product",
        "Failed to delete inventory item",
        error,
        {}
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(400).json({ error: error.message });
  }
});

router.get("/inventory", authenticate, async (req, res) => {
  try {
    const { branchId } = req.query;
    let query = {};

    console.log("Inventory request - branchId:", branchId);
    console.log("Inventory request - user:", req.user);

    // If branchId is provided, filter by it
    if (branchId && branchId !== "all") {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    }

    console.log("Inventory query:", query);

    const inventories = await Inventory.find(query)
      .populate("branchId", "name")
      .populate("supplierId", "name company contact email address gst status"); // Populate supplier details


    console.log("Found inventories:", inventories.length);
    res.status(200).json(inventories);
  } catch (error) {
    console.error("Inventory fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all inventory across branches for warehouse management
router.get("/inventory/all-branches", authenticate, async (req, res) => {
  try {
    const { search, category, status, branchId } = req.query;
    let matchStage = {};

    // Apply filters
    if (branchId && branchId !== "all") {
      matchStage.branchId = new mongoose.Types.ObjectId(branchId);
    }

    if (category && category !== "all") {
      matchStage.category = { $regex: category, $options: "i" };
    }

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { supplier: { $regex: search, $options: "i" } },
      ];
    }

    // Add status filtering
    if (status && status !== "all") {
      if (status === "low_stock") {
        matchStage.$expr = { $lte: ["$stock", "$minStock"] };
      } else if (status === "out_of_stock") {
        matchStage.stock = { $lte: 0 };
      } else if (status === "in_stock") {
        matchStage.$expr = { $gt: ["$stock", "$minStock"] };
      }
    }

    const inventories = await Inventory.find(matchStage)
      .populate("branchId", "name")
      .populate("supplierId", "name company contact email address gst status")
      .sort({ name: 1, "branchId.name": 1 });

    // Add status field to each inventory item
    const inventoriesWithStatus = inventories.map((item) => {
      let status = "in_stock";
      if (item.stock <= 0) {
        status = "out_of_stock";
      } else if (item.stock <= item.minStock) {
        status = "low_stock";
      }

      return {
        ...item.toObject(),
        status,
        branchName: item.branchId?.name || "Unknown Branch",
        supplierName:
          item.supplierId?.name || item.supplier || "Unknown Supplier",
      };
    });

    res.status(200).json(inventoriesWithStatus);
  } catch (error) {
    console.error("Error getting all inventory across branches:", error);
    res.status(500).json({ error: error.message });
  }
});

// Transfer inventory between branches
router.post("/inventory/transfer", authenticate, async (req, res) => {
  try {
    const { inventoryId, fromBranchId, toBranchId, quantity, reason } =
      req.body;

    // Validate input
    if (
      !inventoryId ||
      !fromBranchId ||
      !toBranchId ||
      !quantity ||
      quantity <= 0
    ) {
      return res.status(400).json({ error: "Invalid transfer data" });
    }

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(inventoryId) ||
      !mongoose.Types.ObjectId.isValid(fromBranchId) ||
      !mongoose.Types.ObjectId.isValid(toBranchId)
    ) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if source inventory exists and has sufficient quantity
    const sourceInventory = await Inventory.findById(inventoryId)
      .populate("branchId", "name")
      .populate("supplierId", "name");

    if (!sourceInventory) {
      return res.status(404).json({ error: "Source inventory not found" });
    }

    if (sourceInventory.branchId._id.toString() !== fromBranchId) {
      return res
        .status(400)
        .json({ error: "Inventory does not belong to source branch" });
    }

    if (sourceInventory.stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock for transfer" });
    }

    // Check if destination branch exists
    const destinationBranch = await Branch.findById(toBranchId);
    if (!destinationBranch) {
      return res.status(404).json({ error: "Destination branch not found" });
    }

    // Check if product already exists in destination branch
    let destinationInventory = await Inventory.findOne({
      name: sourceInventory.name,
      branchId: toBranchId,
      supplierId: sourceInventory.supplierId,
    });

    if (destinationInventory) {
      // Update existing inventory
      const previousStock = destinationInventory.stock;
      destinationInventory.stock += quantity;
      await destinationInventory.save();
    } else {
      // Create new inventory item for destination branch
      destinationInventory = new Inventory({
        name: sourceInventory.name,
        category: sourceInventory.category,
        stock: quantity,
        minStock: sourceInventory.minStock,
        price: sourceInventory.price,
        supplier: sourceInventory.supplier,
        supplierId: sourceInventory.supplierId,
        expiryDate: sourceInventory.expiryDate,
        branchId: toBranchId,
        // Copy additional fields
        unitPrice: sourceInventory.unitPrice,
        units: sourceInventory.units,
        unitsPerPack: sourceInventory.unitsPerPack,
        shelfStock: sourceInventory.shelfStock,
        store: sourceInventory.store,
        manufacturer: sourceInventory.manufacturer,
        composition: sourceInventory.composition,
        series: sourceInventory.series,
        reservedQuantity: sourceInventory.reservedQuantity,
        purchasePriceExclVAT: sourceInventory.purchasePriceExclVAT,
        vat: sourceInventory.vat,
        retailPriceVATIncluded: sourceInventory.retailPriceVATIncluded,
        packPrice: sourceInventory.packPrice,
      });
      await destinationInventory.save();
    }

    // Reduce source inventory
    const previousSourceStock = sourceInventory.stock;
    sourceInventory.stock -= quantity;
    await sourceInventory.save();

    // Log the transfer action
    await logCustomAction(
      req,
      "INVENTORY_TRANSFER",
      "Inventory",
      inventoryId,
      `Transfer ${quantity} ${sourceInventory.name} from ${sourceInventory.branchId.name} to ${destinationBranch.name}`,
      `Transferred ${quantity} units of ${sourceInventory.name} from ${
        sourceInventory.branchId.name
      } to ${destinationBranch.name}. Reason: ${
        reason || "No reason provided"
      }`,
      {
        inventoryId: inventoryId,
        fromBranchId: fromBranchId,
        toBranchId: toBranchId,
        quantity: quantity,
        reason: reason,
        productName: sourceInventory.name,
        fromBranchName: sourceInventory.branchId.name,
        toBranchName: destinationBranch.name,
        previousSourceStock: previousSourceStock,
        newSourceStock: sourceInventory.stock,
        destinationStock: destinationInventory.stock,
      }
    );

    res.status(200).json({
      message: "Inventory transferred successfully",
      transfer: {
        inventoryId: inventoryId,
        fromBranch: sourceInventory.branchId.name,
        toBranch: destinationBranch.name,
        quantity: quantity,
        reason: reason,
        remainingSourceStock: sourceInventory.stock,
        destinationStock: destinationInventory.stock,
      },
    });
  } catch (error) {
    console.error("Error transferring inventory between branches:", error);
    res.status(500).json({ error: error.message });
  }
});

// Import inventory from Excel
router.post("/inventory/import", authenticate, async (req, res) => {
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
      unitPrice: Number(product.unitPrice || product["Unit Price"] || 0),
      units: product.units || product.Units || "pieces",
      shelfStock: Number(product.shelfStock || product["Shelf Stock"] || 0),
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

    console.log(
      `Importing ${inventoryData.length} products for branch: ${branchId}`
    );

    const result = await Inventory.insertMany(inventoryData);

    console.log(
      `Successfully imported ${result.length} products for branch: ${branchId}`
    );

    res.status(201).json({
      message: `Imported ${result.length} products to branch`,
      products: result,
      branchId: branchId,
    });
  } catch (error) {
    console.error("Error in inventory import:", error);
    res.status(500).json({
      error: error.message,
      details: "Failed to import products to database",
    });
  }
});

// Excel File Upload and Import Endpoint
router.post(
  "/inventory/import-excel",
  authenticate,
  memoryUpload.single("file"),
  async (req, res) => {
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
        return res
          .status(400)
          .json({ error: "Excel file is empty or has no data" });
      }

      // Check if required columns exist
      const firstRow = rawData[0];
      const hasRequiredColumns =
        firstRow &&
        (firstRow.SKU || firstRow.sku || firstRow.Sku) &&
        (firstRow.Quantity || firstRow.quantity || firstRow.QUANTITY) &&
        (firstRow["Retail price VAT included"] ||
          firstRow["retail price VAT included"] ||
          firstRow.retail_price_VAT_included);

      if (!hasRequiredColumns) {
        return res.status(400).json({
          error:
            "Excel file must contain columns: SKU, Quantity, and Retail price VAT included (case insensitive)",
        });
      }

      // Helper function to check if a column is an ID/UUID column
      const isIdColumn = (columnName) => {
        if (!columnName) return false;
        const lowerCol = columnName.toLowerCase();
        return (
          lowerCol.includes("id") ||
          lowerCol.includes("uuid") ||
          lowerCol.endsWith("_id") ||
          lowerCol === "id" ||
          lowerCol === "uuid"
        );
      };

      // Helper function to get the human-readable name column
      const getReadableColumn = (row, baseName) => {
        // Priority order: name column first, then base column
        const nameColumn =
          row[`${baseName}_name`] ||
          row[`${baseName} name`] ||
          row[`${baseName}Name`];
        const baseColumn =
          row[baseName] ||
          row[baseName.charAt(0).toUpperCase() + baseName.slice(1)];

        return nameColumn || baseColumn || "";
      };

      console.log(rawData);

      // Process the data - Skip ID columns, keep only human-readable names
      const jsonData = rawData
        .map((row) => {
          // Map only human-readable columns from Excel to our data structure
          const processedRow = {
            // Core required fields - Updated mapping based on user requirements
            //sku has two column choose second on
            name:
              row.SKU_1 ||
              row.sku_1 ||
              row.Sku_1 ||
              row.SKU ||
              row.sku ||
              row.Sku ||
              "", // SKU is the product name sku has two column choose second one
            category: "",
            stock:
              parseInt(row.Quantity || row.quantity || row.QUANTITY || "0") ||
              0,
            minStock:
              parseInt(
                row["Reserved quantity"] ||
                  row["reserved quantity"] ||
                  row.reserved_quantity ||
                  "0"
              ) || 0,
            price:
              parseFloat(
                row["Retail price VAT included"] ||
                  row["retail price VAT included"] ||
                  row.retail_price_VAT_included ||
                  "0"
              ) || 0,
            supplier:
              row["Supplier name"] ||
              row["supplier name"] ||
              row.supplier_name ||
              "", // Use supplier_name for supplier
            expiryDate:
              row["Expiration date"] ||
              row["expiration date"] ||
              row.expiration_date ||
              row.Expiry ||
              row.expiry ||
              "",

            // Human-readable fields only (skip ID columns)
            supplierCompany: row["supplier_entity_name"] || "",
            store:
              row.Store_1 ||
              row.store_1 ||
              row.STORE_1 ||
              row.Store ||
              row.store ||
              row.STORE ||
              "",
            manufacturer:
              row["Manufacturer name"] ||
              row["manufacturer name"] ||
              row.manufacturer_name ||
              row.Manufacturer ||
              row.manufacturer ||
              "",
            composition:
              row.composition_name ||
              row["Composition name"] ||
              row["composition name"] ||
              row.composition_name ||
              row.COMPOSITION_NAME ||
              row.Composition ||
              row.composition ||
              row.COMPOSITION ||
              "",
            series: row.Series || row.series || row.SERIES || "",
            reservedQuantity:
              parseInt(
                row["Reserved quantity"] ||
                  row["reserved quantity"] ||
                  row.reserved_quantity ||
                  "0"
              ) || 0,
            purchasePriceExclVAT:
              parseFloat(
                row["Purchase price VAT excluded"] ||
                  row["purchase price VAT excluded"] ||
                  row.purchase_price_VAT_excluded ||
                  "0"
              ) || 0,
            vat: parseFloat(row.VAT || row.vat || row.Vat || "0") || 0,
            retailPriceVATIncluded:
              parseFloat(
                row["Retail price VAT included"] ||
                  row["retail price VAT included"] ||
                  row.retail_price_VAT_included ||
                  "0"
              ) || 0,
            divider: row.Divider || row.divider || row.DIVIDER || "",
            dividerCustom:
              row["divider_custom"] ||
              row["Divider custom"] ||
              row["divider custom"] ||
              "",
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
          return (
            row.name &&
            row.name.trim() !== "" &&
            row.stock >= 0 &&
            row.retailPriceVATIncluded > 0
          );
        });

      if (jsonData.length === 0) {
        return res
          .status(400)
          .json({ error: "No valid products found in the Excel file" });
      }

      // Get unique suppliers from imported data (using human-readable names)
      const supplierMap = new Map();
      for (const product of jsonData) {
        if (product.supplier && product.supplier.trim() !== "") {
          const supplierName = product.supplier.trim();
          if (!supplierMap.has(supplierName)) {
            // Find the corresponding supplier entity from the original data
            const originalRow = rawData.find(
              (row) =>
                (row["Supplier name"] ||
                  row["supplier name"] ||
                  row.supplier_name ||
                  "") === supplierName
            );

            supplierMap.set(supplierName, {
              name: supplierName,
              contact: "Imported from Excel",
              address: "Address to be updated",
              email: "",
              company:
                product.supplierCompany ||
                originalRow?.["Supplier entity"] ||
                originalRow?.["supplier entity"] ||
                originalRow?.supplier_entity ||
                "",
              gst: "",
              notes: "",
              productsSupplied: [],
              status: "Active",
            });
          }
        }
      }

      // Create new suppliers if needed and get their IDs
      const suppliersToCreate = [];
      const supplierIdMap = new Map(); // Map supplier name to MongoDB ID

      for (const [supplierName, supplierDetails] of supplierMap) {
        const existingSupplier = await Supplier.findOne({
          name: { $regex: new RegExp(`^${supplierName}$`, "i") },
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
      jsonData.forEach((product) => {
        if (product.supplier && supplierIdMap.has(product.supplier)) {
          product.supplierId = supplierIdMap.get(product.supplier);
        }
      });

      // Check existing products and prepare update/insert operations
      const existingProducts = await Inventory.find({ branchId });
      const productsToUpdate = [];
      const productsToInsert = [];

      for (const importedProduct of jsonData) {
        const existingProduct = existingProducts.find(
          (ep) =>
            ep.name.toLowerCase() === importedProduct.name.toLowerCase() &&
            ep.composition?.toLowerCase() ===
              importedProduct.composition?.toLowerCase() &&
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
            unitPrice: importedProduct.unitPrice || 0,
            pricePerPiece:
              importedProduct.pricePerPiece || importedProduct.unitPrice || 0,
            units: importedProduct.units || "pieces",
            shelfStock: importedProduct.shelfStock || 0,
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
      const importedCategories = [...new Set(jsonData.map((p) => p.category))];
      const totalValue = jsonData.reduce(
        (sum, p) => sum + p.stock * p.retailPriceVATIncluded,
        0
      );
      const totalPurchaseValue = jsonData.reduce(
        (sum, p) => sum + p.stock * p.purchasePriceExclVAT,
        0
      );
      const uniqueSuppliers = [
        ...new Set(jsonData.map((p) => p.supplier).filter(Boolean)),
      ];
      const uniqueManufacturers = [
        ...new Set(jsonData.map((p) => p.manufacturer).filter(Boolean)),
      ];
      const uniqueStores = [
        ...new Set(jsonData.map((p) => p.store).filter(Boolean)),
      ];

      // Calculate stock addition for updated products
      let totalStockAdded = 0;
      if (productsToUpdate.length > 0) {
        totalStockAdded = productsToUpdate.reduce((sum, p) => {
          const originalProduct = existingProducts.find(
            (ep) => ep._id.toString() === p.id
          );
          return sum + (p.stock - (originalProduct?.stock || 0));
        }, 0);
      }

      // Log the bulk operation
      await logBulkOperation(
        req,
        "BULK_UPLOAD",
        `Inventory Import - ${req.file?.originalname || "Unknown File"}`,
        jsonData.length,
        updatedCount + insertedCount,
        0, // No errors in this case
        []
      );

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
          dataEfficiency:
            "ID columns skipped, only human-readable names stored",
        },
      });
    } catch (error) {
      console.error("Excel import error:", error);

      // Log the failed operation
      try {
        await logBulkOperation(
          req,
          "BULK_UPLOAD",
          `Failed Inventory Import - ${
            req.file?.originalname || "Unknown File"
          }`,
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
        details: error.message,
      });
    }
  }
);

// Transaction Routes
router.post("/transaction", authenticate, async (req, res) => {
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

    // Log the transaction creation
    await logTransactionAction(
      req,
      "SALE_CREATED",
      transaction._id,
      `Sale #${transaction.transactionId}`,
      {
        transactionId: transaction.transactionId,
        totalAmount: transaction.totalAmount,
        paymentMethod: transaction.paymentMethod,
        customerName: transaction.customerName,
        itemsCount: transaction.items?.length || 0,
        branchId: transaction.branchId,
      }
    );

    res.status(201).json(transaction);
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "SALE_CREATED",
        "Transaction",
        null,
        "Unknown Sale",
        "Failed to create transaction",
        error,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(400).json({ error: error.message });
  }
});

router.get("/transaction", authenticate, async (req, res) => {
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
        productId: item.productId?._id || item.productId, // Include productId for returns
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

// Return Transaction Route
router.post("/transaction/return", authenticate, async (req, res) => {
  try {
    const {
      transactionId,
      branchId,
      returnItems,
      returnReason,
      returnAmount,
      originalTotal,
      processedBy,
    } = req.body;

    console.log("Return request received:", {
      transactionId,
      branchId,
      returnItems,
      returnReason,
      returnAmount,
      originalTotal,
      processedBy,
    });

    if (
      !transactionId ||
      !branchId ||
      !returnItems ||
      !returnReason ||
      !processedBy
    ) {
      return res.status(400).json({
        error: "Missing required fields",
        received: {
          transactionId,
          branchId,
          returnItems,
          returnReason,
          returnAmount,
          originalTotal,
          processedBy,
        },
        required: [
          "transactionId",
          "branchId",
          "returnItems",
          "returnReason",
          "processedBy",
        ],
      });
    }

    if (!Array.isArray(returnItems) || returnItems.length === 0) {
      return res
        .status(400)
        .json({ error: "returnItems must be a non-empty array" });
    }

    // Validate each return item
    for (const item of returnItems) {
      if (
        !item.name ||
        typeof item.returnQuantity !== "number" ||
        item.returnQuantity < 0
      ) {
        return res.status(400).json({
          error: "Invalid return item data",
          item,
          required: { name: "string", returnQuantity: "number >= 0" },
        });
      }
    }

    // Find the original transaction
    const transaction = await Transaction.findOne({ transactionId });
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Validate that transaction belongs to the specified branch
    if (transaction.branchId.toString() !== branchId) {
      return res
        .status(403)
        .json({ error: "Transaction does not belong to this branch" });
    }

    // Check if transaction is already returned
    if (transaction.status === "Returned") {
      return res.status(400).json({ error: "Transaction is already returned" });
    }

    // Process return items and update inventory
    for (const returnItem of returnItems) {
      if (returnItem.returnQuantity > 0) {
        // Find the product in inventory by name and branch
        let inventoryItem = await Inventory.findOne({
          name: returnItem.name,
          branchId: new mongoose.Types.ObjectId(branchId),
        });

        if (!inventoryItem) {
          // Try to find by name only (in case branchId is not set)
          inventoryItem = await Inventory.findOne({
            name: returnItem.name,
          });
        }

        if (inventoryItem) {
          // Increase stock quantity (reverse the sale)
          inventoryItem.stock += returnItem.returnQuantity;
          await inventoryItem.save();
          console.log(
            `Updated inventory for ${returnItem.name}: +${returnItem.returnQuantity} units (new total: ${inventoryItem.stock})`
          );
        } else {
          console.log(
            `Inventory item not found for product: ${returnItem.name} in branch: ${branchId}`
          );
          // You could optionally create a new inventory item here if needed
          // For now, we'll just log it and continue
        }
      }
    }

    // Update transaction status to "Returned"
    transaction.status = "Returned";
    await transaction.save();

    // Create return record
    const returnRecord = new Return({
      originalTransactionId: transactionId,
      branchId: new mongoose.Types.ObjectId(branchId),
      returnReason,
      returnItems: returnItems
        .filter((item) => item.returnQuantity > 0)
        .map((item) => ({
          productId: item.productId,
          name: item.name,
          originalQuantity: item.originalQuantity,
          returnQuantity: item.returnQuantity,
          price: item.price,
          returnAmount: item.returnQuantity * item.price,
        })),
      totalReturnAmount: returnAmount,
      originalTotalAmount: originalTotal,
      processedBy,
    });

    await returnRecord.save();

    // Count successful inventory updates
    let inventoryUpdates = 0;
    for (const returnItem of returnItems) {
      if (returnItem.returnQuantity > 0) {
        const inventoryItem = await Inventory.findOne({
          name: returnItem.name,
          branchId: new mongoose.Types.ObjectId(branchId),
        });
        if (inventoryItem) inventoryUpdates++;
      }
    }

    res.status(200).json({
      message: "Return processed successfully",
      returnAmount,
      returnedItems: returnItems.filter((item) => item.returnQuantity > 0),
      returnId: returnRecord._id,
      inventoryUpdates,
      totalItems: returnItems.filter((item) => item.returnQuantity > 0).length,
    });
  } catch (error) {
    console.error("Return processing error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get Return History Route
router.get("/returns", authenticate, async (req, res) => {
  try {
    const { branchId } = req.query;
    let query = {};

    // If branchId is provided, filter by it
    if (branchId && branchId !== "all") {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const returns = await Return.find(query)
      .populate("branchId", "name")
      .sort({ returnDate: -1 });

    res.status(200).json(returns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POS Routes
router.post("/pos", authenticate, async (req, res) => {
  try {
    const pos = new POS(req.body);
    await pos.save();
    res.status(201).json(pos);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/pos", authenticate, async (req, res) => {
  try {
    const posRecords = await POS.find();
    res.status(200).json(posRecords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get recent sales
router.get("/sales/recent", authenticate, async (req, res) => {
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

// User Routes (Admin only)
router.post("/user", authenticate, authorize("Admin"), async (req, res) => {
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

    // Log the user creation
    await logUserAction(req, "USER_CREATED", user._id, user.name, {
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    });

    // Return user info without password
    const { password: _, ...userInfo } = user.toObject();
    res.status(201).json(userInfo);
  } catch (error) {
    // Log failed action
    try {
      await logFailedAction(
        req,
        "USER_CREATED",
        "User",
        null,
        req.body.name || "Unknown User",
        "Failed to create user",
        error,
        req.body
      );
    } catch (logError) {
      console.error("Failed to log failed action:", logError);
    }

    res.status(500).json({ error: error.message });
  }
});

router.get("/user", authenticate, async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // Exclude password field
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/user/:id", authenticate, async (req, res) => {
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

router.patch(
  "/user/:id",
  authenticate,
  authorize("Admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { password, ...updateData } = req.body;

      // Get the current user for audit logging
      const currentUser = await User.findById(id);
      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const updateFields = { ...updateData };

      // If password is provided, hash it before updating
      if (password) {
        const bcrypt = await import("bcrypt");
        updateFields.password = await bcrypt.hash(password, 10);
      }

      const user = await User.findByIdAndUpdate(id, updateFields, {
        new: true,
      });

      // Log the action
      await logUserAction(req, "USER_UPDATED", user._id, user.name, {
        previousRole: currentUser.role,
        newRole: user.role,
        previousBranchId: currentUser.branchId,
        newBranchId: user.branchId,
        changes: Object.keys(updateData),
      });

      // Return user info without password
      const { password: _, ...userInfo } = user.toObject();
      res.status(200).json(userInfo);
    } catch (error) {
      // Log failed action
      try {
        await logFailedAction(
          req,
          "USER_UPDATED",
          "User",
          req.params.id,
          "Unknown User",
          "Failed to update user",
          error,
          req.body
        );
      } catch (logError) {
        console.error("Failed to log failed action:", logError);
      }

      res.status(500).json({ error: error.message });
    }
  }
);

router.delete(
  "/user/:id",
  authenticate,
  authorize("Admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get the user before deletion for audit logging
      const userToDelete = await User.findById(id);
      if (!userToDelete) {
        return res.status(404).json({ error: "User not found" });
      }

      await User.findByIdAndDelete(id);

      // Log the action
      await logUserAction(req, "USER_DELETED", id, userToDelete.name, {
        email: userToDelete.email,
        role: userToDelete.role,
        branchId: userToDelete.branchId,
      });

      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      // Log failed action
      try {
        await logFailedAction(
          req,
          "USER_DELETED",
          "User",
          req.params.id,
          "Unknown User",
          "Failed to delete user",
          error,
          {}
        );
      } catch (logError) {
        console.error("Failed to log failed action:", logError);
      }

      res.status(500).json({ error: error.message });
    }
  }
);

// New Invoice Management Routes
// Create new invoice
router.post("/supplier/invoice", authenticate, async (req, res) => {
  try {
    const {
      supplierId,
      store,
      supplier,
      supplierPurchaseInvoiceId,
      issueDate,
      count,
      countOfProductInStock,
      quantity,
      quantityInPackageInStock,
      amountOfProductInStock,
      createdBy,
      createdAt,
      createdAt,
    } = req.body;

    if (
      !supplierId ||
      !store ||
      !supplier ||
      !supplierPurchaseInvoiceId ||
      !issueDate
    ) {
    if (
      !supplierId ||
      !store ||
      !supplier ||
      !supplierPurchaseInvoiceId ||
      !issueDate
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const supplierDoc = await Supplier.findById(supplierId);
    if (!supplierDoc) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    const newInvoice = {
      store,
      supplier,
      supplierPurchaseInvoiceId,
      issueDate,
      count: count || 0,
      countOfProductInStock: countOfProductInStock || 0,
      quantity: quantity || 0,
      quantityInPackageInStock: quantityInPackageInStock || 0,
      amountOfProductInStock: amountOfProductInStock || 0,
      createdBy: createdBy || "Unknown",
      createdBy: createdBy || "Unknown",
      createdAt: createdAt || new Date(),
      fileName: "",
      originalName: "",
      fileName: "",
      originalName: "",
      deliveryDate: issueDate,
      invoiceNumber: supplierPurchaseInvoiceId,
      uploadedAt: new Date(),
      filePath: "",
      filePath: "",
    };

    if (!supplierDoc.invoices) {
      supplierDoc.invoices = [];
    }
    supplierDoc.invoices.push(newInvoice);
    await supplierDoc.save();

    // Log the invoice creation
    await logSupplierAction(
      req,
      "INVOICE_CREATED",
      supplierId,
      supplierDoc.name,
      {
        store,
        supplier,
        supplierPurchaseInvoiceId,
        issueDate,
        amountOfProductInStock: amountOfProductInStock || 0,
      }
    );
    await logSupplierAction(
      req,
      "INVOICE_CREATED",
      supplierId,
      supplierDoc.name,
      {
        store,
        supplier,
        supplierPurchaseInvoiceId,
        issueDate,
        amountOfProductInStock: amountOfProductInStock || 0,
      }
    );

    res.status(201).json(newInvoice);
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update invoice
router.patch("/supplier/invoice/:invoiceId", authenticate, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      "invoices._id": req.params.invoiceId,
    });
    const supplier = await Supplier.findOne({
      "invoices._id": req.params.invoiceId,
    });
    if (!supplier) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const invoice = supplier.invoices.id(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Update invoice fields
    Object.assign(invoice, req.body);
    await supplier.save();

    // Log the invoice update
    await logSupplierAction(
      req,
      "INVOICE_UPDATED",
      supplier._id,
      supplier.name,
      {
        invoiceId: req.params.invoiceId,
        updatedFields: Object.keys(req.body),
      }
    );
    await logSupplierAction(
      req,
      "INVOICE_UPDATED",
      supplier._id,
      supplier.name,
      {
        invoiceId: req.params.invoiceId,
        updatedFields: Object.keys(req.body),
      }
    );

    res.status(200).json(invoice);
  } catch (error) {
    console.error("Update invoice error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete invoice
router.delete(
  "/supplier/invoice/:invoiceId",
  authenticate,
  async (req, res) => {
    try {
      const supplier = await Supplier.findOne({
        "invoices._id": req.params.invoiceId,
      });
      if (!supplier) {
        return res.status(404).json({ error: "Invoice not found" });
      }
router.delete(
  "/supplier/invoice/:invoiceId",
  authenticate,
  async (req, res) => {
    try {
      const supplier = await Supplier.findOne({
        "invoices._id": req.params.invoiceId,
      });
      if (!supplier) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const invoice = supplier.invoices.id(req.params.invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      const invoice = supplier.invoices.id(req.params.invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Log the invoice deletion
      await logSupplierAction(
        req,
        "INVOICE_DELETED",
        supplier._id,
        supplier.name,
        {
          invoiceId: req.params.invoiceId,
          supplierPurchaseInvoiceId: invoice.supplierPurchaseInvoiceId,
        }
      );
      // Log the invoice deletion
      await logSupplierAction(
        req,
        "INVOICE_DELETED",
        supplier._id,
        supplier.name,
        {
          invoiceId: req.params.invoiceId,
          supplierPurchaseInvoiceId: invoice.supplierPurchaseInvoiceId,
        }
      );

      supplier.invoices.pull(req.params.invoiceId);
      await supplier.save();
      supplier.invoices.pull(req.params.invoiceId);
      await supplier.save();

      res.status(200).json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Delete invoice error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);
      res.status(200).json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Delete invoice error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Warehouse routes
router.use("/warehouse", warehouseRoutes);

// Audit routes
router.use("/audit", auditRoutes);

// Report routes
import reportRoutes from "./report.js";
router.use("/report", reportRoutes);

// Stock-taking routes
import stockTakingRoutes from "./stockTaking.js";
router.use("/stock-taking", stockTakingRoutes);

export default router;
