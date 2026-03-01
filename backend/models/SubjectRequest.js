const mongoose = require("mongoose");

const subjectRequestSchema = new mongoose.Schema({
  // ── Teacher info ──
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref:"User", required:true },
  teacherName: { type: String, required:true },

  // ── Subject info ──
  subjectName: { type: String, required:true },
  subjectCode: { type: String },

  // ── Target class ──
  college:       { type: String, required:true },
  department:    { type: String, required:true },
  semester:      { type: Number, required:true },
  admissionYear: { type: String, required:true }, // "2023" → section = "CSE 2023"

  // ── Status ──
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },

  adminNote: { type: String }, // optional rejection note

}, { timestamps: true });

module.exports = mongoose.model("SubjectRequest", subjectRequestSchema);