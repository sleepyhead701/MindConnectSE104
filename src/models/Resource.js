const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    img: { type: String, default: "" },
    url: { type: String, default: "#" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resource", resourceSchema);
