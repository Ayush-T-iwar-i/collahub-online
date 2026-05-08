const express        = require("express");
const router         = express.Router();
const mongoose       = require("mongoose");
const Subject        = require("../models/Subject");
const SubjectRequest = require("../models/SubjectRequest"); // ✅ sirf require — koi schema nahi
const User           = require("../models/User");
const { verifyToken, isAdmin, isTeacher } = require("../middleware/authMiddleware");

// ── Get all subjects (admin) ──
router.get("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const { department, semester, college } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (semester)   filter.semester   = Number(semester);
    if (college)    filter.college    = college;
    const subjects = await Subject.find(filter).sort({ semester: 1, name: 1 });
    res.json({ success: true, subjects });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
// ── Add subject (admin) ──
router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {

    console.log("📚 Add Subject Request:", req.body);

    const {
      name,
      code,
      type,
      college,
      department,
      semester,
      credits,
      description
    } = req.body;

    // ── Validation ──
    if (!name || !college || !department || !semester) {
      return res.status(400).json({
        success: false,
        message: "name, college, department, semester required"
      });
    }

    // ── Duplicate check ──
    let existing = null;

    if (code && code.trim()) {
      existing = await Subject.findOne({
        code: code.trim(),
        college,
        department,
        semester: Number(semester),
      });
    }

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Subject with this code already exists"
      });
    }

    // ── Create Subject ──
    const subject = await Subject.create({
      name: name.trim(),
      code: code?.trim() || "",
      type: type || "Theory",
      college,
      department,
      semester: Number(semester),
      credits: credits || 0,
      description: description || "",
    });

    res.status(201).json({
      success: true,
      message: "Subject added!",
      subject
    });

  } catch (e) {

    console.log("❌ Subject Add Error:", e);

    res.status(500).json({
      success: false,
      message: e.message
    });
  }
});

// ── Update subject (admin) ──
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
    res.json({ success: true, subject });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Delete subject (admin) ──
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
    res.json({ success: true, message: "Subject deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;