require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const authenticate = require('./middlewares/authenticate');

const app = express();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in environment');
  process.exit(1);
}

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'MindConnect API is running' });
});

app.use('/auth', authRoutes);

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
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
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
