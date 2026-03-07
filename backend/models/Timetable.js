const mongoose = require("mongoose");

const timetableSlotSchema = new mongoose.Schema({
  day:        { type: String, required: true, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] },
  startTime:  { type: String, required: true }, // "09:00"
  endTime:    { type: String, required: true }, // "10:00"
  room:       { type: String, default: "" },
  slotNumber: { type: Number, default: 1 },
});

const timetableSchema = new mongoose.Schema(
  {
    subjectId:     { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId:     { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    college:       { type: String, required: true },
    department:    { type: String, required: true },
    semester:      { type: Number, required: true },
    admissionYear: { type: String, default: "" },
    slots:         [timetableSlotSchema],
  },
  { timestamps: true }
);

// Ek subject ek teacher ke liye sirf ek timetable
timetableSchema.index(
  { subjectId: 1, teacherId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Timetable", timetableSchema);