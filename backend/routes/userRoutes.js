const express = require("express");
const router = express.Router();
const multer = require("multer");

const { verifyToken } = require("../middleware/authMiddleware");
const User = require("../models/User");

const {
  updateProfile,
  uploadProfileImage
} = require("../controllers/userController");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ================= GET PROFILE =================
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ================= UPDATE PROFILE =================
router.put("/update-profile", verifyToken, updateProfile);

// ================= UPLOAD PROFILE IMAGE =================
router.post(
  "/upload-profile-image",
  verifyToken,
  upload.single("profileImage"),
  uploadProfileImage
);

module.exports = router;