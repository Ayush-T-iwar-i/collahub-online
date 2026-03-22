// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  const status  = err.statusCode || err.status || 500;
  const message = err.message    || "Internal Server Error";

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(400).json({ success: false, message: `${field} already exists.` });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError")  return res.status(401).json({ success: false, message: "Invalid token." });
  if (err.name === "TokenExpiredError")  return res.status(401).json({ success: false, message: "Token expired." });

  if (status >= 500) console.error("❌ Server Error:", message);

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;