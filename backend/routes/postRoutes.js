const express = require("express");
const router  = express.Router();
const multer  = require("multer");

const {
  createPost, getAllPosts, toggleLike,
  addComment, getComments, deletePost,
} = require("../controllers/postController");

const { verifyToken } = require("../middleware/authMiddleware");

// Multer — memory storage, accept image/video/audio, max 50MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/","video/","audio/"];
    if (allowed.some(t => file.mimetype.startsWith(t))) cb(null, true);
    else cb(new Error("Only image, video, and audio files are allowed"));
  },
});

router.get   ("/",                verifyToken, getAllPosts);
router.post  ("/",                verifyToken, upload.single("media"), createPost);
router.post  ("/:id/like",       verifyToken, toggleLike);
router.post  ("/:id/comment",    verifyToken, addComment);
router.get   ("/:id/comments",   verifyToken, getComments);
router.delete("/:id",            verifyToken, deletePost);

module.exports = router;