const Notes = require("../models/Notes");

// ================= UPLOAD NOTES =================
exports.uploadNotes = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const notes = await Notes.create({
      title: req.body.title,
      subjectId: req.body.subjectId,
      file: req.file.filename,
    });

    res.status(201).json({ success: true, notes });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET ALL NOTES =================
exports.getAllNotes = async (req, res) => {
  try {
    const notes = await Notes.find().populate("subjectId", "name");
    res.json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= DELETE NOTES =================
exports.deleteNotes = async (req, res) => {
  try {
    await Notes.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Notes deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};