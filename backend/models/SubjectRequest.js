// models/SubjectRequest.js
const mongoose = require("mongoose");

// ── Timetable slot ────────────────────────────────────────
const timetableSlotSchema = new mongoose.Schema({
  day:       { type: String, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] },
  startTime: { type: String },   // "09:00"
  endTime:   { type: String },   // "10:00"
  room:      { type: String, default: "" },
}, { _id: true });

// ── Shared-with entry ─────────────────────────────────────
const sharedWithSchema = new mongoose.Schema({
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacherName: { type: String, required: true },
  day:         { type: String },
  startTime:   { type: String },
  endTime:     { type: String, default: "" },
  expiresAt:   { type: Date,   required: true },
}, { _id: true });

// ── Main schema ───────────────────────────────────────────
const subjectRequestSchema = new mongoose.Schema({

  // Teacher info
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacherName: { type: String, required: true },

  // Subject info
  subjectName: { type: String, required: true },
  subjectCode: { type: String, default: "" },
  subjectId:   { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
  subjectType: { type: String, enum: ["Theory", "Lab", "Both"], default: "Theory" },

  // Target class
  college:       { type: String, required: true },
  department:    { type: String, required: true },
  semester:      { type: Number, required: true },
  admissionYear: { type: String, required: true },
  section:       { type: String, default: "All" },   // A / B / C / All

  // Admin-assigned timetable slots
  timetable: [timetableSlotSchema],

  // Shared with other teachers (substitute)
  sharedWith: [sharedWithSchema],

  // Status
  status: {
    type:    String,
    enum:    ["pending", "accepted", "rejected"],
    default: "pending",
  },
  adminNote: { type: String, default: "" },

}, { timestamps: true });

// ── Indexes for faster queries ────────────────────────────
subjectRequestSchema.index({ teacherId: 1, status: 1 });
subjectRequestSchema.index({ college: 1, department: 1, semester: 1, status: 1 });
subjectRequestSchema.index({ "sharedWith.teacherId": 1 });

module.exports = mongoose.model("SubjectRequest", subjectRequestSchema);