require("dotenv").config();

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const rateLimit    = require("express-rate-limit");
const connectDB    = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const logger       = require("./middleware/logger");

const app  = express();
const PORT = process.env.PORT || 5000;

connectDB();

// ── CORS must be BEFORE helmet ──
app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","x-refresh-token"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy:   false,
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: "Too many attempts, try again after 15 minutes." },
  standardHeaders: true, legacyHeaders: false,
});
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true, legacyHeaders: false,
});
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true, legacyHeaders: false,
});

app.use("/auth",  authLimiter);
app.use("/otp",   authLimiter);
app.use("/admin", adminLimiter);
app.use(generalLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(logger);
app.use("/uploads", express.static("uploads"));

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
app.use("/super-admin",      require("./routes/superAdminRoutes"));
app.use("/biometric",        require("./routes/biometricRoutes"));

app.get("/health", (req, res) => {
  res.json({ success: true, message: "CollaHub API is running 🚀" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
});