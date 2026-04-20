// ══════════════════════════════════════════════════════
// BiometricLog.js  —  backend/models/BiometricLog.js
// Every punch log coming from Essl device is stored here
// ══════════════════════════════════════════════════════

const mongoose = require("mongoose");

const BiometricLogSchema = new mongoose.Schema(
  {
    // Device info
    deviceSerial:  { type: String, required: true }, // Essl device serial number
    deviceLabel:   { type: String, default: "Main Gate" }, // Gate/location naam

    // User info (device se milta hai)
    deviceUserId:  { type: String, required: true }, // Device pe registered user ID
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // CollaHub User

    // Student info (match hone ke baad)
    studentId:     { type: String },   // e.g. "STU2023001"
    name:          { type: String },
    college:       { type: String },
    department:    { type: String },
    semester:      { type: Number },
    section:       { type: String },

    // Punch info
    punchTime:     { type: Date, required: true },
    punchType:     { type: String, enum: ["CheckIn", "CheckOut", "Break", "Unknown"], default: "Unknown" },
    verifyMode:    { type: String, default: "Face" }, // Face / Fingerprint / Card / PIN

    // Status
    matched:       { type: Boolean, default: false }, // User matched or not
    processed:     { type: Boolean, default: false }, // Attendance record created

    // Raw payload from device (debugging ke liye)
    rawPayload:    { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Index for fast queries
BiometricLogSchema.index({ deviceSerial: 1, punchTime: -1 });
BiometricLogSchema.index({ userId: 1, punchTime: -1 });
BiometricLogSchema.index({ studentId: 1, punchTime: -1 });
BiometricLogSchema.index({ processed: 1 });

module.exports = mongoose.model("BiometricLog", BiometricLogSchema);