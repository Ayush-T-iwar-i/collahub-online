const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const sendEmail = require("../utils/sendEmail");

const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

// ================= SEND EMAIL OTP (Registration) =================
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
    global.emailOtpStore[email] = { otp, expire: Date.now() + 10 * 60 * 1000, verified: false };
    await sendEmail(email, `Your OTP is: ${otp}`);
    res.json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// ================= VERIFY OTP (Registration) =================
exports.verifyOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP required" });
    }
    email = email.toLowerCase().trim();
    global.emailOtpStore = global.emailOtpStore || {};
    const stored = global.emailOtpStore[email];
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
    let { name, email, password, phone, admissionYear, department, college, gender } = req.body;
    email = email?.toLowerCase().trim();
    if (!name || !email || !password || !phone || !admissionYear || !department || !college) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }
    global.emailOtpStore = global.emailOtpStore || {};
    const stored = global.emailOtpStore[email];
    if (!stored || !stored.verified) {
      return res.status(400).json({ success: false, message: "Email not verified. Please verify OTP first." });
    }
    const existEmail = await User.findOne({ email });
    if (existEmail) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }
    const deptMatch = department?.match(/\(([^)]+)\)/);
    const deptCode  = deptMatch ? deptMatch[1].toUpperCase() : department?.split(" ")[0].toUpperCase() || "DEPT";
    const year      = admissionYear || new Date().getFullYear();
    const prefix    = `${year}-${deptCode}-`;
    const count     = await User.countDocuments({ role: "student", studentId: { $regex: `^${prefix}` } });
    const studentId = `${prefix}${String(count + 1).padStart(3, "0")}`;
    const currentYear  = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const yearDiff     = currentYear - parseInt(admissionYear);
    const isOddSem     = currentMonth >= 7;
    let semester       = yearDiff * 2 + (isOddSem ? 1 : 2);
    if (semester < 1) semester = 1;
    if (semester > 8) semester = 8;
    const hash = await bcrypt.hash(password, 10);
    const student = await User.create({
      name, email, phone, studentId, admissionYear,
      department: department?.trim(), college: college?.trim(),
      gender, password: hash, role: "student", semester, isEmailVerified: true,
    });
    delete global.emailOtpStore[email];
    res.status(201).json({
      success: true, message: "Registered successfully! You can now login.",
      studentId: student.studentId, semester: student.semester,
    });
  } catch (error) {
    console.log("REGISTER ERROR:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= LOGIN — Step 1: Check credentials → Send OTP =================
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

    // Generate login OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    global.loginOtpStore = global.loginOtpStore || {};
    global.loginOtpStore[email] = {
      otp,
      expire: Date.now() + 10 * 60 * 1000, // 10 minutes
      userId: user._id,
      role:   user.role,
    };

    // Send OTP email
    try {
      await sendEmail(
        email,
        `CollaHub Login OTP: ${otp}\n\nValid for 10 minutes.\nDo not share this OTP with anyone.\n\n- CollaHub Team`
      );
    } catch (emailErr) {
      console.error("❌ Email send failed:", emailErr.message);
      // Dev mode — print OTP in terminal
      console.log(`\n🔐 DEV OTP for ${email} [${user.role}]: ${otp}\n`);
    }

    // Always return success with role — OTP printed in terminal if email fails
    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      email,
      role: user.role, // Frontend role badge ke liye
    });

  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ================= LOGIN — Step 2: Verify OTP → Issue Tokens =================
exports.loginVerifyOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP required" });
    }

    email = email.toLowerCase().trim();
    global.loginOtpStore = global.loginOtpStore || {};
    const stored = global.loginOtpStore[email];

    if (!stored) {
      return res.status(400).json({ success: false, message: "OTP not found. Please login again." });
    }

    if (Date.now() > stored.expire) {
      delete global.loginOtpStore[email];
      return res.status(400).json({ success: false, message: "OTP expired. Please login again." });
    }

    if (stored.otp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // OTP verified — clear it
    delete global.loginOtpStore[email];

    const user = await User.findById(stored.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      role: user.role,
      user: {
        // Common fields
        id:           user._id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        phone:        user.phone,
        profileImage: user.profileImage,
        college:      user.college,
        department:   user.department,
        // Student fields
        studentId:    user.studentId,
        admissionYear: user.admissionYear,
        semester:     user.semester,
        section:      user.section,
        gender:       user.gender,
        // Teacher fields
        teacherId:    user.teacherId,
        university:   user.university,
        age:          user.age,
      },
    });

  } catch (error) {
    console.error("OTP verify error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ================= REFRESH TOKEN =================
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: "No token provided" });
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user    = await User.findById(decoded.id);
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
    user.otp       = otp;
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
    user.password  = await bcrypt.hash(newPassword, 10);
    user.otp       = undefined;
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