const mongoose = require('mongoose');

const diarySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  author_alias: {
    type: String,
    default: 'Tôi'
  },
  title: {
    type: String,
    trim: true,
    maxlength: 160,
    default: ''
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  tags: {
    type: [String],
    default: []
  },
  mood_score: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  is_anonymous: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Diary', diarySchema);
