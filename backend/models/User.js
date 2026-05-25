const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ─── COMMON ──────────────────────────────────
    name: String,
    email: { type: String, unique: true },
    password: String,
    phone: String,
    role: { type: String, enum: ["student", "teacher", "admin", "super-admin"] },
    profileImage: String,
    refreshToken: String,

    // ─── OTP ─────────────────────────────────────
    otp: String,
    otpExpire: Date,
    isEmailVerified: { type: Boolean, default: false },

    // ─── SHARED ACADEMIC ─────────────────────────
    department: String,
    college: String,

    // ─── STUDENT ONLY ────────────────────────────
    studentId: { type: String, sparse: true },
    gender: String,
    admissionYear: String,
    semester: { type: Number, default: undefined },
    isPromoted: { type: Boolean, default: undefined },

    // ✅ NEW — Section assigned by admin (A/B/C/D)
    section: { type: String, default: undefined },
    subSection: { type: String, default: undefined }, // A1, A2, B1, B2 — NEW

    // ─── STUDENT RESULTS ─────────────────────────
    results: [
      {
        semester: Number,
        year: Number,
        sgpa: Number,
        cgpa: Number,
        status: { type: String, enum: ["pass", "fail", "pending"], default: "pending" },
        subjects: [
          {
            name: String,
            code: String,
            marks: Number,
            maxMarks: Number,
            grade: String,
            status: { type: String, enum: ["pass", "fail"] },
          },
        ],
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
      },
    ],

    // ─── TEACHER ONLY ────────────────────────────
    teacherId: { type: String, sparse: true },
    university: String,
    age: Number,

    // ✅ NEW — Admin-assigned subjects (auto-shows in teacher timetable)
    assignedSubjects: [
      {
        subjectName: { type: String, required: true },
        subjectCode: { type: String, default: "" },
        department: { type: String, required: true },
        admissionYear: { type: String, default: "" },  // batch e.g. "2023"
        section: { type: String, default: "" },  // A/B/C/D or "All"
        semester: Number,
        days: [String],                       // ["Monday","Wednesday"]
        timeSlot: { type: String, required: true }, // "9:00-10:00"
        roomNumber: { type: String, default: "" },
        assignedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);