import jwt from "jsonwebtoken";
import User from "../models/User.js";

// JWT secret key - use environment variable or fallback to default
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header and adds user info to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "No token provided or invalid format. Use 'Bearer <token>' format." 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "No token provided" 
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists in database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "User not found or token is invalid" 
      });
    }

    // Add user information to request object
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId
    };
    
    console.log("Authenticated user:", req.user);

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Invalid token" 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Token has expired" 
      });
    }
    
    return res.status(500).json({ 
      error: "Internal server error", 
      message: "Authentication failed" 
    });
  }
};

/**
 * Role-based authorization middleware
 * Checks if user has required role(s)
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Authentication required" 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: `Access denied. Required role(s): ${roles.join(', ')}` 
      });
    }

    next();
  };
};

/**
 * Branch-based authorization middleware
 * Checks if user has access to the specified branch
 */
export const authorizeBranch = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Authentication required" 
    });
  }

  // Admin users can access all branches
  if (req.user.role === 'Admin') {
    return next();
  }

  // For other users, check if they have access to the requested branch
  const requestedBranchId = req.params.branchId || req.query.branchId || req.body.branchId;
  
  if (requestedBranchId && req.user.branchId && req.user.branchId.toString() !== requestedBranchId) {
    return res.status(403).json({ 
      error: "Forbidden", 
      message: "Access denied. You can only access your assigned branch." 
    });
  }

  next();
};

export default {
  authenticate,
  authorize,
  authorizeBranch
};
