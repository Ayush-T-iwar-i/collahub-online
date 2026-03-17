const mongoose = require("mongoose");

const timetableSlotSchema = new mongoose.Schema({
  day:       { type: String, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] },
  startTime: { type: String },  // "09:00"
  endTime:   { type: String },  // "10:00"
  room:      { type: String, default: "" },
}, { _id: false });

const subjectRequestSchema = new mongoose.Schema({
  // ── Teacher info ──
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacherName: { type: String, required: true },

  // ── Subject info ──
  subjectName: { type: String, required: true },
  subjectCode: { type: String, default: "" },
  subjectId:   { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },

  // ── Target class ──
  college:       { type: String, required: true },
  department:    { type: String, required: true },
  semester:      { type: Number, required: true },
  admissionYear: { type: String, required: true },
  section:       { type: String, default: "All" }, // A/B/C/D/All

  // ── Admin assigned timetable ──
  timetable: [timetableSlotSchema],   // admin sets this after accepting

  // ── Status ──
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  adminNote: { type: String, default: "" },

}, { timestamps: true });

module.exports = mongoose.model("SubjectRequest", subjectRequestSchema);