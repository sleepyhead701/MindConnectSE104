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
  class_name: {
    type: String,
    default: 'CNTT_K48'
  },
  department: {
    type: String,
    default: 'CNTT'
  },
  requested_time: {
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
