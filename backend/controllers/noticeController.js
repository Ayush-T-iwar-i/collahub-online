const Notice = require("../models/Notice");

// ================= CREATE NOTICE =================
exports.createNotice = async (req, res) => {
  try {
    const { title, message } = req.body;

    const notice = await Notice.create({
      title,
      message,
      postedBy: req.user.id,
      role: req.user.role,
    });

    res.status(201).json({ success: true, notice });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET ALL NOTICES =================
exports.getAllNotices = async (req, res) => {
  try {
    const notices = await Notice.find()
      .populate("postedBy", "name role")
      .sort({ createdAt: -1 });

    res.json({ success: true, notices });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= DELETE NOTICE =================
exports.deleteNotice = async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Notice deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};