const Announcement = require("../models/Announcement");

/* ================= GET ALL ANNOUNCEMENTS ================= */
const getAnnouncements = async (req, res) => {
  try {
    const data = await Announcement.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAnnouncements,
};