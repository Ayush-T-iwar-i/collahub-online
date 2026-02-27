const express = require("express");
const router = express.Router();
const {
  registerStudent,
  loginStudent,
  getStudentByEmail,
} = require("../controllers/studentController");

router.post("/register", registerStudent);
router.post("/login", loginStudent);
router.get("/:email", getStudentByEmail);

module.exports = router;