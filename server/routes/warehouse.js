
import express from 'express';
import * as warehouseController from '../controllers/warehouseController.js';

const router = express.Router();
router.get('/stock', warehouseController.getStock);
router.post('/stock', warehouseController.addStock);
router.post('/transfer', warehouseController.transferStock);

export default router;
