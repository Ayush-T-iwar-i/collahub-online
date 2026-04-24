const express = require("express");
const router  = express.Router();
const rateLimit = require("express-rate-limit");

const {
  sendEmailOtp,
  verifyOtp,
  register,
  login,
  loginVerifyOtp,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controllers/authController");

const { verifyToken } = require("../middleware/authMiddleware");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many attempts, try again later" },
});

router.use(authLimiter);

// Registration flow
router.post("/send-email-otp",   sendEmailOtp);
router.post("/verify-email-otp", verifyOtp);
router.post("/register",         register);

// Login flow — 2 steps
router.post("/login",            login);           // Step 1: email + password -> send OTP
router.post("/login-verify-otp", loginVerifyOtp);  // Step 2: OTP verify → tokens

// Other
router.post("/refresh-token",    refreshToken);
router.post("/forgot-password",  forgotPassword);
router.post("/reset-password",   resetPassword);

// Protected
router.post("/logout",           verifyToken, logout);
router.put("/change-password",   verifyToken, changePassword);

module.exports = router;