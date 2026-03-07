const express = require("express");
const router = express.Router();

const {
  verifyToken,
  isTeacher,
  isStudent,
  isAdmin,
} = require("../middleware/authMiddleware");

const {
  getStudentResult,
  uploadResult,
  getStudentResultById,
  deleteResult,
  syncSemesters,
  getSubjectRanking,
  exportResultPDF,
  generateCertificate,
} = require("../controllers/resultController");

// ── Student routes ──
router.get("/my", verifyToken, isStudent, getStudentResult);
router.get("/export-pdf", verifyToken, isStudent, exportResultPDF);
router.get("/certificate", verifyToken, isStudent, generateCertificate);

// ── Admin routes ──
router.post("/upload", verifyToken, isAdmin, uploadResult);
router.post("/sync-semesters", verifyToken, isAdmin, syncSemesters);
router.get("/student/:id", verifyToken, getStudentResultById);
router.delete("/:studentId/:semester", verifyToken, isAdmin, deleteResult);

// ── Teacher routes ──
router.get("/rank/:subjectId", verifyToken, isTeacher, getSubjectRanking);

module.exports = router;