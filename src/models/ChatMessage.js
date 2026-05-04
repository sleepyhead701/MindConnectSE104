const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ["user", "ai"], required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
