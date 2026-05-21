const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  student_id_hash: {
    type: String,
    default: 'SV-ANON'
  },
  type: {
    type: String,
    enum: ['post', 'reaction', 'comment', 'resource_view', 'chat', 'booking', 'feedback'],
    default: 'post'
  },
  target_id: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Interaction', interactionSchema);
