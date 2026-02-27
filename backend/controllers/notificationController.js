const Notification = require("../models/Notification");

// ================= GET MY NOTIFICATIONS =================
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json({ success: true, notifications });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= MARK AS READ =================
// ✅ Moved here from noticeController (correct place)
exports.markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });

    res.json({ success: true, message: "Notification marked as read" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= MARK ALL AS READ =================
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, message: "All notifications marked as read" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= DELETE NOTIFICATION =================
exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};