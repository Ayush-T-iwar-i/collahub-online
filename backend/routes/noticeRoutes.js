const express = require("express");
const router = express.Router();

const {
  verifyToken,
  isTeacherOrAdmin,
} = require("../middleware/authMiddleware");

const {
  createNotice,
  getAllNotices,
  deleteNotice,
} = require("../controllers/noticeController");

// ================= CREATE NOTICE (Teacher or Admin) =================
router.post("/create", verifyToken, isTeacherOrAdmin, createNotice);

// ================= GET ALL NOTICES =================
router.get("/all", verifyToken, getAllNotices);

// ================= DELETE NOTICE =================
router.delete("/:id", verifyToken, isTeacherOrAdmin, deleteNotice);

module.exports = router;