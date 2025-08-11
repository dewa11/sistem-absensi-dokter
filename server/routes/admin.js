const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET /admin/activity - Get recent activity
router.get('/activity', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        a.id,
        a.user_id,
        a.type,
        a.timestamp,
        a.photo_path,
        a.location_lat,
        a.location_lng,
        u.name as doctor_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.timestamp DESC
      LIMIT 20
    `);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /admin/create-doctor - Create new doctor
router.post('/create-doctor', async (req, res) => {
  try {
    const { id, name, password } = req.body;

    // Validate input
    if (!id || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'ID, name, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if doctor ID already exists
    const [existingUser] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [id.trim()]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Doctor ID already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new doctor
    await pool.execute(
      'INSERT INTO users (id, name, role, password_hash) VALUES (?, ?, ?, ?)',
      [id.trim(), name.trim(), 'doctor', passwordHash]
    );

    res.json({
      success: true,
      message: 'Doctor created successfully'
    });

  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /admin/update-password - Update doctor's password
router.put('/update-password', async (req, res) => {
  try {
    const { doctorId, newPassword } = req.body;

    // Validate input
    if (!doctorId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if doctor exists
    const [existingUser] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND role = ?',
      [doctorId, 'doctor']
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, doctorId]
    );

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /admin/delete-doctor - Delete doctor
router.delete('/delete-doctor/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Check if doctor exists
    const [existingUser] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND role = ?',
      [doctorId, 'doctor']
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Delete doctor (attendance records will be deleted due to CASCADE)
    await pool.execute(
      'DELETE FROM users WHERE id = ? AND role = ?',
      [doctorId, 'doctor']
    );

    res.json({
      success: true,
      message: 'Doctor deleted successfully'
    });

  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /admin/attendance-history - Get attendance history with pagination and filters
router.get('/attendance-history', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      startDate = '', 
      endDate = '' 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Add search filter
    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add date range filter
    if (startDate) {
      whereClause += ' AND DATE(a.timestamp) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND DATE(a.timestamp) <= ?';
      params.push(endDate);
    }

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      ${whereClause}
    `, params);

    const total = countResult[0].total;

    // Get paginated results
    const [rows] = await pool.execute(`
      SELECT 
        a.id,
        a.user_id,
        a.type,
        a.timestamp,
        a.photo_path,
        a.location_lat,
        a.location_lng,
        u.name as doctor_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.timestamp DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

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
    console.error('Get attendance history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /admin/delete-attendance - Delete attendance record
router.delete('/delete-attendance/:attendanceId', async (req, res) => {
  try {
    const { attendanceId } = req.params;

    // Check if attendance record exists
    const [existingRecord] = await pool.execute(
      'SELECT id, photo_path FROM attendance WHERE id = ?',
      [attendanceId]
    );

    if (existingRecord.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Delete attendance record
    await pool.execute(
      'DELETE FROM attendance WHERE id = ?',
      [attendanceId]
    );

    // TODO: Delete photo file from filesystem
    // const fs = require('fs');
    // const path = require('path');
    // const photoPath = path.join(__dirname, '..', existingRecord[0].photo_path);
    // if (fs.existsSync(photoPath)) {
    //   fs.unlinkSync(photoPath);
    // }

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });

  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /admin/doctors - Get all doctors
router.get('/doctors', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, name, created_at
      FROM users 
      WHERE role = 'doctor'
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
