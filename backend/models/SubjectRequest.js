const mongoose = require("mongoose");

const subjectRequestSchema = new mongoose.Schema(
  {
    teacherId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    teacherName:  { type: String, required: true, trim: true },
    subjectId:    { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
    subjectName:  { type: String, required: true, trim: true },
    subjectCode:  { type: String, trim: true, default: "" },
    college:      { type: String, required: true, trim: true },
    department:   { type: String, required: true, trim: true },
    semester:     { type: Number, required: true, min: 1, max: 8 },
    section:      { type: String, enum: ["A","B","C","D","All"], default: "All" },
    admissionYear:{ type: String, required: true },
    status:       { type: String, enum: ["pending","accepted","rejected"], default: "pending" },
    adminNote:    { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

subjectRequestSchema.index({ teacherId: 1, status: 1 });
subjectRequestSchema.index({ department: 1, semester: 1, admissionYear: 1 });
subjectRequestSchema.index({ college: 1, department: 1, semester: 1, admissionYear: 1, status: 1 });

module.exports = mongoose.model("SubjectRequest", subjectRequestSchema);