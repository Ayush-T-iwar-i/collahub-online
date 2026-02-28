const express = require("express");
const router = express.Router();
const {
  registerAdmin,
  loginAdmin,
  addStudent,
  addTeacher,
} = require("../controllers/adminController");

// Auth
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

// Admin management
router.post("/add-student", addStudent);
router.post("/add-teacher", addTeacher);

module.exports = router;