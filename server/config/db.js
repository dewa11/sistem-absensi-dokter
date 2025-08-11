const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'absendokter',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Initialize database tables
const initializeTables = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role ENUM('admin','doctor') NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create attendance table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(20),
        type ENUM('checkin','checkout') NOT NULL,
        timestamp DATETIME NOT NULL,
        photo_path VARCHAR(255) NOT NULL,
        location_lat DOUBLE,
        location_lng DOUBLE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_time (user_id, timestamp)
      )
    `);

    // Create default admin user if not exists
    const bcrypt = require('bcrypt');
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await connection.execute(`
      INSERT IGNORE INTO users (id, name, role, password_hash) 
      VALUES ('admin', 'Administrator', 'admin', ?)
    `, [adminPassword]);

    console.log('✅ Database tables initialized successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
};

module.exports = {
  pool,
  testConnection,
  initializeTables
};
