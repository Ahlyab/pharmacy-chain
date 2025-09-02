
import express from 'express';
import * as warehouseController from '../controllers/warehouseController.js';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.get('/stock', authenticate, warehouseController.getStock);
router.post('/stock', authenticate, warehouseController.addStock);
router.post('/transfer', authenticate, warehouseController.transferStock);
router.post('/import-excel', authenticate, upload.single('file'), warehouseController.importExcel);

export default router;
