const mongoose = require("mongoose");

const moodEntrySchema = new mongoose.Schema(
  {
    score: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MoodEntry", moodEntrySchema);
