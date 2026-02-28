const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ================= REGISTER ADMIN ================= */
const registerAdmin = async (req, res) => {
  try {
    let { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });
    email = email.toLowerCase().trim();
    const emailExist = await User.findOne({ email });
    if (emailExist)
      return res.status(400).json({ message: "Email already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword, role: "admin" });
    res.status(201).json({ message: "Admin created successfully" });
  } catch (error) {
    console.log("ADMIN REGISTER ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= LOGIN ADMIN ================= */
const loginAdmin = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });
    email = email.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user || user.role !== "admin")
      return res.status(400).json({ message: "Invalid admin credentials" });
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid admin credentials" });
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ message: "Admin login successful", accessToken, user });
  } catch (error) {
    console.log("ADMIN LOGIN ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= ADD STUDENT (by Admin) ================= */
const addStudent = async (req, res) => {
  try {
    let {
      name, email, password, phone, studentId,
      admissionYear, college, department, semester, gender,
    } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password are required" });

    email = email.toLowerCase().trim();

    const emailExist = await User.findOne({ email });
    if (emailExist)
      return res.status(400).json({ message: "Email already registered" });

    if (studentId) {
      const idExist = await User.findOne({ studentId });
      if (idExist)
        return res.status(400).json({ message: "Student ID already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await User.create({
      name, email, password: hashedPassword,
      phone, studentId, admissionYear,
      college, department, semester, gender,
      role: "student",
      isEmailVerified: true,
    });

    res.status(201).json({
      message: "Student added successfully",
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        studentId: student.studentId,
        department: student.department,
        semester: student.semester,
      },
    });
  } catch (error) {
    console.log("ADD STUDENT ERROR:", error.message);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

/* ================= ADD TEACHER (by Admin) ================= */
const addTeacher = async (req, res) => {
  try {
    let { name, email, password, phone, teacherId, college, department } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password are required" });

    email = email.toLowerCase().trim();

    const emailExist = await User.findOne({ email });
    if (emailExist)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = await User.create({
      name, email, password: hashedPassword,
      phone, teacherId, college, department,
      role: "teacher",
      isEmailVerified: true,
    });

    res.status(201).json({
      message: "Teacher added successfully",
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        teacherId: teacher.teacherId,
        department: teacher.department,
      },
    });
  } catch (error) {
    console.log("ADD TEACHER ERROR:", error.message);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

module.exports = { registerAdmin, loginAdmin, addStudent, addTeacher };