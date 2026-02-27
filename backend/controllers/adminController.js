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

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

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

    res.json({
      message: "Admin login successful",
      accessToken,
      user,
    });
  } catch (error) {
    console.log("ADMIN LOGIN ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
};