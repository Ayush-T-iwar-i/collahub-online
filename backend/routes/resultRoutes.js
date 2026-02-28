const express = require("express");
const router  = express.Router();

const {
  verifyToken,
  isTeacher,
  isStudent,
  protect,     // fallback agar protect use ho raha ho
} = require("../middleware/authMiddleware");

const {
  getStudentResult,       // student apna result dekhe (assignment based)
  uploadResult,           // admin semester result upload kare
  getStudentResultById,   // admin kisi ka bhi result dekhe
  deleteResult,           // admin result delete kare
  syncSemesters,          // admin semesters sync kare admission year se
  getSubjectRanking,      // teacher subject ranking dekhe
  exportResultPDF,        // student PDF download kare
  generateCertificate,    // student certificate download kare
} = require("../controllers/resultController");

// auth middleware — dono me se jo available ho
const auth      = verifyToken || protect;
const authStudent = [auth, isStudent].filter(Boolean);
const authTeacher = [auth, isTeacher].filter(Boolean);

// ── Student routes ──
router.get("/results/my",            ...authStudent, getStudentResult);
router.get("/results/export-pdf",    ...authStudent, exportResultPDF);
router.get("/results/certificate",   ...authStudent, generateCertificate);

// ── Admin routes ──
router.post("/results/upload",              auth, uploadResult);
router.post("/results/sync-semesters",      auth, syncSemesters);
router.get("/results/student/:id",          auth, getStudentResultById);
router.delete("/results/:studentId/:semester", auth, deleteResult);

// ── Teacher routes ──
router.get("/results/rank/:subjectId",  ...authTeacher, getSubjectRanking);

module.exports = router;