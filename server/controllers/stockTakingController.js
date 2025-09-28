import StockTaking from "../models/StockTaking.js";
import Inventory from "../models/Inventory.js";
import { logCustomAction } from "../utils/auditLogger.js";
import mongoose from "mongoose";

// Create stock-taking records
const createStockTaking = async (req, res) => {
  try {
    const { records } = req.body;
    const userId = req.user.id;
    const branchId = req.user.branchId;
    const sessionId = `stock-taking-${Date.now()}-${userId}`;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Stock-taking records are required",
      });
    }

    // Validate each record
    for (const record of records) {
      if (!record.productId || !record.actualStock || !record.status) {
        return res.status(400).json({
          success: false,
          message: "Each record must have productId, actualStock, and status",
        });
      }

      if (
        !["IN_STOCK", "MISSING", "PART", "SHRINKAGE"].includes(record.status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Must be one of: IN_STOCK, MISSING, PART, SHRINKAGE",
        });
      }
    }

    // Create stock-taking records
    const stockTakingRecords = records.map((record) => ({
      ...record,
      recordedBy: userId,
      branchId: branchId,
      sessionId: sessionId,
      recordedAt: new Date(),
    }));

    const createdRecords = await StockTaking.insertMany(stockTakingRecords);

    // Update inventory stock for IN_STOCK items
    for (const record of records) {
      if (record.status === "IN_STOCK") {
        await Inventory.findByIdAndUpdate(
          record.productId,
          { stock: record.actualStock },
          { new: true }
        );
      }
    }

    // Log audit trail
    await logCustomAction(
      req,
      "STOCK_TAKING_CREATED",
      "StockTaking",
      sessionId,
      `Stock Taking Session ${sessionId}`,
      `Created stock-taking session with ${records.length} records`,
      {
        recordsCount: records.length,
        sessionId: sessionId,
      }
    );

    res.status(201).json({
      success: true,
      message: "Stock-taking records created successfully",
      data: {
        sessionId: sessionId,
        recordsCount: createdRecords.length,
        records: createdRecords,
      },
    });
  } catch (error) {
    console.error("Error creating stock-taking records:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get stock-taking records
const getStockTakingRecords = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sessionId,
      productId,
      status,
      startDate,
      endDate,
    } = req.query;
    const branchId = req.user.branchId;
    const userId = req.user.id;

    // Build query
    const query = { branchId };

    if (sessionId) query.sessionId = sessionId;
    if (productId) query.productId = productId;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.recordedAt = {};
      if (startDate) query.recordedAt.$gte = new Date(startDate);
      if (endDate) query.recordedAt.$lte = new Date(endDate);
    }

    // Get records with pagination
    const records = await StockTaking.find(query)
      .populate("productId", "name manufacturer composition")
      .populate("recordedBy", "name email")
      .populate("branchId", "name")
      .sort({ recordedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StockTaking.countDocuments(query);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching stock-taking records:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get stock-taking sessions
const getStockTakingSessions = async (req, res) => {
  try {
    const branchId = req.user.branchId;
    const { page = 1, limit = 20 } = req.query;

    // Get unique sessions with summary data
    const sessions = await StockTaking.aggregate([
      { $match: { branchId: mongoose.Types.ObjectId(branchId) } },
      {
        $group: {
          _id: "$sessionId",
          recordedAt: { $max: "$recordedAt" },
          recordedBy: { $first: "$recordedBy" },
          totalRecords: { $sum: 1 },
          statusCounts: {
            $push: "$status",
          },
        },
      },
      {
        $addFields: {
          inStockCount: {
            $size: {
              $filter: {
                input: "$statusCounts",
                cond: { $eq: ["$$this", "IN_STOCK"] },
              },
            },
          },
          missingCount: {
            $size: {
              $filter: {
                input: "$statusCounts",
                cond: { $eq: ["$$this", "MISSING"] },
              },
            },
          },
          partCount: {
            $size: {
              $filter: {
                input: "$statusCounts",
                cond: { $eq: ["$$this", "PART"] },
              },
            },
          },
          shrinkageCount: {
            $size: {
              $filter: {
                input: "$statusCounts",
                cond: { $eq: ["$$this", "SHRINKAGE"] },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "recordedBy",
          foreignField: "_id",
          as: "recordedByUser",
        },
      },
      {
        $addFields: {
          recordedByName: { $arrayElemAt: ["$recordedByUser.name", 0] },
        },
      },
      {
        $project: {
          sessionId: "$_id",
          recordedAt: 1,
          recordedByName: 1,
          totalRecords: 1,
          inStockCount: 1,
          missingCount: 1,
          partCount: 1,
          shrinkageCount: 1,
        },
      },
      { $sort: { recordedAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 },
    ]);

    const total = await StockTaking.distinct("sessionId", { branchId }).then(
      (sessions) => sessions.length
    );

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching stock-taking sessions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get stock-taking session details
const getStockTakingSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const branchId = req.user.branchId;

    const records = await StockTaking.find({ sessionId, branchId })
      .populate("productId", "name manufacturer composition stock")
      .populate("recordedBy", "name email")
      .sort({ recordedAt: 1 });

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Stock-taking session not found",
      });
    }

    res.json({
      success: true,
      data: {
        sessionId,
        records,
        summary: {
          totalRecords: records.length,
          inStockCount: records.filter((r) => r.status === "IN_STOCK").length,
          missingCount: records.filter((r) => r.status === "MISSING").length,
          partCount: records.filter((r) => r.status === "PART").length,
          shrinkageCount: records.filter((r) => r.status === "SHRINKAGE")
            .length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching stock-taking session details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export {
  createStockTaking,
  getStockTakingRecords,
  getStockTakingSessions,
  getStockTakingSessionDetails,
};
