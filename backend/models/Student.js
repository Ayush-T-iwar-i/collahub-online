const mongoose = require("mongoose");

// ⚠️  NOTE: Ye model sirf legacy purpose ke liye hai.
// Actual student data User.js model mein store hota hai.
// Controllers User model use karte hain — Student model nahi.

const studentSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    phone: { type: String, unique: true }, // ✅ syntax fix — {String, unique} galat tha
    studentId: { type: String, unique: true },
    admissionYear: String,
    department: String,
    college: String,
    password: String,
    role: { type: String, default: "student" },
    gender: String,
    otp: String,
    otpExpire: Date,
    refreshToken: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);