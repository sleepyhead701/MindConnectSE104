const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  student_id_hash: {
    type: String,
    default: 'SV-ANON'
  },
  source_type: {
    type: String,
    enum: ['report', 'feedback', 'post_consultation', 'app'],
    default: 'feedback'
  },
  report_text: {
    type: String,
    maxlength: 5000,
    default: ''
  },
  rating_text: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  mood_score: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  before_mood_score: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  after_mood_score: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  sentiment_score: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  booking_id: {
    type: String,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
