const User = require('../models/User');

class UserRepository {
  async findByEmail(email) {
    return await User.findOne({ email: email.toLowerCase() });
  }

  async findById(id) {
    return await User.findById(id).select('-password');
  }

  async findByResetToken(hashedToken) {
    return await User.findOne({
      reset_token: hashedToken,
      reset_token_expiry: { $gt: new Date() }
    });
  }

  async setResetToken(userId, hashedToken, expiry) {
    return await User.findByIdAndUpdate(userId, {
      reset_token: hashedToken,
      reset_token_expiry: expiry
    });
  }

  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }
}

module.exports = new UserRepository();
