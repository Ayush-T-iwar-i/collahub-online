// middleware/authMiddleware.js
const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// ══════════════════════════════════════════════════════════
// VERIFY TOKEN
// ══════════════════════════════════════════════════════════
exports.verifyToken = async (req, res, next) => {
  try {
    // System shutdown check — only super-admin passes
    if (global.systemShutdown) {
      const header = req.headers.authorization;
      if (header?.startsWith("Bearer ")) {
        const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
        if (decoded.role === "super-admin") {
          req.user = await User.findById(decoded.id).select("-password");
          return next();
        }
      }
      return res.status(503).json({
        success:  false,
        shutdown: true,
        message:  global.shutdownMessage || "System is under maintenance. Please try again later.",
      });
    }

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized. Token missing." });
    }

    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(
  decoded.id || decoded.userId || decoded._id
).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Token invalid or expired." });
  }
};

// Alias
exports.protect = exports.verifyToken;

// ══════════════════════════════════════════════════════════
// ROLE GUARDS
// ══════════════════════════════════════════════════════════
const deny = (res, msg) =>
  res.status(403).json({ success: false, message: msg });

exports.isAdmin        = (req, res, next) => req.user.role === "admin"        ? next() : deny(res, "Admins only.");
exports.isTeacher      = (req, res, next) => req.user.role === "teacher"      ? next() : deny(res, "Teachers only.");
exports.isStudent      = (req, res, next) => req.user.role === "student"      ? next() : deny(res, "Students only.");
exports.isSuperAdmin   = (req, res, next) => req.user.role === "super-admin"  ? next() : deny(res, "Super Admins only.");

exports.isTeacherOrAdmin = (req, res, next) =>
  ["teacher", "admin"].includes(req.user.role) ? next() : deny(res, "Teachers or Admins only.");

// ── Dynamic role check ──
exports.authorizeRoles = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : deny(res, `Access denied. Required: ${roles.join(" or ")}`);

exports.allowRoles = exports.authorizeRoles;