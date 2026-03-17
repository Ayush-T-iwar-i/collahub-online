const express = require("express");
const router  = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getStudentByEmail,
  getMyProfile,
  uploadProfileImage,
  upload,
} = require("../controllers/studentController");

// GET /student/me          → fresh profile from DB
router.get("/me", verifyToken, getMyProfile);

// GET /student/email/:email
router.get("/email/:email", verifyToken, getStudentByEmail);

// POST /student/upload-profile  → Cloudinary upload
router.post(
  "/upload-profile",
  verifyToken,
  upload.single("profileImage"),
  uploadProfileImage
);

module.exports = router;