const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: String,
    content: String,
    department: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);