// models/Note.js
const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title:            { type: String, required: true },
  description:      { type: String, default: "" },
  teacherId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacherName:      { type: String, required: true },
  subjectRequestId: { type: mongoose.Schema.Types.ObjectId, default: null },
  subjectName:      { type: String, required: true },
  subjectCode:      { type: String, default: "" },
  college:          { type: String, default: "" },
  department:       { type: String, required: true },
  semester:         { type: Number, required: true },
  admissionYear:    { type: String, default: "" },
  section:          { type: String, default: "All" },
  fileUrl:          { type: String, required: true },
  fileType:         { type: String, enum: ["pdf","ppt","doc","image","other"], default: "other" },
  fileName:         { type: String, default: "file" },
  mimeType:         { type: String, default: "" },
}, { timestamps: true });

noteSchema.index({ department: 1, semester: 1 });
noteSchema.index({ teacherId: 1 });
noteSchema.index({ subjectName: 1 });

module.exports = mongoose.models.Note || mongoose.model("Note", noteSchema);