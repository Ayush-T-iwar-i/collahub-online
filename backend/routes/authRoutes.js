const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

// ================= RATE LIMIT =================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts, try again later",
  },
});

router.use(authLimiter);

// ================= PUBLIC ROUTES =================
router.post("/send-email-otp", authController.sendEmailOtp);
router.post("/verify-email-otp", authController.verifyOtp);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// ================= PROTECTED ROUTES =================
router.post("/logout", verifyToken, authController.logout);
router.put("/change-password", verifyToken, authController.changePassword);

module.exports = router;