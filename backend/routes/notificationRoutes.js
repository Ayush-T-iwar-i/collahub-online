const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

// GET /notifications — fetch all notifications for current user
router.get("/", verifyToken, getMyNotifications);

// PUT /notifications/read-all — mark all as read (must be BEFORE /:id)
router.put("/read-all", verifyToken, markAllAsRead);

// PUT /notifications/:id/read — mark single as read
router.put("/:id/read", verifyToken, markAsRead);

// DELETE /notifications/:id — delete notification
router.delete("/:id", verifyToken, deleteNotification);

module.exports = router;