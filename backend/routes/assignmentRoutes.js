const express = require("express");
const router  = express.Router();
const { verifyToken, isAdmin, isTeacher } = require("../middleware/authMiddleware");
const {
  getTeachersByDept,
  assignSubject,
  getAllAssignments,
  getTeacherAssignments,
  unassignSubject,
  getTeacherTimetable,
} = require("../controllers/assignmentController");

// ── Admin Routes ──
router.get ("/teachers-by-dept",           verifyToken, isAdmin,   getTeachersByDept);
router.post("/assign",                     verifyToken, isAdmin,   assignSubject);
router.get ("/all",                        verifyToken, isAdmin,   getAllAssignments);
router.delete("/:id",                      verifyToken, isAdmin,   unassignSubject);

// ── Teacher Routes ──
router.get ("/my",                         verifyToken, isTeacher, getTeacherAssignments);
router.get ("/timetable/my",               verifyToken, isTeacher, getTeacherTimetable);
router.get ("/timetable/:teacherId",       verifyToken, isAdmin,   getTeacherTimetable);

module.exports = router;