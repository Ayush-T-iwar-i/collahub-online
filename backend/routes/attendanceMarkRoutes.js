const express = require("express");
const router  = express.Router();
const { verifyToken, isTeacher } = require("../middleware/authMiddleware");
const {
  markAttendance, checkAttendance,
  getMyAttendance, getBySubject,
} = require("../controllers/attendanceMarkController");

// Teacher routes
router.post("/mark",          verifyToken, isTeacher, markAttendance);
router.get ("/check",         verifyToken, isTeacher, checkAttendance);
router.get ("/by-subject",    verifyToken, isTeacher, getBySubject);

// Student route
router.get ("/my",            verifyToken, getMyAttendance);

module.exports = router;