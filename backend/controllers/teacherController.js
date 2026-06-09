const User      = require("../models/User");
const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const validator = require("validator");

/* ================= REGISTER TEACHER ================= */
const registerTeacher = async (req, res) => {
  try {
    let { name, email, password, phone, teacherId, college, department, university, age } = req.body;

    // teacherId bhi required hai ab
    if (!name || !email || !password || !phone || !teacherId || !college || !department) {
      return res.status(400).json({
        success: false,
        message: "All fields required (name, email, password, phone, teacherId, college, department)",
      });
    }

    email      = email.toLowerCase().trim();
    department = department.trim();
    college    = college.trim();
    teacherId  = teacherId.trim();

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const emailExist = await User.findOne({ email });
    if (emailExist) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // Check if teacherId already in use
    const teacherIdExist = await User.findOne({ teacherId });
    if (teacherIdExist) {
      return res.status(400).json({ success: false, message: "Teacher ID already in use. Please enter a unique Teacher ID." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      teacherId,
      name,
      email,
      password: hashedPassword,
      role:       "teacher",
      phone,
      college,
      department,
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
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    if (!user || user.role !== "teacher") {
      return res.status(400).json({ success: false, message: "Invalid teacher credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Invalid teacher credentials" });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success:      true,
      message:      "Teacher login successful",
      accessToken,
      refreshToken,
      user: {
        id:           user._id,
        teacherId:    user.teacherId,
        name:         user.name,
        email:        user.email,
        phone:        user.phone,
        college:      user.college,
        department:   user.department,   // ✅ department response mein bhi
        university:   user.university,
        age:          user.age,
        role:         user.role,
        profileImage: user.profileImage,
      },
    });

  } catch (error) {
    console.log("TEACHER LOGIN ERROR:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { registerTeacher, loginTeacher };