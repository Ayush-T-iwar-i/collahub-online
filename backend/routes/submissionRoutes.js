const express = require("express");
const router = express.Router();
const multer = require("multer");

const { verifyToken, isTeacher, isStudent } = require("../middleware/authMiddleware");
const {
  submitAssignment,
  getMySubmissions,
  getAllSubmissions,
  gradeSubmission,
} = require("../controllers/submissionController");

// Multer — memory storage for Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB (matches frontend limit)
});

// ════════════════════════════════════════
// STUDENT ROUTES
// ════════════════════════════════════════

// POST /submissions — submit assignment file
router.post("/", verifyToken, isStudent, upload.single("file"), submitAssignment);

// GET /submissions/my — student's own submissions
router.get("/my", verifyToken, isStudent, getMySubmissions);

// ════════════════════════════════════════
// TEACHER ROUTES
// ════════════════════════════════════════

// GET /submissions/all — all submissions for teacher's assignments
router.get("/all", verifyToken, isTeacher, getAllSubmissions);

// PUT /submissions/:id/marks — grade a submission
router.put("/:id/marks", verifyToken, isTeacher, gradeSubmission);

module.exports = router;