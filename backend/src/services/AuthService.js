const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const userRepository = require('../repositories/UserRepository');

const memoryUsers = [];
const isDbConnected = () => mongoose.connection.readyState === 1;
const roleAllowsPortal = (userRole, requestedRole) => {
  if (!requestedRole) {
    return true;
  }

  if (requestedRole === 'school') {
    return userRole === 'school' || userRole === 'admin';
  }

  return userRole === requestedRole;
};

class AuthService {
  async register(email, password, role = 'student') {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = ['student', 'school', 'admin'].includes(role) ? role : 'student';

    if (!isDbConnected()) {
      const existingUser = memoryUsers.find(user => user.email === normalizedEmail);
      if (existingUser) {
        const err = new Error('User with this email already exists');
        err.statusCode = 409;
        throw err;
      }

      const user = {
        _id: crypto.randomUUID(),
        email: normalizedEmail,
        password,
        role: normalizedRole,
        created_at: new Date()
      };
      memoryUsers.push(user);

      return {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        },
        token: this.generateToken(user._id, user.role)
      };
    }

    try {
      const user = await userRepository.create({
        email: normalizedEmail,
        password,
        role: normalizedRole
      });

      const token = this.generateToken(user._id, user.role);

      return {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        },
        token
      };
    } catch (error) {
      if (error.code === 11000) {
        const err = new Error('User with this email already exists');
        err.statusCode = 409;
        throw err;
      }
      throw error;
    }
  }

  assertRoleAllowed(userRole, requestedRole) {
    if (roleAllowsPortal(userRole, requestedRole)) {
      return;
    }

    const error = new Error(
      requestedRole === 'school'
        ? 'Tài khoản sinh viên không thể đăng nhập khu vực nhà trường. Vui lòng dùng email nhà trường hoặc quản lý.'
        : 'Tài khoản nhà trường không thể đăng nhập khu vực sinh viên.'
    );
    error.statusCode = 403;
    throw error;
  }

  async login(email, password, requestedRole) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRequestedRole = ['student', 'school', 'admin'].includes(requestedRole)
      ? requestedRole
      : undefined;

    if (!isDbConnected()) {
      const user = memoryUsers.find(item => item.email === normalizedEmail);
      if (!user || user.password !== password) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
      }

      this.assertRoleAllowed(user.role, normalizedRequestedRole);

      return {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        },
        token: this.generateToken(user._id, user.role)
      };
    }

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    this.assertRoleAllowed(user.role, normalizedRequestedRole);

    const token = this.generateToken(user._id, user.role);

    return {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },
      token
    };
  }

  generateToken(userId, role) {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      const err = new Error('Invalid or expired token');
      err.statusCode = 401;
      throw err;
    }
  }

  async forgotPassword(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (user) {
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

      await userRepository.setResetToken(user._id, hashedToken, resetTokenExpiry);

      const { sendResetEmail } = require('../utils/email');
      await sendResetEmail(user.email, resetToken);
    }

    return {
      message: 'If an account exists, a reset email has been sent'
    };
  }

  async resetPassword(token, newPassword) {
    const crypto = require('crypto');
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await userRepository.findByResetToken(hashedToken);

    if (!user) {
      const err = new Error('Invalid or expired reset token');
      err.statusCode = 400;
      throw err;
    }

    if (user.reset_token_expiry < new Date()) {
      const err = new Error('Reset token has expired');
      err.statusCode = 400;
      throw err;
    }

    user.password = newPassword;
    user.reset_token = null;
    user.reset_token_expiry = null;
    await user.save();

    return { message: 'Password reset successful' };
  }
}

module.exports = new AuthService();
