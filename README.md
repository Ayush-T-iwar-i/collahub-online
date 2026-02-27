# UNIVERSITY-HUB-CODE

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

const User = require("./models/User");
const sendEmail = require("./utils/sendEmail");

const app = express();

app.use(express.json());
app.use(cors());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🗄️ MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

/* ================= MODELS ================= */

// Announcement
const announcementSchema = new mongoose.Schema(
  {
    title: String,
    content: String,
    department: String,
  },
  { timestamps: true }
);

const Announcement = mongoose.model(
  "Announcement",
  announcementSchema
);

// 🔥 Post Model (NEW)
const postSchema = new mongoose.Schema(
  {
    teacherName: String,
    teacherImage: String,
    content: String,
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

/* ================= TEST ================= */

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

/* ================= POSTS ROUTES ================= */

// 🔥 GET ALL POSTS
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 🔥 CREATE POST (Teacher use karega)
app.post("/api/posts", async (req, res) => {
  try {
    const { teacherName, teacherImage, content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content required" });
    }

    const newPost = await Post.create({
      teacherName,
      teacherImage,
      content,
    });

    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= STUDENT ================= */

app.get("/student/:email", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();

    const student = await User.findOne({ email }).select(
      "-password -refreshToken"
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= ANNOUNCEMENTS ================= */

app.get("/announcements", async (req, res) => {
  try {
    const data = await Announcement.find().sort({
      createdAt: -1,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


/* ================= EMAIL OTP ================= */

const otpStore = {}; // temporary memory store

// 🔥 SEND EMAIL OTP
app.post("/send-email-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ message: "Valid email required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // store in memory
    otpStore[normalizedEmail] = otp;

    // send email
    await sendEmail(normalizedEmail, otp);

    res.json({ message: "OTP sent successfully" });

  } catch (error) {
    console.log("OTP ERROR:", error.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// 🔥 VERIFY EMAIL OTP
app.post("/verify-email-otp", async (req, res) => {
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
});

/* ================= STUDENT REGISTER ================= */
app.post("/student/register", async (req, res) => {
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
});




/* ================= GENERATE TEACHER ID ================= */
const generateTeacherId = async (college) => {

  const year = new Date().getFullYear();

  // College ke first 4 letters (spaces remove karke)
  const collegeCode = college
    .toUpperCase()
    .replace(/\s+/g, "")
    .substring(0, 4);

  // Count existing teachers from same college
  const count = await User.countDocuments({
    role: "teacher",
    college: college
  });

  const serial = (count + 1).toString().padStart(3, "0");

   const teacherId = `${year}${collegeCode}${serial}`;

  return teacherId;
};
/* ================= TEACHER REGISTER ================= */

app.post("/teacher/register", async (req, res) => {
  try {
    let { name, email, password, phone, college, university, age } = req.body;

    if (!name || !email || !password || !phone || !college) {
      return res.status(400).json({ message: "All fields required" });
    }

    email = email.toLowerCase().trim();

    const emailExist = await User.findOne({ email });
    if (emailExist)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    // 🔥 ADD THIS LINE
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

    res.status(201).json({ message: "Teacher registered successfully" });

  } catch (error) {
    console.log("TEACHER REGISTER FULL ERROR:", error);;
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= ADMIN REGISTER ================= */
app.post("/admin/register", async (req, res) => {
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
});

/* ================= STUDENT LOGIN ================= */
app.post("/student/login", async (req, res) => {
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
    res.status(500).json({ message: "Server error" });
  }
});


/* ================= TEACHER LOGIN ================= */

app.post("/teacher/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user || user.role !== "teacher")
      return res.status(400).json({ message: "Invalid teacher credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid teacher credentials" });

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

  res.json({
  message: "Teacher login successful",
  accessToken,
  user: {
    id: user._id,
    teacherId: user.teacherId,  // 🔥 ADD THIS
    name: user.name,
    email: user.email,
    college: user.college,
    university: user.university,
    role: user.role,
    profileImage: user.profileImage, // 🔥 ADD THIS
  },
});


  } catch (error) {
    console.log("TEACHER LOGIN ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});


/* ================= ADMIN LOGIN ================= */
app.post("/admin/login", async (req, res) => {
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
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});