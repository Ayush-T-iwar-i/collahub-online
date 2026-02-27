const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

/* ================= GENERATE TEACHER ID ================= */
const generateTeacherId = async (college) => {
  const year = new Date().getFullYear();

  const collegeCode = college
    .toUpperCase()
    .replace(/\s+/g, "")
    .substring(0, 4);

  const count = await User.countDocuments({
    role: "teacher",
    college: college,
  });

  const serial = (count + 1).toString().padStart(3, "0");

  return `${year}${collegeCode}${serial}`;
};

/* ================= REGISTER TEACHER ================= */
const registerTeacher = async (req, res) => {
  try {
    let { name, email, password, phone, college, university, age } = req.body;

    // ✅ Required fields check
    if (!name || !email || !password || !phone || !college) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    email = email.toLowerCase().trim();

    // ✅ Email format validate
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // ✅ Password length check
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const emailExist = await User.findOne({ email });
    if (emailExist) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const teacherId = await generateTeacherId(college);

    await User.create({
      teacherId,
      name,
      email,
      password: hashedPassword,
      role: "teacher",
      phone,
      college,
      university,
      age: age ? Number(age) : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Teacher registered successfully",
    });

  } catch (error) {
    console.log("TEACHER REGISTER ERROR:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= LOGIN TEACHER ================= */
const loginTeacher = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    if (!user || user.role !== "teacher") {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher credentials",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher credentials",
      });
    }

    // ✅ Access Token
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // ✅ Refresh Token (added - was missing)
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      message: "Teacher login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        teacherId: user.teacherId,
        name: user.name,
        email: user.email,
        college: user.college,
        university: user.university,
        role: user.role,
        profileImage: user.profileImage,
      },
    });

  } catch (error) {
    console.log("TEACHER LOGIN ERROR:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  registerTeacher,
  loginTeacher,
};