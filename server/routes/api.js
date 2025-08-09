

import express from 'express';
import jwt from 'jsonwebtoken';
import Billing from '../models/Billing.js';
import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import POS from '../models/POS.js';
import User from '../models/User.js';

const router = express.Router();

// JWT secret key
const JWT_SECRET = 'your_jwt_secret_key';

// User Signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const user = new User({ name, email, password, role });
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
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
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Billing Routes
router.post('/billing', async (req, res) => {
    try {
        const billing = new Billing(req.body);
        await billing.save();
        res.status(201).json(billing);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/billing', async (req, res) => {
    try {
        const billings = await Billing.find();
        res.status(200).json(billings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Inventory Routes
router.post('/inventory', async (req, res) => {
    console.log('POST /inventory body:', req.body);     
    try {
        const requiredFields = ['name', 'category', 'stock', 'minStock', 'price', 'supplier', 'expiryDate'];
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
            expiryDate: new Date(req.body.expiryDate)
        };

        // Validate numbers
        if (isNaN(inventoryData.stock) || isNaN(inventoryData.minStock) || isNaN(inventoryData.price)) {
            return res.status(400).json({ error: 'Stock, minStock, and price must be numbers' });
        }
        // Validate date
        if (isNaN(inventoryData.expiryDate.getTime())) {
            return res.status(400).json({ error: 'Invalid expiryDate' });
        }

        console.log('POST /inventory body:', inventoryData);
        const inventory = new Inventory(inventoryData);
        await inventory.save();
        res.status(201).json(inventory);
    } catch (error) {
        console.error('Error in POST /inventory:', error);
        res.status(500).json({ error: error.message });
    }
});
// Update Inventory Item

// Update Inventory Item (moved below router initialization)
router.patch('/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        if (updateData.expiryDate) {
            updateData.expiryDate = new Date(updateData.expiryDate);
        }
        const updated = await Inventory.findByIdAndUpdate(id, updateData, { new: true });
        if (!updated) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }
        res.status(200).json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


// Delete Inventory Item
router.delete('/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Inventory.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }
        res.status(200).json({ message: 'Inventory item deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


router.get('/inventory', async (req, res) => {
    try {
        const inventories = await Inventory.find();
        res.status(200).json(inventories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Transaction Routes
router.post('/transaction', async (req, res) => {
    try {
        const transaction = new Transaction(req.body);
        await transaction.save();
        res.status(201).json(transaction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/transaction', async (req, res) => {
    try {
        const transactions = await Transaction.find();
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POS Routes
router.post('/pos', async (req, res) => {
    try {
        const pos = new POS(req.body);
        await pos.save();
        res.status(201).json(pos);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/pos', async (req, res) => {
    try {
        const posRecords = await POS.find();
        res.status(200).json(posRecords);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
