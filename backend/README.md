# TalkCart Backend

A scalable backend API built with Node.js, Express, and MongoDB for the TalkCart Web3 super application.

## 🏗️ Architecture Overview

### Directory Structure

```
backend/
├── server.js                # Main server entry point
├── config/                  # Configuration files
│   ├── database.js         # Database connection
│   ├── cloudinary.js       # Cloudinary integration
│   └── config.js           # Application configuration
├── models/                 # Mongoose models
│   ├── User.js            # User model
│   ├── Post.js            # Post model
│   ├── Product.js         # Product model
│   └── ...
├── routes/                 # API route handlers
│   ├── auth.js            # Authentication routes
│   ├── users.js           # User management routes
│   ├── posts.js           # Post management routes
│   └── ...
├── services/              # Business logic services
│   ├── authService.js     # Authentication service
│   ├── userService.js     # User service
│   ├── postService.js     # Post service
│   └── ...
├── middleware/            # Custom middleware
│   ├── auth.js            # Authentication middleware
│   ├── validation.js      # Request validation
│   └── ...
├── utils/                 # Utility functions
├── scripts/               # Utility scripts
└── docs/                  # Documentation
```

## 🚀 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with refresh tokens
- **File Storage**: Cloudinary
- **Caching**: Redis
- **Real-time**: Socket.IO
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan
- **Testing**: Jest (planned)

## 🔧 Key Features

### RESTful API Design
- **Versioned endpoints**: `/api/v1/`
- **Consistent response format**: `{ success: boolean, data?: any, error?: string }`
- **Proper HTTP status codes**: 200, 400, 401, 403, 404, 500
- **Comprehensive error handling**: Detailed error messages

### Authentication & Security
- **JWT-based authentication**: Secure token management
- **Password hashing**: bcryptjs
- **Role-based access control**: Admin, User roles
- **Rate limiting**: Prevent abuse
- **Input validation**: Joi schema validation
- **Security headers**: Helmet middleware

### Data Management
- **MongoDB integration**: Mongoose ODM
- **Data validation**: Schema-level validation
- **Indexing**: Optimized database queries
- **File uploads**: Multer with Cloudinary
- **Data relationships**: References and population

### Real-time Features
- **WebSocket support**: Socket.IO
- **Real-time notifications**: Push updates
- **Live chat**: Messaging system
- **Presence indicators**: Online/offline status

### Caching & Performance
- **Redis caching**: Frequently accessed data
- **Query optimization**: Efficient database queries
- **Response compression**: Gzip compression
- **Static file serving**: Optimized asset delivery

## 🛠️ Development

### Prerequisites
- Node.js 18+
- MongoDB
- Redis (optional)
- Cloudinary account

### Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Run database initialization** (optional):
   ```bash
   npm run init-db
   ```

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run lint` - Run linter
- `npm run init-db` - Initialize database with seed data
- `npm run init-defi` - Initialize DeFi data
- `npm run reset-db` - Reset database
- `npm run check-admin` - Check admin users
- `npm run optimize-db` - Optimize database

### Environment Variables

Key environment variables in `.env`:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/talkcart

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=8000
NODE_ENV=development

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## 📡 API Endpoints

### Authentication
```
POST /api/auth/register     # Register new user
POST /api/auth/login        # Login user
POST /api/auth/refresh      # Refresh JWT token
POST /api/auth/logout       # Logout user
```

### Users
```
GET /api/users              # Get all users
GET /api/users/:id          # Get user by ID
PUT /api/users/:id          # Update user
DELETE /api/users/:id       # Delete user
```

### Posts
```
GET /api/posts              # Get all posts
POST /api/posts             # Create new post
GET /api/posts/:id          # Get post by ID
PUT /api/posts/:id          # Update post
DELETE /api/posts/:id       # Delete post
```

### Media
```
POST /api/media/upload      # Upload media file
GET /api/media/:id          # Get media by ID
DELETE /api/media/:id       # Delete media
```

## 🔐 Authentication Flow

1. **User Registration**
   - Client sends POST request to `/api/auth/register`
   - Server validates input and creates user
   - Returns JWT token and user data

2. **User Login**
   - Client sends POST request to `/api/auth/login`
   - Server validates credentials
   - Returns JWT token and user data

3. **Protected Routes**
   - Client includes JWT token in Authorization header
   - Server validates token with authentication middleware
   - Grants or denies access based on role

## 🎨 Code Organization

### Models
Mongoose schemas with validation:
```javascript
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});
```

### Routes
Express route handlers with middleware:
```javascript
router.post('/register', 
  validateRegistration, 
  authController.register
);
```

### Services
Business logic separated from routes:
```javascript
const authService = {
  async register(userData) {
    // Hash password
    // Create user
    // Generate tokens
    return { user, token };
  }
};
```

### Middleware
Reusable functions for request processing:
```javascript
const authenticateToken = (req, res, next) => {
  // Extract token from header
  // Verify token
  // Attach user to request
  next();
};
```

## 📊 Monitoring & Logging

### Request Logging
- Morgan middleware for HTTP request logging
- Custom logging for important events
- Error tracking and reporting

### Health Checks
- `/api/health` endpoint for monitoring
- Database connection status
- Service availability checks

### Error Tracking
- Centralized error handling
- Detailed error logging
- Stack trace preservation

## 🧪 Testing (Planned)

### Unit Tests
- Test individual functions and services
- Mock external dependencies
- Cover edge cases

### Integration Tests
- Test API endpoints
- Database integration tests
- Service interaction tests

### Load Testing
- Performance benchmarking
- Stress testing
- Scalability validation

## 🚀 Deployment

### Docker Support
Dockerfile included for containerization:
```bash
docker build -t talkcart-backend .
docker run -p 8000:8000 talkcart-backend
```

### Environment Configuration
- Development, staging, production environments
- Environment-specific configuration
- Secure secret management

### Scaling
- Horizontal scaling support
- Load balancer configuration
- Database connection pooling