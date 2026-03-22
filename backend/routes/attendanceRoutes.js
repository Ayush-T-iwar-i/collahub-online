const express  = require("express");
const router   = express.Router();
const { verifyToken, isTeacher } = require("../middleware/authMiddleware");
const {
  checkAttendance,
  markAttendance,
  getSubjectAttendance,
  getDateAttendance,
  getMyAttendance,
  getMySubjectAttendance,
} = require("../controllers/attendanceController");

// ══════════════════════════════════════════════════════════
// SPECIFIC ROUTES PEHLE — PARAM ROUTES BAAD
// ══════════════════════════════════════════════════════════

// ── Teacher routes ────────────────────────────────────────
router.get ("/check",                          verifyToken, isTeacher, checkAttendance);
router.post("/mark",                           verifyToken, isTeacher, markAttendance);
router.get ("/subject/:subjectId",             verifyToken, isTeacher, getSubjectAttendance);
router.get ("/subject/:subjectId/date/:date",  verifyToken, isTeacher, getDateAttendance);

// ── Student routes ────────────────────────────────────────
router.get ("/my",                             verifyToken, getMyAttendance);
router.get ("/my/subject/:subjectId",          verifyToken, getMySubjectAttendance);

module.exports = router;