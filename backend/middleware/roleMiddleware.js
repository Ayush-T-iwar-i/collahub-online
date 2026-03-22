// middleware/allowRoles.js
// Standalone role guard — use in older routes
exports.allowRoles = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ success: false, message: `Access denied. Required: ${roles.join(" or ")}` });