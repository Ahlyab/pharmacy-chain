import express from 'express';
const router = express.Router();
import { getRevenueProfitReport, getStockExpirationReport, getStockTurnoverReport, getBranches } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

// Apply authentication middleware to all routes
router.use(authenticate);

// Get revenue and profit report
router.get('/revenue-profit', getRevenueProfitReport);

// Get stock and expiration date report
router.get('/stock-expiration', getStockExpirationReport);

// Get stock turnover report
router.get('/stock-turnover', getStockTurnoverReport);

// Get branches for filter
router.get('/branches', getBranches);

export default router;
