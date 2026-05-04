const mongoose = require("mongoose");

const feedPostSchema = new mongoose.Schema(
  {
    author: { type: String, required: true },
    content: { type: String, required: true },
    tags: [{ type: String }],
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    isUser: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FeedPost", feedPostSchema);
