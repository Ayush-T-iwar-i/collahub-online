const express = require("express");
const router = express.Router();
const {
  sendEmailOtp,
  verifyEmailOtp,
} = require("../controllers/otpController");

router.post("/send-email-otp", sendEmailOtp);
router.post("/verify-email-otp", verifyEmailOtp);

module.exports = router;