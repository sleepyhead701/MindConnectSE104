const mongoose = require('mongoose');

const riskAlertSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  severity: {
    type: String,
    enum: ['medium', 'high', 'critical'],
    default: 'high'
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  matched_keyword: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'rescheduled', 'resolved'],
    default: 'new'
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
  excerpt: {
    type: String,
    maxlength: 500,
    default: ''
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

module.exports = mongoose.model('RiskAlert', riskAlertSchema);
