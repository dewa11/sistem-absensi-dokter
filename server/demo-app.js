const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:8000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static files (uploaded photos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// In-memory data store for demo
const users = [
  {
    id: 'admin',
    name: 'Administrator',
    role: 'admin',
    password_hash: '$2b$10$rOzJqQZJqQZJqQZJqQZJqOzJqQZJqQZJqQZJqQZJqQZJqQZJqQZJq' // admin123
  },
  {
    id: '19900101',
    name: 'Dr. John Doe',
    role: 'doctor',
    password_hash: '$2b$10$rOzJqQZJqQZJqQZJqQZJqOzJqQZJqQZJqQZJqQZJqQZJqQZJqQZJq' // doctor123
  }
];

const attendance = [];

// Authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { id, password } = req.body;
    
    const user = users.find(u => u.id === id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // For demo, accept any password that's at least 6 characters
    if (!password || password.length < 6) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'demo_secret',
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role
    }
  });
});

// Doctor routes
app.get('/api/doctor/status', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => 
    a.user_id === req.user.id && 
    a.timestamp.startsWith(today)
  );

  const status = {
    checkin: todayAttendance.find(a => a.type === 'checkin') || null,
    checkout: todayAttendance.find(a => a.type === 'checkout') || null
  };

  res.json({
    success: true,
    data: {
      date: today,
      status
    }
  });
});

app.post('/api/doctor/checkin', authenticateToken, (req, res) => {
  const { latitude, longitude } = req.body;
  
  // Demo: always allow check-in
  const record = {
    id: attendance.length + 1,
    user_id: req.user.id,
    type: 'checkin',
    timestamp: new Date().toISOString(),
    photo_path: 'demo/checkin.jpg',
    location_lat: parseFloat(latitude),
    location_lng: parseFloat(longitude)
  };

  attendance.push(record);

  res.json({
    success: true,
    message: 'Check-in successful',
    data: record
  });
});

app.post('/api/doctor/checkout', authenticateToken, (req, res) => {
  const { latitude, longitude } = req.body;
  
  const record = {
    id: attendance.length + 1,
    user_id: req.user.id,
    type: 'checkout',
    timestamp: new Date().toISOString(),
    photo_path: 'demo/checkout.jpg',
    location_lat: parseFloat(latitude),
    location_lng: parseFloat(longitude)
  };

  attendance.push(record);

  res.json({
    success: true,
    message: 'Check-out successful',
    data: record
  });
});

// Admin routes
app.get('/api/admin/activity', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const recentActivity = attendance
    .map(a => ({
      ...a,
      doctor_name: users.find(u => u.id === a.user_id)?.name || 'Unknown'
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);

  res.json({
    success: true,
    data: recentActivity
  });
});

app.get('/api/admin/doctors', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const doctors = users
    .filter(u => u.role === 'doctor')
    .map(u => ({
      id: u.id,
      name: u.name,
      created_at: new Date().toISOString()
    }));

  res.json({
    success: true,
    data: doctors
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Demo server is running',
    timestamp: new Date().toISOString()
  });
});

// Serve React build files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Demo server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📱 Frontend URL: http://localhost:3000`);
  console.log(`\n📋 Demo Credentials:`);
  console.log(`   Admin: admin / admin123`);
  console.log(`   Doctor: 19900101 / doctor123`);
});

module.exports = app;
