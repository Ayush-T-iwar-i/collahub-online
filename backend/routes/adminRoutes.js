const express = require("express");
const router  = express.Router();
const {
  registerAdmin, loginAdmin,
  getStudents, addStudent, bulkAddStudents, removeStudent, updateBatchSemester, assignSection,
  getTeachers, addTeacher,
  assignSubjectToTeacher, removeAssignedSubject,
} = require("../controllers/adminController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const SubjectRequest = require("../models/SubjectRequest");

// ── Auth ──────────────────────────────────────────────────
router.post("/register", registerAdmin);
router.post("/login",    loginAdmin);

// ── Students ─────────────────────────────────────────────
router.get   ("/students",               verifyToken, isAdmin, getStudents);
router.post  ("/add-student",            verifyToken, isAdmin, addStudent);
router.post  ("/bulk-add-students",      verifyToken, isAdmin, bulkAddStudents);
router.delete("/students/:studentId",    verifyToken, isAdmin, removeStudent);
router.put   ("/update-batch-semester",  verifyToken, isAdmin, updateBatchSemester);
router.put   ("/assign-section",         verifyToken, isAdmin, assignSection);

// ── Teachers ─────────────────────────────────────────────
router.get   ("/teachers",               verifyToken, isAdmin, getTeachers);
router.post  ("/add-teacher",            verifyToken, isAdmin, addTeacher);

// ── Subject Assignment → Teacher Timetable ───────────────
router.post  ("/assign-subject",                            verifyToken, isAdmin, assignSubjectToTeacher);
router.delete("/assign-subject/:teacherId/:subjectIndex",   verifyToken, isAdmin, removeAssignedSubject);

// ── Subject Requests ─────────────────────────────────────
router.get("/subject-requests", verifyToken, isAdmin, async (req, res) => {
  try {
    const requests = await SubjectRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/subject-requests/:id/accept", verifyToken, isAdmin, async (req, res) => {
  try {
    const r = await SubjectRequest.findByIdAndUpdate(req.params.id, { status: "accepted", adminNote: "" }, { new: true });
    if (!r) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Accepted", request: r });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/subject-requests/:id/reject", verifyToken, isAdmin, async (req, res) => {
  try {
    const r = await SubjectRequest.findByIdAndUpdate(req.params.id, { status: "rejected", adminNote: req.body.note || "" }, { new: true });
    if (!r) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Rejected", request: r });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;