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
router.get("/my",            ...authStudent, getStudentResult);
router.get("/export-pdf",    ...authStudent, exportResultPDF);
router.get("/certificate",   ...authStudent, generateCertificate);

// ── Admin routes ──
router.post("/upload",              auth, uploadResult);
router.post("/sync-semesters",      auth, syncSemesters);
router.get("/student/:id",          auth, getStudentResultById);
router.delete("/:studentId/:semester", auth, deleteResult);

// ── Teacher routes ──
router.get("/rank/:subjectId",  ...authTeacher, getSubjectRanking);

module.exports = router;