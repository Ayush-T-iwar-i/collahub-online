// backend/models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    type:    {
      type: String,
      enum: ["subject_request", "attendance", "assignment", "general", "result"],
      default: "general",
    },
    isRead:  { type: Boolean, default: false },
    data:    { type: Object, default: {} }, // extra data if needed
  },
  { timestamps: true }
);

// Index for fast user queries
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);