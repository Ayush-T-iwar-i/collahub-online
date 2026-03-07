const express = require("express");
const router  = express.Router();
const {
  getAllTeachers,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/userController");

// ✅ /teachers prefix server.js se aa raha hai
router.get("/all",    getAllTeachers);  // GET  /teachers/all
router.put("/:id",    updateTeacher);  // PUT  /teachers/:id
router.delete("/:id", deleteTeacher); // DELETE /teachers/:id

module.exports = router;