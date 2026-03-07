const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ===== COMMON FIELDS =====
    name:         String,
    email:        { type: String, unique: true },
    password:     String,
    phone:        String,
    role:         { type: String, enum: ["student", "teacher", "admin"] },
    profileImage: String,
    refreshToken: String,

    // ===== OTP =====
    otp:             String,
    otpExpire:       Date,
    isEmailVerified: { type: Boolean, default: false },

    // ===== COMMON ACADEMIC FIELDS =====
    department: String,
    college:    String,

    // ===== STUDENT ONLY FIELDS =====
    studentId:     { type: String, sparse: true },
    gender:        String,
    admissionYear: String,

    semester:   {
      type:    Number,
      default: undefined,   // ✅ null by default — teacher ko 1 nahi milega
    },
    isPromoted: {
      type:    Boolean,
      default: undefined,   // ✅ null by default — sirf student ke liye
    },

    // ===== RESULT HISTORY (Student Only) =====
    results: [
      {
        semester: Number,
        year:     Number,
        sgpa:     Number,
        cgpa:     Number,
        status:   { type: String, enum: ["pass","fail","pending"], default: "pending" },
        subjects: [
          {
            name:     String,
            code:     String,
            marks:    Number,
            maxMarks: Number,
            grade:    String,
            status:   { type: String, enum: ["pass","fail"] },
          }
        ],
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
      }
    ],

    // ===== TEACHER ONLY FIELDS =====
    teacherId:  { type: String, sparse: true },
    university: String,
    age:        Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);