// middleware/uploadMiddleware.js
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

// Ensure uploads dir exists
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
ensureDir("uploads");
ensureDir("uploads/notes");
ensureDir("uploads/assignments");

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename:    (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

// ── Filters ──
const imageFilter = (req, file, cb) =>
  file.mimetype.startsWith("image/")
    ? cb(null, true)
    : cb(new Error("Only image files allowed."), false);

const documentFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg", "image/png", "image/webp",
  ];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("File type not allowed."), false);
};

const anyFilter = (req, file, cb) => cb(null, true);

// ── Exportable instances ──
exports.uploadImage    = multer({ storage: diskStorage, fileFilter: imageFilter,   limits: { fileSize: 5  * 1024 * 1024 } });
exports.uploadDocument = multer({ storage: diskStorage, fileFilter: documentFilter, limits: { fileSize: 20 * 1024 * 1024 } });
exports.uploadAny      = multer({ storage: diskStorage, fileFilter: anyFilter,      limits: { fileSize: 50 * 1024 * 1024 } });
exports.uploadMemory   = multer({ storage: multer.memoryStorage(),                  limits: { fileSize: 50 * 1024 * 1024 } });

// Default export (backward compat)
module.exports = exports.uploadDocument;
module.exports.uploadImage    = exports.uploadImage;
module.exports.uploadDocument = exports.uploadDocument;
module.exports.uploadAny      = exports.uploadAny;
module.exports.uploadMemory   = exports.uploadMemory;