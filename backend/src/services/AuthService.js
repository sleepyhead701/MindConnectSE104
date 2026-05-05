const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/UserRepository');

class AuthService {
  async register(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const user = await userRepository.create({
        email: normalizedEmail,
        password
      });

      const token = this.generateToken(user._id);

      return {
        user: {
          id: user._id,
          email: user.email,
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

  async login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

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

    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        email: user.email,
        created_at: user.created_at
      },
      token
    };
  }

  generateToken(userId) {
    return jwt.sign(
      { userId },
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
