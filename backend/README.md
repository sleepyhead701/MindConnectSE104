# MindConnect Backend - Authentication System

A Node.js backend for the MindConnect Diary app with JWT authentication.

## Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your settings:
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secure random string for token signing (change this!)
- `JWT_EXPIRES_IN`: Token expiration time (default: 7d)

## Running the Server

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### POST /auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "created_at": "2026-05-06T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### POST /auth/login
Authenticate a user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "created_at": "2026-05-06T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Protected Routes
Use the `Authorization: Bearer <token>` header to access protected routes.

## Project Structure

```
backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── middlewares/      # Express middlewares (auth)
│   ├── models/           # Mongoose schemas
│   ├── repositories/     # Data access layer
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   └── index.js          # App entry point
├── .env.example
└── package.json
```

## Integrating with Existing Frontend

To protect diary routes, add the auth middleware:

```javascript
const authenticate = require('./middlewares/authenticate');

// Apply to routes
app.get('/api/diaries', authenticate, diaryController.getAll);
app.post('/api/diaries', authenticate, diaryController.create);
```

## Error Responses

All errors return JSON with `success: false`:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common status codes:
- 400: Validation error
- 401: Authentication failed
- 409: User already exists
- 500: Server error
