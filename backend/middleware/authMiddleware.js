const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ================= VERIFY TOKEN =================
exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Token missing.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token invalid or expired",
    });
  }
};

// ================= ROLE CHECKS =================
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admins only.",
    });
  }
  next();
};

exports.isTeacher = (req, res, next) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Teachers only.",
    });
  }
  next();
};

exports.isStudent = (req, res, next) => {
  if (req.user.role !== "student") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Students only.",
    });
  }
  next();
};

exports.isTeacherOrAdmin = (req, res, next) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Teachers or Admins only.",
    });
  }
  next();
};

// ================= GENERAL ROLE CHECK =================
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};