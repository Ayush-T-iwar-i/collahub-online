const express = require("express");
const router  = express.Router();
const {
  getAllStudents,
  updateStudent,
  deleteStudent,
} = require("../controllers/userController");

// ✅ /students prefix comes from server.js
router.get("/all",    getAllStudents);   // GET  /students/all
router.put("/:id",    updateStudent);   // PUT  /students/:id
router.delete("/:id", deleteStudent);  // DELETE /students/:id

module.exports = router;