const mongoose = require("mongoose");

const timetableSlotSchema = new mongoose.Schema({
  day:       { type: String, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] },
  startTime: { type: String },
  endTime:   { type: String },
  room:      { type: String, default: "" },
}, { _id: false });

// ✅ NEW — class sharing schema
const sharedWithSchema = new mongoose.Schema({
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacherName: { type: String, required: true },
  day:         { type: String },       // which day shared
  startTime:   { type: String },       // which slot shared
  endTime:     { type: String },
  expiresAt:   { type: Date },         // auto-remove after this time
  sharedAt:    { type: Date, default: Date.now },
}, { _id: true });

const subjectRequestSchema = new mongoose.Schema({
  // ── Teacher info ──
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacherName: { type: String, required: true },

  // ── Subject info ──
  subjectName: { type: String, required: true },
  subjectCode: { type: String, default: "" },
  subjectId:   { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
  subjectType: { type: String, enum: ["Theory","Lab","Both"], default: "Theory" },

  // ── Target class ──
  college:       { type: String, required: true },
  department:    { type: String, required: true },
  semester:      { type: Number, required: true },
  admissionYear: { type: String, required: true },
  section:       { type: String, default: "All" },

  // ── Admin assigned timetable ──
  timetable: [timetableSlotSchema],

  // ── Status ──
  status: {
    type:    String,
    enum:    ["pending", "accepted", "rejected"],
    default: "pending",
  },
  adminNote: { type: String, default: "" },

  // ✅ NEW — class sharing
  sharedWith: [sharedWithSchema],

}, { timestamps: true });

module.exports = mongoose.model("SubjectRequest", subjectRequestSchema);