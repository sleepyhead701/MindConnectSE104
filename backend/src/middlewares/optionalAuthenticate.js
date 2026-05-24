const authService = require('../services/AuthService');
const mongoose = require('mongoose');
const userRepository = require('../repositories/UserRepository');

const DEMO_ROLES = new Set(['student', 'school', 'admin']);

function readHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function buildDevelopmentDemoUser(req) {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const role = String(readHeader(req, 'x-demo-role') || '')
    .trim()
    .toLowerCase();

  if (!DEMO_ROLES.has(role)) {
    return null;
  }

  const email = String(
    readHeader(req, 'x-demo-email') ||
    readHeader(req, 'x-student-client-id') ||
    `demo-${role}@mindconnect.local`
  )
    .trim()
    .toLowerCase();

  return {
    id: null,
    email,
    role,
    is_demo_user: true
  };
}

const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (token === 'mock-token') {
      const demoUser = buildDevelopmentDemoUser(req);
      if (demoUser) {
        req.user = demoUser;
      }
      return next();
    }

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
