const mongoose = require("mongoose");

const diaryEntrySchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    content: { type: String, required: true },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("DiaryEntry", diaryEntrySchema);
