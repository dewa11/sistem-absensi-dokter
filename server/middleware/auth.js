const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to verify JWT token from cookies
const authenticateToken = (req, res, next) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }
    
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

// Middleware to check if user is doctor
const requireDoctor = (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Doctor privileges required.' 
    });
  }
  next();
};

// Middleware to allow both admin and doctor
const requireAuth = (req, res, next) => {
  if (!req.user || !['admin', 'doctor'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Authentication required.' 
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireDoctor,
  requireAuth
};
