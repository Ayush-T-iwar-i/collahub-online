const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ===== COMMON FIELDS =====
    name: String,
    email: { type: String, unique: true },
    password: String,
    phone: String,
    role: { type: String, enum: ["student", "teacher", "admin"] },
    profileImage: String,
    refreshToken: String,

    // ===== OTP (for email verify / forgot password) =====
    otp: String,
    otpExpire: Date,

    // ===== STUDENT FIELDS =====
    studentId: { type: String, sparse: true },
    department: String,
    gender: String,
    admissionYear: String,
    college: String,

    // ===== TEACHER FIELDS =====
    teacherId: { type: String, sparse: true },
    university: String,
    age: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);