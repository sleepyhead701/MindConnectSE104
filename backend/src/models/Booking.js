const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  student_alias: {
    type: String,
    default: 'SV ẩn danh'
  },
  student_id_hash: {
    type: String,
    default: 'SV-ANON'
  },
  class_name: {
    type: String,
    default: 'CNTT_K48'
  },
  department: {
    type: String,
    default: 'CNTT'
  },
  location: {
    type: String,
    default: 'Phòng tham vấn 102 - Khu B'
  },
  urgency_score: {
    type: Number,
    min: 0,
    max: 100,
    default: 60
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
  requested_time: {
    type: Date,
    default: null
  },
  rescheduled_from: {
    type: String,
    default: ''
  },
  rescheduled_at: {
    type: Date,
    default: null
  },
  note: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  status: {
    type: String,
    enum: ['new', 'scheduled', 'rescheduled', 'completed', 'cancelled'],
    default: 'new'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
