const express = require("express");
const router = express.Router();
const Subject = require("../models/Subject"); // ✅ import missing tha

const {
  createSubject,
  getSubjects,
  getSubjectById,
  deleteSubject,
} = require("../controllers/subjectController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// ================= CREATE =================
router.post("/create", verifyToken, isAdmin, createSubject);

// ================= GET ALL =================
router.get("/all", verifyToken, getSubjects);

// ================= GET BY ID =================
router.get("/:id", verifyToken, getSubjectById);

// ================= UPDATE =================
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const updated = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= DELETE =================
router.delete("/:id", verifyToken, isAdmin, deleteSubject);

module.exports = router; // ✅ moved to end