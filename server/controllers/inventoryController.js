import Inventory from "../models/Inventory.js";
import { logInventoryAction, logBulkOperation } from "../utils/auditLogger.js";
import mongoose from "mongoose";

/**
 * Inventory Controller with Audit Logging
 * Demonstrates how to integrate audit logging with inventory operations
 */

// Create new inventory item
export const createInventoryItem = async (req, res) => {
  try {
    const inventoryData = req.body;

    // Create the inventory item
    const inventory = new Inventory(inventoryData);
    await inventory.save();

    // Populate supplier and branch information
    const populatedInventory = await Inventory.findById(inventory._id)
      .populate("supplierId", "name company contact email address gst status")
      .populate("branchId", "name");

    // Log the action
    await logInventoryAction(
      req,
      "PRODUCT_CREATED",
      inventory._id,
      inventory.name,
      {
        category: inventory.category,
        stock: inventory.stock,
        price: inventory.price,
        supplier: inventory.supplier,
        expiryDate: inventory.expiryDate,
        branchId: inventory.branchId,
      }
    );

    res.status(201).json(populatedInventory);
  } catch (error) {
    console.error("Error creating inventory item:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update inventory item
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Get the current inventory item to compare changes
    const currentInventory = await Inventory.findById(id);
    if (!currentInventory) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    // Process date and ObjectId fields
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

    // Update the inventory item
    const updated = await Inventory.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    // Populate supplier and branch information
    const populatedInventory = await Inventory.findById(id)
      .populate("supplierId", "name company contact email address gst status")
      .populate("branchId", "name");

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
        previousPrice: currentInventory.price,
        newPrice: updated.price,
        previousExpiry: currentInventory.expiryDate,
        newExpiry: updated.expiryDate,
        changes: Object.keys(updateData),
      }
    );

    res.status(200).json(populatedInventory);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(400).json({ error: error.message });
  }
};

// Delete inventory item
export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the inventory item before deletion for logging
    const inventoryToDelete = await Inventory.findById(id);
    if (!inventoryToDelete) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    // Delete the inventory item
    const deleted = await Inventory.findByIdAndDelete(id);

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
    console.error("Error deleting inventory item:", error);
    res.status(400).json({ error: error.message });
  }
};

// Bulk import inventory from Excel
export const bulkImportInventory = async (req, res) => {
  try {
    const { branchId, products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: "Products must be an array" });
    }

    if (!branchId) {
      return res.status(400).json({ error: "branchId is required" });
    }

    // Process the products data
    const inventoryData = products.map((product) => ({
      name: product.name || product.Product || "",
      category: product.category || product.Composition || "",
      stock: Number(product.stock || product.Quantity || 0),
      minStock: Number(product.minStock || 0),
      price: Number(product.price || product["Retail price VAT included"] || 0),
      unitPrice: Number(product.unitPrice || product["Unit Price"] || 0),
      units: product.units || product.Units || "pieces",
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

    // Insert the products
    const result = await Inventory.insertMany(inventoryData);

    console.log(
      `Successfully imported ${result.length} products for branch: ${branchId}`
    );

    // Log the bulk operation
    await logBulkOperation(
      req,
      "BULK_UPLOAD",
      `Inventory Import - ${new Date().toISOString()}`,
      inventoryData.length,
      result.length,
      0, // No errors in this case
      []
    );

    res.status(201).json({
      message: `Imported ${result.length} products to branch`,
      products: result,
      branchId: branchId,
    });
  } catch (error) {
    console.error("Error in inventory import:", error);

    // Log the failed operation
    try {
      await logBulkOperation(
        req,
        "BULK_UPLOAD",
        `Failed Inventory Import - ${new Date().toISOString()}`,
        0,
        0,
        1,
        [error.message]
      );
    } catch (logError) {
      console.error("Failed to log failed bulk operation:", logError);
    }

    res.status(500).json({
      error: error.message,
      details: "Failed to import products to database",
    });
  }
};

// Get inventory with optional filtering
export const getInventory = async (req, res) => {
  try {
    const { branchId, category, supplier, search } = req.query;
    let query = {};

    // Apply filters
    if (branchId && branchId !== "all") {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    }

    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    if (supplier) {
      query.supplier = { $regex: supplier, $options: "i" };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { supplier: { $regex: search, $options: "i" } },
      ];
    }

    const inventories = await Inventory.find(query)
      .populate("branchId", "name")
      .populate("supplierId", "name company contact email address gst status");

    res.status(200).json(inventories);
  } catch (error) {
    console.error("Error getting inventory:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all inventory across branches for warehouse management
export const getAllInventoryAcrossBranches = async (req, res) => {
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
};

// Transfer inventory between branches
export const transferInventoryBetweenBranches = async (req, res) => {
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
        store: sourceInventory.store,
        manufacturer: sourceInventory.manufacturer,
        composition: sourceInventory.composition,
        series: sourceInventory.series,
        reservedQuantity: sourceInventory.reservedQuantity,
        purchasePriceExclVAT: sourceInventory.purchasePriceExclVAT,
        vat: sourceInventory.vat,
        retailPriceVATIncluded: sourceInventory.retailPriceVATIncluded,
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
};

// Get inventory statistics
export const getInventoryStats = async (req, res) => {
  try {
    const { branchId } = req.query;
    let matchStage = {};

    if (branchId && branchId !== "all") {
      matchStage.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const stats = await Inventory.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          totalValue: { $sum: { $multiply: ["$stock", "$price"] } },
          lowStockItems: {
            $sum: {
              $cond: [{ $lte: ["$stock", "$minStock"] }, 1, 0],
            },
          },
          expiringItems: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$expiryDate", new Date()] },
                    {
                      $lte: [
                        "$expiryDate",
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const categoryStats = await Inventory.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          totalValue: { $sum: { $multiply: ["$stock", "$price"] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const supplierStats = await Inventory.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$supplier",
          count: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          totalValue: { $sum: { $multiply: ["$stock", "$price"] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      summary: stats[0] || {
        totalProducts: 0,
        totalStock: 0,
        totalValue: 0,
        lowStockItems: 0,
        expiringItems: 0,
      },
      categoryStats,
      supplierStats,
    });
  } catch (error) {
    console.error("Error getting inventory stats:", error);
    res.status(500).json({ error: error.message });
  }
};
