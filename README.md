# Sistem Absensi Dokter RSUTI

A comprehensive doctor attendance system built with React and Node.js, featuring geofencing, photo capture, and role-based access control.

## 🚀 Features

### 🔐 Authentication
- ID-based login (Doctor ID + Password)
- JWT tokens stored in HttpOnly cookies
- Role-based access (Admin/Doctor)
- Password change functionality

### 👨‍⚕️ Doctor Features
- Real-time check-in/check-out with photo capture
- Geofencing (500m radius restriction)
- Today's attendance status display
- Personal attendance history

### 👨‍💼 Admin Features
- Recent activity dashboard
- User management (create, edit, delete doctors)
- Attendance history with filters and pagination
- Print functionality
- Delete attendance records

### 🎨 UI/UX
- Royal blue theme
- Responsive design (mobile-friendly)
- Clean, modern interface
- "Made by RVL" watermark
- Logo placement on login page

## 🛠️ Tech Stack

### Frontend
- **React** (Hooks, Functional Components)
- **React Router** for navigation
- **Tailwind CSS** for styling
- **TypeScript** for type safety

### Backend
- **Node.js** (v18+)
- **Express.js** web framework
- **JWT** for authentication
- **bcrypt** for password hashing
- **Multer** for file uploads
- **MySQL2** for database connection

### Database
- **MySQL** (via phpMyAdmin)
- Database name: `absendokter`

### Deployment
- **LAMPP 8.2.12** (PHP 8.2.12)
- **cPanel** ready
- **Apache** with .htaccess configuration

## 📁 Project Structure

```
├── server/                 # Backend (Node.js/Express)
│   ├── config/
│   │   └── db.js          # Database configuration
│   ├── middleware/
│   │   └── auth.js        # Authentication middleware
│   ├── routes/
│   │   ├── auth.js        # Authentication routes
│   │   ├── admin.js       # Admin routes
│   │   └── doctor.js      # Doctor routes
│   ├── utils/
│   │   └── geofence.js    # Geofencing utilities
│   ├── uploads/
│   │   └── attendance/    # Photo storage
│   ├── app.js             # Main server file
│   └── .env               # Environment variables
├── client/                # Frontend (React)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React context
│   │   ├── services/      # API services
│   │   └── utils/         # Utilities
│   └── public/
│       └── logo.png       # Application logo
├── .htaccess              # Apache configuration
├── php.ini                # PHP configuration
├── cleanup.sh             # File cleanup script
├── database.sql           # Database schema
└── README.md              # This file
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- MySQL/MariaDB
- LAMPP/XAMPP (for local development)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd sistem-absensi-dokter
```

### 2. Backend Setup
```bash
cd server
npm install
```

### 3. Database Setup
1. Create MySQL database named `absendokter`
2. Import the database schema:
```bash
mysql -u root -p absendokter < ../database.sql
```

### 4. Environment Configuration
Create `server/.env` file:
```env
# Database Configuration
DB_HOST=localhost
DB_NAME=absendokter
DB_USER=root
DB_PASS=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key

# Server Configuration
PORT=5000
NODE_ENV=development

# Authorized Location (replace with actual coordinates)
AUTHORIZED_LAT=-6.200000
AUTHORIZED_LNG=106.816666
GEOFENCE_RADIUS=500
```

### 5. Frontend Setup
```bash
cd client
npm install
```

### 6. Start Development Servers

Backend:
```bash
cd server
npm run dev
```

Frontend:
```bash
cd client
npm start
```

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role ENUM('admin','doctor') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Attendance Table
```sql
CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(20),
  type ENUM('checkin','checkout') NOT NULL,
  timestamp DATETIME NOT NULL,
  photo_path VARCHAR(255) NOT NULL,
  location_lat DOUBLE,
  location_lng DOUBLE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🔧 Configuration

### Geofencing
Update coordinates in `.env`:
```env
AUTHORIZED_LAT=your_latitude
AUTHORIZED_LNG=your_longitude
GEOFENCE_RADIUS=500
```

### File Upload Limits
Adjust in `php.ini`:
```ini
upload_max_filesize = 10M
post_max_size = 12M
max_execution_time = 120
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/verify` - Verify token

### Admin Routes
- `GET /api/admin/activity` - Recent activity
- `POST /api/admin/create-doctor` - Create doctor
- `PUT /api/admin/update-password` - Update doctor password
- `DELETE /api/admin/delete-doctor/:id` - Delete doctor
- `GET /api/admin/attendance-history` - Attendance history
- `DELETE /api/admin/delete-attendance/:id` - Delete attendance

### Doctor Routes
- `GET /api/doctor/status` - Today's status
- `POST /api/doctor/checkin` - Check in
- `POST /api/doctor/checkout` - Check out
- `GET /api/doctor/history` - Attendance history

## 🔒 Security Features

- JWT tokens in HttpOnly cookies
- Password hashing with bcrypt
- Input validation and sanitization
- Geofencing validation
- File upload restrictions
- HTTPS enforcement
- CORS protection

## 📋 Default Credentials

**Admin:**
- ID: `admin`
- Password: `admin123`

**Sample Doctors:**
- ID: `19900101` (Dr. John Doe)
- ID: `19850615` (Dr. Jane Smith)
- ID: `19920320` (Dr. Ahmad Rahman)
- Password: `doctor123` (for all sample doctors)

## 🔄 Maintenance

### File Cleanup
Run the cleanup script to remove old photos:
```bash
./cleanup.sh
```

Schedule via cron (daily at 2 AM):
```bash
0 2 * * * /path/to/cleanup.sh
```

### Database Backup
```bash
mysqldump -u root -p absendokter > backup_$(date +%Y%m%d).sql
```

## 🚀 Deployment

### cPanel Deployment
1. Upload files to public_html
2. Configure Node.js app in cPanel
3. Set environment variables
4. Configure database connection
5. Update .htaccess for production

### LAMPP Deployment
1. Copy files to htdocs
2. Configure virtual host
3. Set proper file permissions
4. Configure PHP settings

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed:**
- Check MySQL service is running
- Verify database credentials
- Ensure database exists

**Geofencing Not Working:**
- Check browser location permissions
- Verify coordinates in .env
- Test with different devices

**Photo Upload Failed:**
- Check file permissions on uploads folder
- Verify file size limits
- Ensure proper MIME types

## 📞 Support

For support and questions, contact the development team.

## 📄 License

This project is licensed under the ISC License.

---

**Made by RVL** 🚀
