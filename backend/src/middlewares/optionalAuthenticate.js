const authService = require('../services/AuthService');
const mongoose = require('mongoose');
const userRepository = require('../repositories/UserRepository');

const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyToken(token);

    if (mongoose.connection.readyState !== 1) {
      req.user = {
        id: decoded.userId,
        role: decoded.role,
        email: decoded.email || null
      };
      return next();
    }

    const user = await userRepository.findById(decoded.userId);

    if (user) {
      req.user = {
        id: user._id,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      };
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = optionalAuthenticate;
