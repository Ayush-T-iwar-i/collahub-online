const express = require("express");
const router  = express.Router();
const Subject = require("../models/Subject");

const {
  createSubject,
  getSubjects,
  getSubjectsForTeacher,
  getSubjectsForStudent,
  getSubjectById,
  updateSubject,
  deleteSubject,
} = require("../controllers/subjectController");

const {
  verifyToken,
  isAdmin,
  isTeacher,
} = require("../middleware/authMiddleware");

// ═══════════════════════════════════════════
// ⚠️  IMPORTANT: Specific routes MUST come
//     before /:id to avoid conflicts
// ═══════════════════════════════════════════

// ── ADMIN: Create subject ──
// POST /subjects/create
router.post("/create", verifyToken, isAdmin, createSubject);

// ── ADMIN: Get all subjects (with optional filters) ──
// GET /subjects
// GET /subjects?college=NIET&department=CSE&semester=2
router.get("/", verifyToken, getSubjects);

// ── TEACHER: Subjects matching college + department ──
// GET /subjects/for-teacher
// ✅ 2-field match — teacher ke college + department se filter
router.get("/for-teacher", verifyToken, isTeacher, getSubjectsForTeacher);

// ── STUDENT: Subjects matching college + department + semester ──
// GET /subjects/for-student
// ✅ 3-field match — student ke college + dept + semester se filter
router.get("/for-student", verifyToken, getSubjectsForStudent);

// ── ADMIN: Update subject ──
// PUT /subjects/:id
router.put("/:id", verifyToken, isAdmin, updateSubject);

// ── ADMIN: Delete subject ──
// DELETE /subjects/:id
router.delete("/:id", verifyToken, isAdmin, deleteSubject);

// ── GET by ID (must be last) ──
// GET /subjects/:id
router.get("/:id", verifyToken, getSubjectById);

module.exports = router;