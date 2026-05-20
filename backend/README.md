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
- `SKIP_DB_CONNECT`: Set to `true` if you only want to run the Groq chatbot without MongoDB
- `REQUIRE_MONGODB`: Set to `true` if the server should stop when MongoDB is unavailable
- `JWT_SECRET`: A secure random string for token signing (change this!)
- `JWT_EXPIRES_IN`: Token expiration time (default: 7d)
- `GROQ_API_KEY`: Groq API key used by the student support chatbot. This must be a real key, not the placeholder from `.env.example`.
- `GROQ_MODEL`: Groq model for chat replies (default: `llama-3.3-70b-versatile`)
- `CORS_ORIGIN`: Allowed frontend origins, comma-separated

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

### POST /chat/support
Generate a mental-wellness support reply for the student chatbot. This endpoint calls Groq from the backend so the API key is never exposed in the browser.

**Request:**
```json
{
  "message": "Mình đang rất căng thẳng vì thi cử",
  "history": [
    { "role": "user", "content": "Chào bạn" },
    { "role": "assistant", "content": "Mình ở đây để lắng nghe bạn." }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reply": "Mình nghe thấy bạn đang chịu nhiều áp lực...",
    "model": "llama-3.3-70b-versatile",
    "response_id": "resp_..."
  }
}
```

### App Data Endpoints
These endpoints power the prototype use cases from the frontend. They use MongoDB when available and fall back to in-memory data while the server is running if MongoDB is skipped or unavailable.

- `GET /api/feed`: latest student diary posts for the home feed
- `POST /api/diaries`: save a diary entry
- `POST /api/diaries/tags`: ask Groq to suggest diary tags
- `GET /api/risk-alerts`: list high-risk alerts
- `POST /api/risk-alerts`: create a risk alert from Diary, Chat AI, or Quick Test
- `PATCH /api/risk-alerts/:id`: update alert status
- `POST /api/bookings`: create a consultation booking request
- `PATCH /api/bookings/:id`: update booking status
- `GET /api/dashboard?range=7`: dashboard metrics, alerts, bookings, topics, and heatmap data

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
