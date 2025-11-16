# 🏛️ RCCG He Reigns Assembly - Smart Attendance Management System

A comprehensive, enterprise-grade church attendance tracking system with real-time analytics, automated follow-ups, and intelligent service scheduling.

## ✨ Features

### Core Features
- ✅ **Multi-Method Check-In**: QR Code, Manual, GPS, NFC support
- 📊 **Real-Time Analytics Dashboard**: Beautiful charts and insights
- 🔔 **Automated Follow-Ups**: Smart detection of consecutive absences
- 📅 **Smart Service Scheduling**: Automated recurring services
- 👥 **Role-Based Access Control**: Multiple user roles with specific permissions
- 📱 **Mobile-First Design**: Responsive UI for all devices
- 🌐 **Offline Support**: Check-in even without internet
- 🔒 **Enterprise Security**: JWT authentication, encrypted data
- 📈 **Engagement Scoring**: AI-powered member engagement tracking
- 📧 **Automated Notifications**: Email, SMS, and push notifications

### Advanced Features
- Geofencing for location-based check-in
- Duplicate detection and prevention
- Bulk operations for administrators
- Comprehensive reporting (Daily, Weekly, Monthly, Custom)
- Department-based attendance tracking
- Multi-language support
- Export data in multiple formats (CSV, Excel, PDF)

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT with refresh tokens
- **File Upload**: Cloudinary
- **QR Generation**: qrcode
- **Scheduling**: rrule
- **Security**: Helmet, rate-limiting, bcrypt

### Frontend
- **Framework**: React 18+ with Vite
- **Styling**: Tailwind CSS
- **State Management**: Context API
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Real-time**: Socket.io-client

## 📦 Installation

### Prerequisites
- Node.js >= 18.0.0
- MongoDB >= 5.0
- npm or yarn
- Cloudinary account (for image uploads)

### Backend Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd church-attendance-system
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000

MONGODB_URI=mongodb://localhost:27017/church_attendance

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_REFRESH_SECRET=your_refresh_token_secret_change_this
JWT_EXPIRE=24h

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

CLIENT_URL=http://localhost:5173
```

4. **Start MongoDB**
```bash
# If using local MongoDB
mongod

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

5. **Run the backend server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server will start at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd ../frontend
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=RCCG He Reigns Attendance
```

4. **Start the frontend development server**
```bash
npm run dev
```

Frontend will start at `http://localhost:5173`

## 🚀 Quick Start Guide

### 1. Create Admin Account
```bash
POST http://localhost:5000/api/v1/auth/register
Content-Type: application/json

{
  "firstName": "Admin",
  "lastName": "User",
  "email": "admin@rccghereigns.com",
  "phoneNumber": "+2348012345678",
  "password": "SecurePassword123!",
  "gender": "male",
  "role": "super_admin"
}
```

### 2. Login
```bash
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@rccghereigns.com",
  "password": "SecurePassword123!"
}
```

### 3. Create Your First Service
```bash
POST http://localhost:5000/api/v1/services
Authorization: Bearer {your_token}
Content-Type: application/json

{
  "name": "Sunday First Service",
  "type": "sunday_first_service",
  "description": "Main Sunday morning service",
  "recurrence": {
    "isRecurring": true,
    "frequency": "WEEKLY",
    "interval": 1,
    "daysOfWeek": [0]
  },
  "startTime": "08:00",
  "endTime": "10:30",
  "venue": "Main Auditorium",
  "checkInSettings": {
    "enableQRCode": true,
    "enableGPS": true,
    "checkInWindowBefore": 30,
    "checkInWindowAfter": 120
  }
}
```

### 4. Check In to Service
```bash
POST http://localhost:5000/api/v1/attendance/checkin
Authorization: Bearer {your_token}
Content-Type: application/json

{
  "serviceId": "{service_id}",
  "method": "manual",
  "location": {
    "type": "Point",
    "coordinates": [3.5852, 6.4698]
  }
}
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/v1/auth/register` | Register new user | Public |
| POST | `/api/v1/auth/login` | User login | Public |
| GET | `/api/v1/auth/me` | Get current user | Private |
| PUT | `/api/v1/auth/profile` | Update profile | Private |
| PUT | `/api/v1/auth/change-password` | Change password | Private |
| POST | `/api/v1/auth/refresh` | Refresh token | Public |
| GET | `/api/v1/auth/qrcode` | Get user QR code | Private |

### Service Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/v1/services` | Get all services | Public |
| GET | `/api/v1/services/today` | Get today's services | Public |
| GET | `/api/v1/services/upcoming` | Get upcoming services | Public |
| GET | `/api/v1/services/calendar` | Get service calendar | Public |
| POST | `/api/v1/services` | Create service | Admin |
| PUT | `/api/v1/services/:id` | Update service | Admin |
| DELETE | `/api/v1/services/:id` | Delete service | Admin |

### Attendance Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/v1/attendance/checkin` | Check in | Private |
| POST | `/api/v1/attendance/qr-checkin` | QR check in | Private |
| POST | `/api/v1/attendance/:id/checkout` | Check out | Private |
| GET | `/api/v1/attendance/my-attendance` | My attendance | Private |
| GET | `/api/v1/attendance` | All attendance | Admin |
| POST | `/api/v1/attendance/bulk-checkin` | Bulk check-in | Admin |

## 👥 User Roles & Permissions

### Super Admin
- Full system access
- Manage all users, services, departments
- View and export all data
- System configuration

### Admin
- Manage users and attendance
- Create and manage services
- View reports and analytics
- Send notifications

### Pastor
- View all attendance data
- Access reports and analytics
- Manage follow-ups
- Send announcements

### Department Head
- View department attendance
- Manage department members
- Access department reports

### Minister
- View attendance
- Manage assigned follow-ups

### Worker
- Check in to services
- View personal attendance

### Member
- Check in to services
- View personal attendance
- Update profile

### Visitor
- One-time check-in
- Limited access

## 🎨 Frontend Pages

### Public Pages
- **Login/Register**: Authentication pages
- **Today's Services**: View today's schedule

### Protected Pages
- **Dashboard**: Overview with stats and charts
- **Check-In**: Quick check-in interface
- **My Attendance**: Personal attendance history
- **Services**: Service management and calendar
- **Analytics**: Comprehensive analytics dashboard
- **Members**: Member management (Admin)
- **Departments**: Department management (Admin)
- **Follow-Ups**: Follow-up tracking (Admin/Pastor)
- **Settings**: System and profile settings

## 📊 Database Schema

### Collections
- **users**: User accounts and profiles
- **services**: Service definitions and schedules
- **attendances**: Attendance records
- **departments**: Church departments
- **followups**: Follow-up tasks and tracking

## 🔐 Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt (12 rounds)
- Rate limiting on all API endpoints
- Helmet.js security headers
- CORS protection
- Input validation and sanitization
- Role-based access control (RBAC)
- Geofencing for location verification
- Duplicate detection
- Soft deletes for data integrity

## 📈 Performance Optimizations

- Database indexing on frequently queried fields
- Connection pooling
- Response compression
- Efficient pagination
- Optimized aggregation pipelines
- Lazy loading in frontend
- Code splitting
- Image optimization via Cloudinary

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚢 Deployment

### Backend Deployment (Heroku Example)

```bash
# Login to Heroku
heroku login

# Create app
heroku create rccg-attendance-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_secret

# Deploy
git push heroku main
```

### Frontend Deployment (Vercel Example)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

## 📱 Mobile App

The mobile app (React Native) will be developed in Phase 2 and will include:
- Native QR scanner
- Push notifications
- Offline sync
- Biometric authentication

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Acknowledgments

- RCCG He Reigns Assembly, Osapa-London, Lekki
- All contributors and testers
- Open source community

## 📞 Support

For support, email support@rccghereigns.com or create an issue in the repository.

---

**Built with ❤️ for RCCG He Reigns Assembly**