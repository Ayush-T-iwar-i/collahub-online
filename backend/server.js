require("dotenv").config(); // ✅ Sirf ek baar, sabse upar

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const rateLimit    = require("express-rate-limit");
const connectDB    = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const logger       = require("./middleware/logger");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Database ──
connectDB();

// ── Security: Helmet (HTTP headers) ──
app.use(helmet({ crossOriginResourcePolicy: false })); // allows serving static uploads safely

// ── Security: Rate Limiting ──

// Auth routes pe strict — 10 attempts per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: "Too many attempts, try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders:   false,
});

// Baaki sab routes pe general — 100 requests per 15 min
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
});

app.use("/auth", authLimiter); // login/register strict limit
app.use("/otp",  authLimiter); // OTP bhi strict
app.use(generalLimiter);       // general limit sab routes pe

// ── Core Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);
app.use("/uploads", express.static("uploads"));

// ── Routes ──
app.use("/auth",             require("./routes/authRoutes"));
app.use("/admin",            require("./routes/adminRoutes"));
app.use("/students",         require("./routes/studentTeacherRoutes"));
app.use("/teachers",         require("./routes/teacherManageRoutes"));
app.use("/student",          require("./routes/studentRoutes"));
app.use("/teacher",          require("./routes/teacherRoutes"));
app.use("/user",             require("./routes/userRoutes"));
app.use("/subjects",         require("./routes/subjectRoutes"));
app.use("/timetable",        require("./routes/timetableRoutes"));
app.use("/attendance",       require("./routes/attendanceRoutes"));
app.use("/subject-requests", require("./routes/subjectRequestRoutes"));
app.use("/assignments",      require("./routes/assignmentRoutes"));
app.use("/submissions",      require("./routes/submissionRoutes"));
app.use("/results",          require("./routes/resultRoutes"));
app.use("/notices",          require("./routes/noticeRoutes"));
app.use("/notifications",    require("./routes/notificationRoutes"));
app.use("/dashboard",        require("./routes/dashboardRoutes"));
app.use("/courses",          require("./routes/courseRoutes"));
app.use("/leaves",           require("./routes/leaveRoutes"));
app.use("/notes",            require("./routes/notesRoutes"));
app.use("/otp",              require("./routes/otpRoutes"));
app.use("/announcements",    require("./routes/announcementRoutes"));
app.use("/api/posts",        require("./routes/postRoutes"));

// ── Health Check ──
app.get("/health", (req, res) => {
  res.json({ success: true, message: "CollaHub API is running 🚀" });
});

// ── Error Handler (hamesha sabse last mein) ──
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
});