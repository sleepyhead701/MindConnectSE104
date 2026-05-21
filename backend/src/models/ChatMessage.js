const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  student_id_hash: {
    type: String,
    default: 'SV-ANON'
  },
  user_message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  ai_reply: {
    type: String,
    required: true,
    maxlength: 4000
  },
  model: {
    type: String,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
