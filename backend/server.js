require("dotenv").config();

const express        = require("express");
const cors           = require("cors");
const helmet         = require("helmet");
const rateLimit      = require("express-rate-limit");
const connectDB      = require("./config/db");
const errorHandler   = require("./middleware/errorHandler");
const logger         = require("./middleware/logger");

const app  = express();
const PORT = process.env.PORT || 5000;

connectDB();

// ── CORS — Fix 1: specific origins ──
const allowedOrigins = [
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:5000",
  "http://10.0.2.2:5000",
  // ✅ Apna production domain yahan add karo jab deploy karo:
  // "https://yourdomain.com",
  // "https://your-railway-app.railway.app",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, true); // ✅ Dev mein sab allow — production mein neeche wali line use karo
    // Production ke liye yeh use karo:
    // return callback(new Error("Not allowed by CORS"));
  },
  methods:      ["GET","POST","PUT","DELETE","PATCH","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","x-refresh-token","Cache-Control","Pragma"],
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

// ✅ Fix 3: MongoDB injection prevent karo (manual — express-mongo-sanitize conflict fix)
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return;
    Object.keys(obj).forEach(key => {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else if (typeof obj[key] === "object") {
        sanitize(obj[key]);
      }
    });
  };
  if (req.body)   sanitize(req.body);
  if (req.params) sanitize(req.params);
  next();
});

app.use(logger);

// ✅ 304 cache fix
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  next();
});

app.use("/uploads", express.static("uploads"));

// ── Routes ──
app.use("/auth",             require("./routes/authRoutes"));
app.use("/admin",            require("./routes/adminRoutes"));
app.use("/students",         require("./routes/studentTeacherRoutes"));
app.use("/teachers",         require("./routes/teacherManageRoutes"));
app.use("/student",          require("./routes/studentRoutes"));
app.use("/teacher",          require("./routes/teacherRoutes"));
app.use("/user",             require("./routes/userRoutes"));
app.use("/rooms",            require("./routes/roomRoutes"));
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
app.use("/notes",            require("./routes/noteRoutes"));
app.use("/otp",              require("./routes/otpRoutes"));
app.use("/announcements",    require("./routes/announcementRoutes"));
app.use("/api/posts",        require("./routes/postRoutes"));
app.use("/super-admin",      require("./routes/superAdminRoutes"));
app.use("/biometric",        require("./routes/biometricRoutes"));
app.use("/teacher-notes",    require("./routes/noteRoutes"));

app.get("/health", (req, res) => {
  res.json({ success: true, message: "CollaHub API is running 🚀" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
});