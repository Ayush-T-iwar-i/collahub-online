require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./middleware/logger");

const app = express();
const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || "development";

// ── Trust Proxy — is ESSENTIAL for Railway ─────────────
app.set("trust proxy", 1);

// ── DB Connect ────────────────────────────────────────────
connectDB();

// ══════════════════════════════════════════════════════════
// CORS — Production + Development both handle
// ══════════════════════════════════════════════════════════
const ALLOWED_ORIGINS = [

  // Render backend
  "https://university-hub-code.onrender.com",

  // Production frontend domains
  "https://collahub.online",
  "https://www.collahub.online",
  "https://app.collahub.online",

  // Any Vercel preview deployment
  /^https:\/\/.*\.vercel\.app$/,

  // Any Render deployment
  /^https:\/\/.*\.onrender\.com$/,

  // Localhost
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:8083",
  "http://localhost:3000",
  "http://localhost:5000",

  // Android emulator
  "http://10.0.2.2:8081",
  "http://10.0.2.2:5000",

  // LAN devices
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    const allowed = ALLOWED_ORIGINS.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );

    if (allowed) {
      callback(null, true);
    } else {
      console.warn("⚠️  CORS blocked:", origin);
      // In development — allow anyway (easier testing)
      if (ENV === "development") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-refresh-token", "Cache-Control", "Pragma"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// ── Helmet ────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false, // Expo web needs this disabled
}));

// ── Rate Limiting ─────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: ENV === "production" ? 10 : 100, // More lenient in dev
  message: { success: false, message: "Too many attempts, try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ENV === "development", // Skip in dev
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: ENV === "production" ? 200 : 1000,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ENV === "development",
});

app.use("/auth", authLimiter);
app.use("/otp", authLimiter);
app.use("/admin", adminLimiter);
app.use(generalLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));


app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === "object") {
      Object.keys(obj).forEach(key => {
        if (key.startsWith("$") || key.includes(".")) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      });
    }
  };
  if (req.body) sanitize(req.body);
  if (req.query) {
 
  }
  next();
});

app.use(logger);


app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  next();
});

// ── Static files ─────────────────────────────────────────
// ⚠️ /uploads is public — no auth check. OK for dev, improve in production.
app.use("/uploads", express.static("uploads"));

// ── Health check — Railway uses this ─────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    app: "CollaHub API",
    version: "1.0.0",
    env: ENV,
    time: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    message: "CollaHub API is running 🚀",
    env: ENV,
    uptime: Math.floor(process.uptime()) + "s",
    time: new Date().toISOString(),
  });
});

// ── Debug route — check env vars (remove in production) ──
if (ENV !== "production") {
  app.get("/debug/env", (req, res) => {
    res.json({
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      EMAIL_USER: process.env.EMAIL_USER ? "✅ SET" : "❌ MISSING",
      EMAIL_PASS: process.env.EMAIL_PASS ? "✅ SET" : "❌ MISSING",
      MONGODB_URI: process.env.MONGODB_URI ? "✅ SET" : "❌ MISSING",
      JWT_SECRET: process.env.JWT_SECRET ? "✅ SET" : "❌ MISSING",
      CLOUD_NAME: process.env.CLOUD_NAME ? "✅ SET" : "❌ MISSING",
    });
  });
}

// ══════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════
app.use("/auth", require("./routes/authRoutes"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/students", require("./routes/studentTeacherRoutes"));
app.use("/teachers", require("./routes/teacherManageRoutes"));
app.use("/student", require("./routes/studentRoutes"));
app.use("/teacher", require("./routes/teacherRoutes"));
app.use("/user", require("./routes/userRoutes"));
app.use("/rooms", require("./routes/roomRoutes"));
app.use("/subjects", require("./routes/subjectRoutes"));
app.use("/timetable", require("./routes/timetableRoutes"));
app.use("/attendance", require("./routes/attendanceRoutes"));
app.use("/subject-requests", require("./routes/subjectRequestRoutes"));
app.use("/assignments", require("./routes/assignmentRoutes"));
app.use("/submissions", require("./routes/submissionRoutes"));
app.use("/results", require("./routes/resultRoutes"));
app.use("/notices", require("./routes/noticeRoutes"));
app.use("/notifications", require("./routes/notificationRoutes"));
app.use("/dashboard", require("./routes/dashboardRoutes"));
app.use("/courses", require("./routes/courseRoutes"));
app.use("/leaves", require("./routes/leaveRoutes"));
app.use("/notes", require("./routes/noteRoutes"));
app.use("/otp", require("./routes/otpRoutes"));
app.use("/announcements", require("./routes/announcementRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/super-admin", require("./routes/superAdminRoutes"));
app.use("/biometric", require("./routes/biometricRoutes"));
app.use("/teacher-notes", require("./routes/noteRoutes"));

// ── 404 handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
  });
});

// ── Global error handler ──────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log("\n╔══════════════════════════════════════╗");
  console.log(`║  🚀 CollaHub API running              ║`);
  console.log(`║  Port   : ${PORT.toString().padEnd(27)}║`);
  console.log(`║  Env    : ${ENV.padEnd(27)}║`);
  console.log(`║  Time   : ${new Date().toLocaleTimeString("en-IN").padEnd(27)}║`);
  console.log("╚══════════════════════════════════════╝\n");

  // Check critical env vars at startup
  const missing = [];
  if (!process.env.MONGODB_URI) missing.push("MONGODB_URI");
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!process.env.EMAIL_USER) missing.push("EMAIL_USER");
  if (!process.env.EMAIL_PASS) missing.push("EMAIL_PASS");

  if (missing.length > 0) {
    console.warn("⚠️  Missing environment variables:", missing.join(", "));
    console.warn("   OTP emails will NOT work without EMAIL_USER and EMAIL_PASS\n");
  } else {
    console.log("✅ All critical env vars found\n");
  }
});