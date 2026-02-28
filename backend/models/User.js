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
    isEmailVerified: { type: Boolean, default: false },

    // ===== STUDENT FIELDS =====
    studentId:     { type: String, sparse: true },
    department:    String,
    gender:        String,
    admissionYear: String,
    college:       String,
    semester:      { type: Number, default: 1 }, // ✅ ADDED
    isPromoted:    { type: Boolean, default: false }, // last result mein pass hua?

    // ===== RESULT HISTORY =====
    // Array of results — ek per semester
    results: [
      {
        semester:     Number,
        year:         Number,         // e.g. 2024
        sgpa:         Number,         // e.g. 8.5
        cgpa:         Number,
        status:       { type: String, enum: ["pass", "fail", "pending"], default: "pending" },
        subjects:     [
          {
            name:     String,
            code:     String,
            marks:    Number,
            maxMarks: Number,
            grade:    String,
            status:   { type: String, enum: ["pass", "fail"] },
          }
        ],
        uploadedAt:   { type: Date, default: Date.now },
        uploadedBy:   String,         // admin/teacher name
      }
    ],

    // ===== TEACHER FIELDS =====
    teacherId:  { type: String, sparse: true },
    university: String,
    age:        Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);