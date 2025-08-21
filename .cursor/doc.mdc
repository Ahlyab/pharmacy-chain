# Pharmacy Management System - Project Documentation

## Project Overview

The Pharmacy Management System is a full-stack web application designed to manage pharmacy operations across multiple branches. It provides role-based access control with separate dashboards for administrators and branch managers, comprehensive inventory management, POS functionality, and detailed reporting capabilities.

## Technology Stack

### Frontend

- **Framework**: React 18.3.1 with TypeScript 5.5.3
- **Build Tool**: Vite 7.1.1
- **Styling**: Tailwind CSS 3.4.1
- **Routing**: React Router DOM 7.8.0
- **State Management**: React Context API
- **UI Components**: Lucide React (icons)
- **Additional Libraries**:
  - Axios for HTTP requests
  - jsPDF for PDF generation
  - PapaParse for CSV parsing
  - SweetAlert2 for notifications
  - XLSX for Excel file handling

### Backend

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB with Mongoose 8.17.1
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt 6.0.0
- **CORS**: Enabled for cross-origin requests
- **Environment**: dotenv for configuration

## Project Structure

```
pharmacy/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── admin/               # Admin-specific components
│   │   ├── manager/             # Manager-specific components
│   │   └── shared/              # Shared components
│   ├── contexts/                # React contexts
│   ├── config/                  # Configuration files
│   └── data/                    # Data utilities
├── server/                      # Backend source code
│   ├── controllers/             # Route controllers
│   ├── models/                  # Database models
│   ├── routes/                  # API routes
│   └── index.js                 # Server entry point
├── public/                      # Static assets
└── configuration files          # Various config files
```

## Database Models

### 1. User Model

**File**: `server/models/User.js`

```typescript
interface User {
  name: string; // Required
  email: string; // Required, unique
  password: string; // Required, hashed
  role: "Admin" | "Manager"; // Required
  branchId?: string; // Optional, for manager users
}
```

**Features**:

- Password hashing using bcrypt
- Role-based access control
- Branch association for managers

### 2. Inventory Model

**File**: `server/models/Inventory.js`

```typescript
interface Inventory {
  // Core fields
  name: string; // Product name
  category: string; // Product category
  stock: number; // Current stock quantity
  minStock: number; // Minimum stock threshold
  price: number; // Retail price
  supplier: string; // Supplier name
  expiryDate: Date; // Expiration date

  // Extended fields
  store?: string; // Store location
  supplierId?: string; // Supplier ID
  manufacturer?: string; // Manufacturer name
  composition?: string; // Product composition
  sku?: string; // Stock keeping unit
  purchasePriceExclVAT?: number; // Purchase price without VAT
  vat?: number; // VAT percentage
  reservedQuantity?: number; // Reserved stock
}
```

**Features**:

- Comprehensive product information
- Stock level tracking
- Expiry date management
- Supplier and manufacturer details

### 3. Transaction Model

**File**: `server/models/Transaction.js`

```typescript
interface Transaction {
  transactionId: string; // Unique transaction ID
  items: Array<{
    productId: ObjectId; // Reference to Inventory
    quantity: number; // Quantity sold
    price: number; // Unit price
  }>;
  totalAmount: number; // Total transaction amount
  customerName?: string; // Customer name
  cashierName?: string; // Cashier name
  paymentMethod?: string; // Payment method
  date: Date; // Transaction date
}
```

**Features**:

- Multiple items per transaction
- Customer and cashier tracking
- Payment method recording
- Automatic date stamping

### 4. Branch Model

**File**: `server/models/Branch.js`

```typescript
interface Branch {
  name: string; // Branch name
  address: string; // Branch address
  phone: string; // Contact phone
  manager: string; // Manager name
  status: "Active" | "Inactive"; // Branch status
  timestamps: true; // Created/updated timestamps
}
```

**Features**:

- Branch information management
- Status tracking
- Manager association

### 5. Manager Model

**File**: `server/models/Manager.js`

```typescript
interface Manager {
  name: string; // Manager name
  email: string; // Email (unique)
  phone: string; // Contact phone
  branch: string; // Branch name
  status: "Active" | "Inactive"; // Manager status
  timestamps: true; // Created/updated timestamps
}
```

**Features**:

- Manager profile management
- Branch association
- Status tracking

### 6. Billing Model

**File**: `server/models/Billing.js`

- Handles billing information and invoice generation

### 7. POS Model

**File**: `server/models/POS.js`

- Manages point-of-sale operations and records

## API Endpoints

### Authentication Endpoints

#### POST `/api/signup`

- **Purpose**: User registration
- **Body**: `{ name, email, password, role }`
- **Response**: Success message or error

#### POST `/api/login`

- **Purpose**: User authentication
- **Body**: `{ email, password }`
- **Response**: JWT token and user information

#### GET `/api/me`

- **Purpose**: Get current user information
- **Headers**: `Authorization: Bearer <token>`
- **Response**: User details

### Branch Management Endpoints

#### POST `/api/branch`

- **Purpose**: Create new branch
- **Body**: Branch information
- **Response**: Created branch

#### GET `/api/branch`

- **Purpose**: Get all branches
- **Response**: Array of branches

#### PATCH `/api/branch/:id`

- **Purpose**: Update branch
- **Body**: Updated branch information
- **Response**: Updated branch

#### DELETE `/api/branch/:id`

- **Purpose**: Delete branch
- **Response**: Success message

### Manager Management Endpoints

#### POST `/api/manager`

- **Purpose**: Create new manager
- **Body**: `{ name, email, phone, branch, branchId, status, password }`
- **Response**: Created manager

#### GET `/api/manager`

- **Purpose**: Get all managers
- **Response**: Array of managers

#### PATCH `/api/manager/:id`

- **Purpose**: Update manager
- **Body**: Updated manager information
- **Response**: Updated manager

#### DELETE `/api/manager/:id`

- **Purpose**: Delete manager
- **Response**: Success message

### Inventory Management Endpoints

#### POST `/api/inventory`

- **Purpose**: Add new inventory item
- **Body**: Inventory item data
- **Response**: Created inventory item

#### GET `/api/inventory`

- **Purpose**: Get all inventory items
- **Response**: Array of inventory items

#### PATCH `/api/inventory/:id`

- **Purpose**: Update inventory item
- **Body**: Updated inventory data
- **Response**: Updated inventory item

#### DELETE `/api/inventory/:id`

- **Purpose**: Delete inventory item
- **Response**: Success message

### Transaction Endpoints

#### POST `/api/transaction`

- **Purpose**: Create new transaction
- **Body**: Transaction data
- **Response**: Created transaction

#### GET `/api/transaction`

- **Purpose**: Get all transactions
- **Response**: Array of transactions with populated product details

#### GET `/api/sales/recent`

- **Purpose**: Get recent sales (last 10)
- **Response**: Array of recent transactions

### POS Endpoints

#### POST `/api/pos`

- **Purpose**: Create POS record
- **Body**: POS data
- **Response**: Created POS record

#### GET `/api/pos`

- **Purpose**: Get all POS records
- **Response**: Array of POS records

### Health Check

#### GET `/api/health`

- **Purpose**: System health check
- **Response**: System status, database connection, uptime

## Frontend Components

### Admin Components

- **AdminDashboard**: Main admin interface
- **BranchManagement**: Branch CRUD operations
- **ManagerManagement**: Manager CRUD operations
- **InventoryOverview**: System-wide inventory view
- **TransactionHistory**: All transaction records
- **Dashboard**: Admin analytics and overview

### Manager Components

- **ManagerDashboard**: Main manager interface
- **InventoryManagement**: Branch inventory management
- **AddStock**: Add new inventory items
- **POS**: Point of sale interface
- **NewSale**: Create new sales transaction
- **Billing**: Generate bills and invoices
- **StockAlerts**: Low stock notifications
- **Transactions**: Branch transaction history
- **ViewReports**: Generate and view reports

### Shared Components

- **Header**: Navigation header
- **Sidebar**: Navigation sidebar
- **Login**: Authentication form
- **Signup**: Registration form
- **Spinner**: Loading indicator
- **GreenProgressBar**: Progress visualization

## Authentication & Authorization

### JWT Implementation

- **Secret**: Configurable JWT secret key
- **Expiration**: 1 hour token validity
- **Storage**: Local storage for client-side persistence

### Role-Based Access Control

- **Admin Role**: Full system access, branch and manager management
- **Manager Role**: Branch-specific access, inventory and sales management

### Security Features

- Password hashing with bcrypt
- JWT token validation
- Protected route middleware
- Input validation and sanitization

## Key Features

### 1. Multi-Branch Management

- Create, update, and delete branches
- Assign managers to branches
- Branch status tracking

### 2. Inventory Management

- Comprehensive product catalog
- Stock level monitoring
- Expiry date tracking
- Low stock alerts
- Supplier information

### 3. Point of Sale (POS)

- Quick product search
- Multiple payment methods
- Receipt generation
- Customer information tracking

### 4. Transaction Management

- Complete sales records
- Customer history
- Payment method tracking
- Cashier accountability

### 5. Reporting & Analytics

- Sales reports
- Inventory reports
- Transaction history
- Export capabilities (PDF, CSV, Excel)

### 6. User Management

- Role-based access control
- Secure authentication
- User profile management

## Environment Configuration

### Development

```bash
VITE_REACT_APP_ENV=development
VITE_API_URL=http://localhost:5000
```

### Production

```bash
VITE_REACT_APP_ENV=production
VITE_API_URL=https://your-production-api.com
```

## Database Configuration

### MongoDB Connection

- **URI**: Configurable via environment variables
- **Options**: Production-ready connection settings
- **Connection Pool**: Min 2, Max 10 connections
- **Timeouts**: 30-45 second connection timeouts
- **Retry Logic**: Automatic reconnection

### Connection Events

- Connection monitoring
- Error handling
- Graceful shutdown
- Health check integration

## Development Scripts

### Frontend

```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint checking
```

### Backend

```bash
npm run server       # Development server with nodemon
npm run start        # Production server
```

### Full Stack

```bash
npm run dev          # Frontend development
npm run server       # Backend development
```

## Deployment

### Frontend

- Vite build system
- Static file hosting
- Environment-specific builds

### Backend

- Node.js runtime
- MongoDB Atlas support
- Vercel deployment ready
- Environment variable configuration

## Error Handling

### Global Error Handler

- MongoDB connection errors
- Validation errors
- Generic error handling
- Development vs production error details

### Frontend Error Handling

- Authentication errors
- API request failures
- Form validation
- User-friendly error messages

## Performance Features

### Database Optimization

- Connection pooling
- Indexed queries
- Efficient data population
- Query optimization

### Frontend Optimization

- Code splitting
- Lazy loading
- Efficient state management
- Optimized builds

## Security Considerations

### Backend Security

- JWT token validation
- Password hashing
- Input validation
- CORS configuration
- Environment variable protection

### Frontend Security

- Secure token storage
- Route protection
- Input sanitization
- HTTPS enforcement

## Monitoring & Health Checks

### System Health

- Database connection status
- Server uptime monitoring
- API endpoint health
- Error logging and tracking

### Performance Monitoring

- Response time tracking
- Database query performance
- Memory usage monitoring
- Connection pool status

## Future Enhancements

### Potential Features

- Real-time notifications
- Advanced analytics dashboard
- Mobile application
- API rate limiting
- Advanced reporting
- Multi-language support
- Audit logging
- Backup and recovery

### Technical Improvements

- GraphQL implementation
- Microservices architecture
- Redis caching
- Message queuing
- Advanced search functionality
- Real-time collaboration

## Troubleshooting

### Common Issues

1. **Database Connection**: Check MongoDB URI and network connectivity
2. **Authentication**: Verify JWT secret and token expiration
3. **CORS**: Ensure proper CORS configuration for cross-origin requests
4. **Environment Variables**: Verify all required environment variables are set

### Debug Mode

- Enable detailed error logging in development
- Database query logging
- Request/response logging
- Performance monitoring

---

This documentation provides a comprehensive overview of the Pharmacy Management System. For specific implementation details, refer to the individual source files and their inline documentation.
