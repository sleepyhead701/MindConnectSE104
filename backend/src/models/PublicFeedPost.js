const mongoose = require('mongoose');

const publicFeedReplySchema = new mongoose.Schema({
  id: String,
  author: String,
  author_avatar: String,
  owner_email: String,
  date: Date,
  content: String,
  likes: mongoose.Schema.Types.Mixed,
  isLiked: Boolean,
  isUser: Boolean
}, { _id: false, strict: false });

const publicFeedCommentSchema = new mongoose.Schema({
  id: String,
  author: String,
  author_avatar: String,
  owner_email: String,
  date: Date,
  content: String,
  likes: mongoose.Schema.Types.Mixed,
  isLiked: Boolean,
  isUser: Boolean,
  replies: [publicFeedReplySchema]
}, { _id: false, strict: false });

const publicFeedPostSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  author: String,
  author_avatar: String,
  owner_email: String,
  date: Date,
  content: String,
  tags: [String],
  likes: mongoose.Schema.Types.Mixed,
  comments: Number,
  isLiked: Boolean,
  isUser: Boolean,
  commentObjects: [publicFeedCommentSchema],
  sort_index: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.model('PublicFeedPost', publicFeedPostSchema);
