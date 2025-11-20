# ChurchPlus Backend API

Enterprise-grade Node.js backend for ChurchPlus Church Management System.

## 🏗️ Architecture

This backend follows clean architecture principles with clear separation of concerns:

```
src/
├── controllers/     # Handle HTTP requests/responses
├── services/        # Business logic layer
├── repositories/    # Data access layer
├── middleware/      # Express middleware
├── routes/          # API route definitions
├── validators/      # Request validation schemas
├── types/           # TypeScript type definitions
├── config/          # Configuration files
└── utils/           # Utility functions
```

### Design Patterns

- **Controller-Service-Repository Pattern**: Clean separation between request handling, business logic, and data access
- **Dependency Injection**: Services and repositories are injected into controllers
- **Error Handling**: Centralized error handling with custom AppError class
- **Validation**: Request validation using Joi schemas
- **Authentication**: JWT-based authentication with refresh tokens
- **Logging**: Winston logger for structured logging

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 13
- npm or yarn

### Installation

```bash
cd backend
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Database Setup

Create your PostgreSQL database and run migrations:

```bash
npm run migrate
```

### Development

```bash
npm run dev
```

Server will start on `http://localhost:5000`

### Production Build

```bash
npm run build
npm start
```

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

#### Members
- `GET /members` - Get all members (with pagination & filters)
- `GET /members/:id` - Get member by ID
- `POST /members` - Create new member
- `PUT /members/:id` - Update member
- `DELETE /members/:id` - Soft delete member
- `GET /members/statistics` - Get member statistics
- `POST /members/qr-register` - Register member via QR code

#### First Timers
- `GET /first-timers` - Get all first-time visitors
- `POST /first-timers` - Record new first-timer
- `PUT /first-timers/:id` - Update first-timer
- `GET /first-timers/statistics` - Get first-timer statistics

#### Communications
- `POST /communications/sms` - Send SMS
- `POST /communications/email` - Send email
- `POST /communications/voice` - Send voice message
- `GET /communications/history` - Get communication history

#### Events
- `GET /events` - Get all events
- `POST /events` - Create event
- `PUT /events/:id` - Update event
- `DELETE /events/:id` - Delete event
- `POST /events/:id/attendance` - Record attendance

#### Financials
- `GET /financials/transactions` - Get transactions
- `POST /financials/donations` - Record donation
- `GET /financials/reports` - Get financial reports

## 🔒 Security Features

- **Helmet**: Security headers
- **Rate Limiting**: Prevent abuse
- **CORS**: Configurable origins
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt with salt rounds
- **Input Validation**: Joi schema validation
- **SQL Injection Prevention**: Parameterized queries

## 📊 Logging

Winston logger with multiple transports:
- Console (development)
- File rotation (production)
- Error-specific logs

## 🧪 Testing

```bash
npm test
```

## 🚢 Deployment to Render

### Prerequisites
1. Create a Render account
2. Create a PostgreSQL database on Render

### Steps

1. **Connect Repository**
   - Go to Render dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub/GitLab repository

2. **Configure Service**
   - Name: `churchplus-backend`
   - Environment: `Node`
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
   - Root Directory: Leave empty (or `/` if needed)

3. **Environment Variables**
   Add all variables from `.env.example`:
   - NODE_ENV=production
   - PORT=10000 (Render default)
   - DATABASE_URL (from Render PostgreSQL)
   - JWT_SECRET
   - All other required variables

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy

### Post-Deployment

1. Run migrations:
   ```bash
   # In Render shell
   npm run migrate
   ```

2. Test API:
   ```bash
   curl https://your-app.onrender.com/health
   ```

## 📝 Code Style

- ESLint for code quality
- TypeScript strict mode
- Consistent naming conventions
- Comprehensive error handling

## 🤝 Contributing

1. Follow the established architecture
2. Write tests for new features
3. Update documentation
4. Use meaningful commit messages

## 📄 License

MIT
