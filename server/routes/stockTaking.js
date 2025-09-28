import express from "express";
const router = express.Router();
import { authenticate } from "../middleware/auth.js";
import {
  createStockTaking,
  getStockTakingRecords,
  getStockTakingSessions,
  getStockTakingSessionDetails,
} from "../controllers/stockTakingController.js";

// All routes require authentication
router.use(authenticate);

// Create stock-taking records
router.post("/", createStockTaking);

// Get stock-taking records with filters
router.get("/records", getStockTakingRecords);

// Get stock-taking sessions
router.get("/sessions", getStockTakingSessions);

// Get specific session details
router.get("/sessions/:sessionId", getStockTakingSessionDetails);

export default router;
