const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const sendEmail = require("../utils/sendEmail");

const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

// ================= SEND EMAIL OTP =================
exports.sendEmailOtp = async (req, res) => {
  try {
    let { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Valid email required" });
    }

    email = email.toLowerCase().trim();

    const existUser = await User.findOne({ email });
    if (existUser && !existUser.otp) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    global.emailOtpStore = global.emailOtpStore || {};
    global.emailOtpStore[email] = {
      otp,
      expire: Date.now() + 10 * 60 * 1000,
      verified: false,
    };

    await sendEmail(email, `Your OTP is: ${otp}`);

    res.json({ success: true, message: "OTP sent to email" });

  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// ================= VERIFY OTP =================
// ✅ FIXED: Now checks global.emailOtpStore instead of User model
exports.verifyOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP required" });
    }

    email = email.toLowerCase().trim();

    global.emailOtpStore = global.emailOtpStore || {};
    const stored = global.emailOtpStore[email];

    // ✅ Key fix — was looking in User model before
    if (!stored) {
      return res.status(400).json({ success: false, message: "OTP not found. Please request again." });
    }

    if (Date.now() > stored.expire) {
      delete global.emailOtpStore[email];
      return res.status(400).json({ success: false, message: "OTP expired. Please request again." });
    }

    if (stored.otp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    global.emailOtpStore[email].verified = true;

    res.json({ success: true, message: "Email verified successfully" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    let { name, email, password, phone, studentId, admissionYear, department, college, gender } = req.body;

    email = email?.toLowerCase().trim();
    studentId = studentId?.toUpperCase().trim();

    if (!name || !email || !password || !phone || !studentId || !admissionYear || !department || !college) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    // ✅ Check OTP was verified
    global.emailOtpStore = global.emailOtpStore || {};
    const stored = global.emailOtpStore[email];
    if (!stored || !stored.verified) {
      return res.status(400).json({ success: false, message: "Email not verified. Please verify OTP first." });
    }

    const existEmail = await User.findOne({ email });
    if (existEmail) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const existId = await User.findOne({ studentId });
    if (existId) {
      return res.status(400).json({ success: false, message: "Student ID already registered" });
    }

    const hash = await bcrypt.hash(password, 10);

    await User.create({
      name, email, phone, studentId, admissionYear,
      department: department?.trim(),
      college: college?.trim(),
      gender, password: hash, role: "student",
    });

    delete global.emailOtpStore[email];

    res.status(201).json({ success: true, message: "Registered successfully! You can now login." });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    email = email.toLowerCase().trim();
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid password" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id, name: user.name, email: user.email,
        role: user.role, studentId: user.studentId,
        profileImage: user.profileImage, admissionYear: user.admissionYear,
        department: user.department, college: user.college,
      },
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ================= REFRESH TOKEN =================
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ success: false, message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user);
    res.json({ success: true, accessToken: newAccessToken });

  } catch (error) {
    res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
  }
};

// ================= LOGOUT =================
exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) { user.refreshToken = null; await user.save(); }
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;
    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpire = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendEmail(email, `Your password reset OTP is: ${otp}`);
    res.json({ success: true, message: "OTP sent to email" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;
    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    if (!user.otp || user.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.json({ success: true, message: "Password reset successful" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= CHANGE PASSWORD =================
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Old password is incorrect" });

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};