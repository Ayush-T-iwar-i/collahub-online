const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    teacherId: String,
    name: String,
    email: { type: String, unique: true },
    password: String,
    phone: String,
    college: String,
    university: String,
    age: Number,
    profileImage: String,
    role: { type: String, default: "teacher" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", teacherSchema);