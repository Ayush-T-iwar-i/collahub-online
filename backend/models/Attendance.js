const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref:"User", required:true },
  subjectId:    { type: mongoose.Schema.Types.ObjectId, ref:"SubjectRequest", required:true },
  subjectName:  { type: String },
  department:   { type: String },
  semester:     { type: Number },
  admissionYear:{ type: String },
  date:         { type: String, required:true },
  day:          { type: String, default: "" },  // ✅ Monday, Tuesday...
  time:         { type: String, default: "" },  // ✅ 9:00 AM
  status:       { type: String, enum:["present","absent"], required:true },
  markedBy:     { type: mongoose.Schema.Types.ObjectId, ref:"User" },
  markedByName: { type: String },
}, { timestamps:true });

attendanceSchema.index({ studentId:1, subjectId:1, date:1 });
attendanceSchema.index({ subjectId:1, date:1, markedBy:1 });

module.exports = mongoose.model("Attendance", attendanceSchema);