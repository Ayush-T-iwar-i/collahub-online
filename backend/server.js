require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");

const connectDB      = require("./config/db");
const errorHandler   = require("./middleware/errorHandler");
const logger         = require("./middleware/logger");

const app  = express();
const PORT = process.env.PORT || 5000;
const ENV  = process.env.NODE_ENV || "development";

// ── DB Connect ──
connectDB();

// ✅ Railway / Proxy ke liye REQUIRED — rate limiter fix
app.set("trust proxy", 1);

// ── CORS ──
const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.railway\.app$/,
  /^https:\/\/.*\.up\.railway\.app$/,
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:8083",
  "http://localhost:3000",
  "http://10.0.2.2:8081",
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    if (allowed) {
      callback(null, true);
    } else {
      console.warn("⚠️  CORS blocked:", origin);
      if (ENV === "development") {
        callback(null, true);
      } else {
        callback(null, true); // Production mein bhi allow — mobile app ke liye
      }
    }
  },
  methods:        ["GET","POST","PUT","DELETE","PATCH","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","x-refresh-token","Cache-Control","Pragma"],
  credentials:    true,
  preflightContinue:    false,
  optionsSuccessStatus: 204,
}));

// ── Helmet ──
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy:   false,
  contentSecurityPolicy:     false,
}));

// ── Rate Limiting ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: ENV === "production" ? 20 : 100,
  message: { success: false, message: "Too many attempts, try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: () => ENV === "development",
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: ENV === "production" ? 300 : 1000,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: () => ENV === "development",
});

app.use("/auth",  authLimiter);
app.use("/otp",   authLimiter);
app.use("/admin", adminLimiter);
app.use(generalLimiter);

// ── Body parsers ──
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── MongoDB injection protection ──
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

// ── Logger ──
app.use(logger);

// ── Cache headers ──
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  next();
});

// ── Static files ──
app.use("/uploads", express.static("uploads"));

// ── Health check ──
app.get("/", (req, res) => {
  res.json({ success: true, app: "CollaHub API", version: "1.0.0", env: ENV });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status:  "healthy",
    message: "CollaHub API is running 🚀",
    env:     ENV,
    uptime:  Math.floor(process.uptime()) + "s",
  });
});

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

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// ── Error handler ──
app.use(errorHandler);

// ── Start ──
app.listen(PORT, "0.0.0.0", () => {
  console.log("\n╔══════════════════════════════════════╗");
  console.log(`║  🚀 CollaHub API running              ║`);
  console.log(`║  Port : ${PORT.toString().padEnd(29)}║`);
  console.log(`║  Env  : ${ENV.padEnd(29)}║`);
  console.log("╚══════════════════════════════════════╝\n");

  const missing = [];
  if (!process.env.MONGODB_URI) missing.push("MONGODB_URI");
  if (!process.env.JWT_SECRET)  missing.push("JWT_SECRET");
  if (!process.env.EMAIL_USER)  missing.push("EMAIL_USER");
  if (!process.env.EMAIL_PASS)  missing.push("EMAIL_PASS");

  if (missing.length > 0) {
    console.warn("⚠️  Missing env vars:", missing.join(", "));
  } else {
    console.log("✅ All critical env vars found\n");
  }
});