const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    phone: { type: String, default: "1900.1234" },
    location: { type: String, default: "Phòng 102 - Khu B" },
    desiredTime: { type: Date, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
