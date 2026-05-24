require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const appRoutes = require('./routes/appRoutes');
const authenticate = require('./middlewares/authenticate');

const app = express();

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET is not defined in environment');
    process.exit(1);
  }

  process.env.JWT_SECRET = 'mindconnect-dev-secret';
  console.warn('JWT_SECRET is not defined. Using a development-only fallback secret.');
}

app.use(express.json({ limit: '7mb' }));

app.use((req, res, next) => {
  const allowedOrigins = (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map(origin => origin.trim());
  const requestOrigin = req.headers.origin;

  if (allowedOrigins.includes('*')) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Student-Client-Id, X-Demo-Role, X-Demo-Email');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'MindConnect API is running' });
});

app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/api', appRoutes);

app.get('/protected', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'You have accessed a protected route',
    user: req.user
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'User with this email already exists'
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

const connectDB = async () => {
  if (process.env.SKIP_DB_CONNECT === 'true' || !process.env.MONGODB_URI) {
    console.warn('MongoDB connection skipped. Auth/database routes may not work.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    if (process.env.REQUIRE_MONGODB === 'true') {
      process.exit(1);
    }

    console.warn('Continuing without MongoDB. Chat support route can still run.');
  }
};

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

module.exports = app;
