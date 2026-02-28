const express = require("express");
const router = express.Router();
const {
  getAllStudents,
  getAllTeachers,
  updateStudent,
  deleteStudent,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/userController");

// ── Student routes ──
router.get("/students/all",          getAllStudents);
router.put("/students/:id",          updateStudent);
router.delete("/students/:id",       deleteStudent);

// ── Teacher routes ──
router.get("/teachers/all",          getAllTeachers);
router.put("/teachers/:id",          updateTeacher);
router.delete("/teachers/:id",       deleteTeacher);

module.exports = router;