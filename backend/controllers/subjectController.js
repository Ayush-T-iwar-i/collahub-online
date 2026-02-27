const Subject = require("../models/Subject");

// ================= CREATE SUBJECT =================
exports.createSubject = async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET ALL SUBJECTS =================
exports.getSubjects = async (req, res) => {
  try { // ✅ try/catch was missing
    const subjects = await Subject.find()
      .populate("courseId")
      .populate("teacherId");

    res.json({ success: true, subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET SUBJECT BY ID =================
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate("courseId")
      .populate("teacherId");

    if (!subject)
      return res.status(404).json({ success: false, message: "Subject not found" });

    res.json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= DELETE SUBJECT =================
exports.deleteSubject = async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Subject deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};