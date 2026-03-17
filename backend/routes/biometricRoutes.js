// ══════════════════════════════════════════════════════════════
// biometricRoutes.js  —  backend/routes/biometricRoutes.js
// ══════════════════════════════════════════════════════════════

const express = require("express");
const router  = express.Router();
const { verifyToken, authorizeRoles, isAdmin } = require("../middleware/authMiddleware");
const {
  handleEsslPush,
  heartbeat,
  getLogs,
  getStudentHistory,
  manualPull,
  enrollMapping,
  getUnmatched,
  getTeacherAttendance,
  getTeacherLogs,
} = require("../controllers/biometricController");

// ── PUBLIC routes (Essl device ke liye — no auth) ──
// Device yahan push karta hai — auth nahi laga sakte
router.post("/push",    handleEsslPush); // Essl ADMS push
router.get( "/ping",    heartbeat);      // Device heartbeat check
router.get( "/",        heartbeat);      // Essl GET ping bhi karta hai

// ── PROTECTED routes (Admin / Super Admin only) ──
router.get( "/logs",              verifyToken, authorizeRoles("admin","super-admin"), getLogs);
router.get( "/unmatched",         verifyToken, authorizeRoles("admin","super-admin"), getUnmatched);
router.post("/pull",              verifyToken, authorizeRoles("admin","super-admin"), manualPull);
router.post("/enroll",            verifyToken, authorizeRoles("admin","super-admin"), enrollMapping);

// Student apna khud ka history dekh sakta hai
router.get( "/student/:studentId", verifyToken, getStudentHistory);

// Teacher Attendance (admin only)
router.get("/teacher-attendance", verifyToken, isAdmin, getTeacherAttendance);
router.get("/teacher-logs",       verifyToken, isAdmin, getTeacherLogs);

module.exports = router;