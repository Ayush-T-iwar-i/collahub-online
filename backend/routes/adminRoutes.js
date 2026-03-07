const express = require("express");
const router = express.Router();
const {
  registerAdmin,
  loginAdmin,
  addStudent,
  addTeacher,
  updateBatchSemester,   // ✅ NEW
} = require("../controllers/adminController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const SubjectRequest = require("../models/SubjectRequest");

// Auth
router.post("/register", registerAdmin);
router.post("/login",    loginAdmin);

// Student & Teacher
router.post("/add-student", verifyToken, isAdmin, addStudent);
router.post("/add-teacher", verifyToken, isAdmin, addTeacher);

// ✅ NEW — Batch Semester Update
router.put("/update-batch-semester", verifyToken, isAdmin, updateBatchSemester);

// Subject Requests
router.get("/subject-requests", verifyToken, isAdmin, async (req, res) => {
  try {
    const requests = await SubjectRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/subject-requests/:id/accept", verifyToken, isAdmin, async (req, res) => {
  try {
    const request = await SubjectRequest.findByIdAndUpdate(
      req.params.id,
      { status: "accepted", adminNote: "" },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    res.json({ success: true, message: "Request accepted", request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/subject-requests/:id/reject", verifyToken, isAdmin, async (req, res) => {
  try {
    const request = await SubjectRequest.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", adminNote: req.body.note || "" },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    res.json({ success: true, message: "Request rejected", request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;