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

// Get current user info from token
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
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
        // Populate productId to get product name if needed
        const transactions = await Transaction.find().populate('items.productId');
        // Map backend fields to frontend expected fields
        const mapped = transactions.map(t => ({
            id: t.transactionId,
            date: t.date,
            customer: t.customerName || '',
            items: t.items.map(item => ({
                name: item.productId?.name || '',
                quantity: item.quantity,
                price: item.price
            })),
            total: t.totalAmount,
            paymentMethod: t.paymentMethod || 'N/A',
            status: t.status || 'Completed'
        }));
        res.status(200).json(mapped);
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


// get recent sales
/**
 * [
    {
        "_id": "689b95a9c6b9ec713585dac4",
        "transactionId": "TXN1755026857866",
        "items": [
            {
                "productId": "68986203d34b42afbb8a99e6",
                "quantity": 1,
                "price": 2,
                "_id": "689b95a9c6b9ec713585dac5"
            },
            {
                "productId": "6898622ad34b42afbb8a99e8",
                "quantity": 1,
                "price": 8,
                "_id": "689b95a9c6b9ec713585dac6"
            },
            {
                "productId": "689862bbd34b42afbb8a99ec",
                "quantity": 1,
                "price": 1,
                "_id": "689b95a9c6b9ec713585dac7"
            }
        ],
        "totalAmount": 11,
        "customerName": "Usman",
        "cashierName": "Arslan",
        "paymentMethod": "cash",
        "date": "2025-08-12T19:27:37.866Z",
        "__v": 0
    },
    {
        "_id": "689b1177f951fd5b2ca23017",
        "transactionId": "TXN1754993015445",
        "items": [
            {
                "productId": "68986203d34b42afbb8a99e6",
                "quantity": 1,
                "price": 2,
                "_id": "689b1177f951fd5b2ca23018"
            }
        ],
        "totalAmount": 2,
        "customerName": "Ahlyab Asad",
        "cashierName": "Arslan",
        "paymentMethod": "cash",
        "date": "2025-08-12T10:03:35.445Z",
        "__v": 0
    },
    {
        "_id": "6899f131831b144770d4a83f",
        "transactionId": "TXN1754919217590",
        "items": [
            {
                "productId": "6898622ad34b42afbb8a99e8",
                "quantity": 2,
                "price": 8,
                "_id": "6899f131831b144770d4a840"
            },
            {
                "productId": "6898627bd34b42afbb8a99ea",
                "quantity": 1,
                "price": 4,
                "_id": "6899f131831b144770d4a841"
            },
            {
                "productId": "689862bbd34b42afbb8a99ec",
                "quantity": 1,
                "price": 1,
                "_id": "6899f131831b144770d4a842"
            },
            {
                "productId": "68986203d34b42afbb8a99e6",
                "quantity": 1,
                "price": 2,
                "_id": "6899f131831b144770d4a843"
            }
        ],
        "totalAmount": 23,
        "paymentMethod": "cash",
        "date": "2025-08-11T13:33:37.591Z",
        "__v": 0
    },
    {
        "_id": "6899094757e3a1a7453c20e7",
        "transactionId": "TXN1754859847597",
        "items": [
            {
                "productId": "68986203d34b42afbb8a99e6",
                "quantity": 1,
                "price": 2,
                "_id": "6899094757e3a1a7453c20e8"
            },
            {
                "productId": "689862bbd34b42afbb8a99ec",
                "quantity": 1,
                "price": 1,
                "_id": "6899094757e3a1a7453c20e9"
            }
        ],
        "totalAmount": 3,
        "paymentMethod": "cash",
        "date": "2025-08-10T21:04:07.597Z",
        "__v": 0
    },
    {
        "_id": "689906a557e3a1a7453c20dc",
        "transactionId": "TXN1754859173190",
        "items": [
            {
                "productId": "6898622ad34b42afbb8a99e8",
                "quantity": 4,
                "price": 8,
                "_id": "689906a557e3a1a7453c20dd"
            },
            {
                "productId": "689862bbd34b42afbb8a99ec",
                "quantity": 1,
                "price": 1,
                "_id": "689906a557e3a1a7453c20de"
            },
            {
                "productId": "6898627bd34b42afbb8a99ea",
                "quantity": 1,
                "price": 4,
                "_id": "689906a557e3a1a7453c20df"
            }
        ],
        "totalAmount": 37,
        "customerName": "customer tester",
        "paymentMethod": "cash",
        "date": "2025-08-10T20:52:53.190Z",
        "__v": 0
    },
    {
        "_id": "6898f635f1b3b772952c9632",
        "transactionId": "TXN1754854965836",
        "items": [
            {
                "productId": "689864c0fd782f5852a48fef",
                "quantity": 1,
                "price": 6,
                "_id": "6898f635f1b3b772952c9633"
            }
        ],
        "totalAmount": 6,
        "customerName": "Fahad",
        "cashierName": "Arslan",
        "paymentMethod": "card",
        "date": "2025-08-10T19:42:45.836Z",
        "__v": 0
    },
    {
        "_id": "6898f60cf1b3b772952c95d2",
        "transactionId": "TXN1754854924775",
        "items": [
            {
                "productId": "68986203d34b42afbb8a99e6",
                "quantity": 1,
                "price": 2,
                "_id": "6898f60cf1b3b772952c95d3"
            }
        ],
        "totalAmount": 2,
        "customerName": "Sulayman",
        "cashierName": "Arslan",
        "paymentMethod": "cash",
        "date": "2025-08-10T19:42:04.775Z",
        "__v": 0
    },
    {
        "_id": "6898f5b9ad5bd578eae15e36",
        "transactionId": "TXN1754854841777",
        "items": [
            {
                "productId": "6898627bd34b42afbb8a99ea",
                "quantity": 1,
                "price": 4,
                "_id": "6898f5b9ad5bd578eae15e37"
            }
        ],
        "totalAmount": 4,
        "customerName": "Ghulam Mustfa",
        "cashierName": "Arslan",
        "date": "2025-08-10T19:40:41.777Z",
        "__v": 0
    },
    {
        "_id": "6898f55bad5bd578eae15ddf",
        "transactionId": "TXN1754854747175",
        "items": [
            {
                "productId": "689862bbd34b42afbb8a99ec",
                "quantity": 1,
                "price": 1,
                "_id": "6898f55bad5bd578eae15de0"
            },
            {
                "productId": "6898622ad34b42afbb8a99e8",
                "quantity": 1,
                "price": 8,
                "_id": "6898f55bad5bd578eae15de1"
            }
        ],
        "totalAmount": 9,
        "customerName": "Fazeel Ahmad",
        "cashierName": "Arslan",
        "date": "2025-08-10T19:39:07.176Z",
        "__v": 0
    },
    {
        "_id": "6898eaca7bec02d1b3fc58c1",
        "transactionId": "TXN1754852041985",
        "items": [
            {
                "productId": "689862bbd34b42afbb8a99ec",
                "quantity": 1,
                "price": 1,
                "_id": "6898eaca7bec02d1b3fc58c2"
            },
            {
                "productId": "689864c0fd782f5852a48fef",
                "quantity": 1,
                "price": 6,
                "_id": "6898eaca7bec02d1b3fc58c3"
            }
        ],
        "totalAmount": 7,
        "customerName": "ppppp",
        "cashierName": "Arslan",
        "date": "2025-08-10T18:54:01.985Z",
        "__v": 0
    }
]
 */
router.get('/sales/recent', async (req, res) => {
    try {
        // populate productId to get product name
        const recentSales = await Transaction.find().sort({ date: -1 }).limit(10).populate('items.productId');
        // map backend fields to frontend expected fields
        const mapped = recentSales.map(s => ({
            id: s.transactionId,
            date: s.date,
            customer: s.customerName || '',
        }));
        res.status(200).json(recentSales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
export default router;
