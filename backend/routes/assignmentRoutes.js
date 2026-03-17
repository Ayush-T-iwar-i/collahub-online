const express = require("express");
const router = express.Router();
const multer = require("multer");

const { verifyToken, isTeacher, isStudent } = require("../middleware/authMiddleware");
const {
  createAssignment,
  getTeacherAssignments,
  getTeacherAssignedSubjects,
  getStudentAssignments,
} = require("../controllers/assignmentController");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get("/teacher", verifyToken, isTeacher, getTeacherAssignments);
router.get("/my-subjects", verifyToken, isTeacher, getTeacherAssignedSubjects);
router.post("/", verifyToken, isTeacher, upload.single("file"), createAssignment);
router.get("/my", verifyToken, isStudent, getStudentAssignments);

router.put("/:id", verifyToken, isTeacher, async (req, res) => {
  try {
    const Assignment = require("../models/Assignment");
    const updated = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Assignment not found" });
    res.json({ success: true, updated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/:id", verifyToken, isTeacher, async (req, res) => {
  try {
    const Assignment = require("../models/Assignment");
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Assignment deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;