const express = require("express");
const router = express.Router();

const { verifyToken, isTeacher } = require("../middleware/authMiddleware");
const {
  createAssignment,
  getAssignments,
  getAssignmentById,
  deleteAssignment,
} = require("../controllers/assignmentController");

// ================= CREATE ASSIGNMENT =================
router.post("/", verifyToken, isTeacher, createAssignment);

// ================= GET ALL ASSIGNMENTS =================
router.get("/", verifyToken, getAssignments);

// ================= GET ASSIGNMENT BY ID =================
router.get("/:id", verifyToken, getAssignmentById);

// ================= UPDATE ASSIGNMENT =================
router.put("/:id", verifyToken, isTeacher, async (req, res) => {
  try {
    const Assignment = require("../models/Assignment");
    const updated = await Assignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= DELETE ASSIGNMENT =================
router.delete("/:id", verifyToken, isTeacher, deleteAssignment);

module.exports = router; // ✅ moved to end