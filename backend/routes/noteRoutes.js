// routes/noteRoutes.js
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const ctrl    = require("../controllers/noteController");
const { verifyToken } = require("../middleware/authMiddleware");

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Teacher routes
router.post  ("/upload",      verifyToken, upload.single("file"), ctrl.uploadNote);
router.get   ("/my",          verifyToken, ctrl.getMyNotes);
router.delete("/:id",         verifyToken, ctrl.deleteNote);

// Student routes
router.get   ("/for-student", verifyToken, ctrl.getNotesForStudent);

// General
router.get   ("/by-subject",  verifyToken, ctrl.getNotesBySubject);

module.exports = router;