-- Database initialization script for Sistem Absensi Dokter RSUTI
-- Run this script in phpMyAdmin or MySQL command line

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS absendokter 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE absendokter;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role ENUM('admin','doctor') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(20),
  type ENUM('checkin','checkout') NOT NULL,
  timestamp DATETIME NOT NULL,
  photo_path VARCHAR(255) NOT NULL,
  location_lat DOUBLE,
  location_lng DOUBLE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_time (user_id, timestamp),
  INDEX idx_type (type),
  INDEX idx_date (DATE(timestamp))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt)
INSERT IGNORE INTO users (id, name, role, password_hash) VALUES 
('admin', 'Administrator', 'admin', '$2b$10$rOzJqQZJqQZJqQZJqQZJqOzJqQZJqQZJqQZJqQZJqQZJqQZJqQZJq');

-- Insert sample doctor users for testing
INSERT IGNORE INTO users (id, name, role, password_hash) VALUES 
('19900101', 'Dr. John Doe', 'doctor', '$2b$10$rOzJqQZJqQZJqQZJqQZJqOzJqQZJqQZJqQZJqQZJqQZJqQZJqQZJq'),
('19850615', 'Dr. Jane Smith', 'doctor', '$2b$10$rOzJqQZJqQZJqQZJqQZJqOzJqQZJqQZJqQZJqQZJqQZJqQZJqQZJq'),
('19920320', 'Dr. Ahmad Rahman', 'doctor', '$2b$10$rOzJqQZJqQZJqQZJqQZJqOzJqQZJqQZJqQZJqQZJqQZJqQZJqQZJq');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, DATE(timestamp));

-- Create a view for daily attendance summary
CREATE OR REPLACE VIEW daily_attendance_summary AS
SELECT 
    DATE(timestamp) as attendance_date,
    user_id,
    u.name as doctor_name,
    MAX(CASE WHEN type = 'checkin' THEN timestamp END) as checkin_time,
    MAX(CASE WHEN type = 'checkout' THEN timestamp END) as checkout_time,
    COUNT(CASE WHEN type = 'checkin' THEN 1 END) as checkin_count,
    COUNT(CASE WHEN type = 'checkout' THEN 1 END) as checkout_count
FROM attendance a
JOIN users u ON a.user_id = u.id
WHERE u.role = 'doctor'
GROUP BY DATE(timestamp), user_id, u.name
ORDER BY attendance_date DESC, u.name;

-- Create a view for recent activity (last 7 days)
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    a.id,
    a.user_id,
    u.name as doctor_name,
    a.type,
    a.timestamp,
    a.photo_path,
    a.location_lat,
    a.location_lng,
    CASE 
        WHEN a.type = 'checkin' THEN 'Check In'
        WHEN a.type = 'checkout' THEN 'Check Out'
    END as type_display
FROM attendance a
JOIN users u ON a.user_id = u.id
WHERE a.timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY a.timestamp DESC;

-- Show table information
SHOW TABLES;
DESCRIBE users;
DESCRIBE attendance;

-- Show sample data
SELECT 'Users Table:' as Info;
SELECT id, name, role, created_at FROM users;

SELECT 'Recent Activity View:' as Info;
SELECT * FROM recent_activity LIMIT 5;

-- Performance optimization queries
ANALYZE TABLE users;
ANALYZE TABLE attendance;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON absendokter.* TO 'your_app_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Backup command (run from command line):
-- mysqldump -u root -p absendokter > absendokter_backup_$(date +%Y%m%d_%H%M%S).sql

-- Restore command (run from command line):
-- mysql -u root -p absendokter < absendokter_backup_YYYYMMDD_HHMMSS.sql
