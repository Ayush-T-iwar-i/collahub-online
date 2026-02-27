const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ================= REGISTER STUDENT ================= */
const registerStudent = async (req, res) => {
  try {
    let {
      name,
      email,
      password,
      phone,
      studentId,
      department,
      gender,
      admissionYear,
      college,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !phone ||
      !studentId ||
      !department ||
      !gender ||
      !admissionYear ||
      !college
    ) {
      return res.status(400).json({ message: "All fields required" });
    }

    email = email.toLowerCase().trim();
    studentId = studentId.toUpperCase().trim();

    const emailExist = await User.findOne({ email });
    if (emailExist)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
      phone,
      studentId,
      department,
      gender,
      admissionYear,
      college,
    });

    res.status(201).json({ message: "Student registered successfully" });
  } catch (error) {
    console.log("STUDENT REGISTER ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= LOGIN STUDENT ================= */
const loginStudent = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    if (!user || user.role !== "student")
      return res.status(400).json({ message: "Invalid student credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid student credentials" });

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({
      message: "Student login successful",
      accessToken,
      user,
    });
  } catch (error) {
    console.log("STUDENT LOGIN ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET STUDENT BY EMAIL ================= */
const getStudentByEmail = async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();

    const student = await User.findOne({ email }).select(
      "-password -refreshToken"
    );

    if (!student)
      return res.status(404).json({ message: "Student not found" });

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  getStudentByEmail,
};