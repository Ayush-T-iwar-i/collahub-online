// middleware/logger.js
const logger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const ms      = Date.now() - start;
    const status  = res.statusCode;
    const color   = status >= 500 ? "❌" : status >= 400 ? "⚠️ " : status >= 300 ? "↩️ " : "✅";
    console.log(`${color} ${req.method} ${req.originalUrl} ${status} — ${ms}ms`);
  });

  next();
};

module.exports = logger;