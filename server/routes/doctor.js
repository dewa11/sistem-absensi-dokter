const express = require('express');
const multer = require('multer');
const path = require('path');
const { pool } = require('../config/db');
const { authenticateToken, requireDoctor } = require('../middleware/auth');
const { isWithinGeofence, validateCoordinates } = require('../utils/geofence');
const router = express.Router();

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/attendance/'));
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const userId = req.user.id;
    const type = req.body.type || 'attendance';
    cb(null, `${userId}_${type}_${timestamp}.jpg`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Apply authentication and doctor middleware to all routes
router.use(authenticateToken);
router.use(requireDoctor);

// GET /doctor/status - Get today's attendance status
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const [rows] = await pool.execute(`
      SELECT type, timestamp, photo_path
      FROM attendance 
      WHERE user_id = ? AND DATE(timestamp) = ?
      ORDER BY timestamp ASC
    `, [userId, today]);

    const status = {
      checkin: null,
      checkout: null
    };

    rows.forEach(record => {
      if (record.type === 'checkin' && !status.checkin) {
        status.checkin = {
          timestamp: record.timestamp,
          photo_path: record.photo_path
        };
      } else if (record.type === 'checkout' && !status.checkout) {
        status.checkout = {
          timestamp: record.timestamp,
          photo_path: record.photo_path
        };
      }
    });

    res.json({
      success: true,
      data: {
        date: today,
        status
      }
    });

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /doctor/checkin - Check in
router.post('/checkin', upload.single('photo'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude } = req.body;

    // Validate coordinates
    const coordValidation = validateCoordinates(latitude, longitude);
    if (!coordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: coordValidation.message
      });
    }

    // Check if photo was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Photo is required for check-in'
      });
    }

    // Check geofence
    const geofenceResult = isWithinGeofence(coordValidation.lat, coordValidation.lng);
    if (!geofenceResult.isWithin) {
      return res.status(403).json({
        success: false,
        message: `You are outside the authorized location. You are ${geofenceResult.distance}m away (maximum allowed: ${geofenceResult.maxDistance}m)`,
        geofence: geofenceResult
      });
    }

    // Check if already checked in today
    const today = new Date().toISOString().split('T')[0];
    const [existingCheckin] = await pool.execute(`
      SELECT id FROM attendance 
      WHERE user_id = ? AND type = 'checkin' AND DATE(timestamp) = ?
    `, [userId, today]);

    if (existingCheckin.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already checked in today'
      });
    }

    // Record check-in
    const timestamp = new Date();
    const photoPath = `uploads/attendance/${req.file.filename}`;

    await pool.execute(`
      INSERT INTO attendance (user_id, type, timestamp, photo_path, location_lat, location_lng)
      VALUES (?, 'checkin', ?, ?, ?, ?)
    `, [userId, timestamp, photoPath, coordValidation.lat, coordValidation.lng]);

    res.json({
      success: true,
      message: 'Check-in successful',
      data: {
        timestamp,
        photo_path: photoPath,
        location: {
          lat: coordValidation.lat,
          lng: coordValidation.lng
        },
        geofence: geofenceResult
      }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /doctor/checkout - Check out
router.post('/checkout', upload.single('photo'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude } = req.body;

    // Validate coordinates
    const coordValidation = validateCoordinates(latitude, longitude);
    if (!coordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: coordValidation.message
      });
    }

    // Check if photo was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Photo is required for check-out'
      });
    }

    // Check geofence
    const geofenceResult = isWithinGeofence(coordValidation.lat, coordValidation.lng);
    if (!geofenceResult.isWithin) {
      return res.status(403).json({
        success: false,
        message: `You are outside the authorized location. You are ${geofenceResult.distance}m away (maximum allowed: ${geofenceResult.maxDistance}m)`,
        geofence: geofenceResult
      });
    }

    // Check if checked in today
    const today = new Date().toISOString().split('T')[0];
    const [existingCheckin] = await pool.execute(`
      SELECT id FROM attendance 
      WHERE user_id = ? AND type = 'checkin' AND DATE(timestamp) = ?
    `, [userId, today]);

    if (existingCheckin.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'You must check in before checking out'
      });
    }

    // Check if already checked out today
    const [existingCheckout] = await pool.execute(`
      SELECT id FROM attendance 
      WHERE user_id = ? AND type = 'checkout' AND DATE(timestamp) = ?
    `, [userId, today]);

    if (existingCheckout.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already checked out today'
      });
    }

    // Record check-out
    const timestamp = new Date();
    const photoPath = `uploads/attendance/${req.file.filename}`;

    await pool.execute(`
      INSERT INTO attendance (user_id, type, timestamp, photo_path, location_lat, location_lng)
      VALUES (?, 'checkout', ?, ?, ?, ?)
    `, [userId, timestamp, photoPath, coordValidation.lat, coordValidation.lng]);

    res.json({
      success: true,
      message: 'Check-out successful',
      data: {
        timestamp,
        photo_path: photoPath,
        location: {
          lat: coordValidation.lat,
          lng: coordValidation.lng
        },
        geofence: geofenceResult
      }
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /doctor/history - Get doctor's attendance history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM attendance 
      WHERE user_id = ?
    `, [userId]);

    const total = countResult[0].total;

    // Get paginated results
    const [rows] = await pool.execute(`
      SELECT id, type, timestamp, photo_path, location_lat, location_lng
      FROM attendance 
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      data: {
        records: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
