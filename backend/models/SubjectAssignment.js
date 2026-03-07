const mongoose = require("mongoose");

const timetableSlotSchema = new mongoose.Schema({
  day:       { type: String, required: true }, // "Monday"
  startTime: { type: String, required: true }, // "09:00"
  endTime:   { type: String, required: true }, // "10:00"
  room:      { type: String, default: "" },
  slotNumber:{ type: Number },                 // 1-150
}, { _id: false });

const subjectAssignmentSchema = new mongoose.Schema({
  // ── Subject Info ──
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  subjectName: { type: String, required: true },
  subjectCode: { type: String, default: "" },

  // ── Teacher Info ──
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  teacherName: { type: String, required: true },

  // ── Class Info ──
  college:      { type: String, required: true },
  department:   { type: String, required: true },
  semester:     { type: Number, required: true },
  admissionYear:{ type: String, required: true },

  // ── Timetable Slots (1-150) ──
  timetableSlots: [timetableSlotSchema],

  // ── Status ──
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },

  // ── Assigned By ──
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

}, { timestamps: true });

// ── Indexes ──
subjectAssignmentSchema.index({ teacherId: 1, status: 1 });
subjectAssignmentSchema.index({ subjectId: 1, department: 1, semester: 1 });
subjectAssignmentSchema.index({ department: 1, semester: 1, admissionYear: 1 });

module.exports = mongoose.model("SubjectAssignment", subjectAssignmentSchema);