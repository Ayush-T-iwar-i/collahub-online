const validator = require("validator");
const sendEmail = require("../utils/sendEmail");

// Temporary in-memory OTP store
const otpStore = {};

/* ================= SEND EMAIL OTP ================= */
const sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ message: "Valid email required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore[normalizedEmail] = otp;

    await sendEmail(normalizedEmail, otp);

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.log("OTP ERROR:", error.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

/* ================= VERIFY EMAIL OTP ================= */
const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    if (!otpStore[normalizedEmail]) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    if (otpStore[normalizedEmail] == otp) {
      delete otpStore[normalizedEmail];
      return res.json({ message: "Email verified successfully" });
    }

    res.status(400).json({ message: "Invalid OTP" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  sendEmailOtp,
  verifyEmailOtp,
};