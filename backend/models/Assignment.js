const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    subjectName: { type: String },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    teacherName: { type: String },
    college: { type: String },
    department: { type: String },
    semester: { type: String },
    dueDate: { type: Date, required: true },
    maxMarks: { type: Number, default: 100 },
    file: { type: String, default: null }, // Cloudinary URL
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);