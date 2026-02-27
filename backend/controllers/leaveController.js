const Leave = require("../models/Leave");
const User = require("../models/User");
const Notification = require("../models/Notification");
const sendEmail = require("../utils/sendEmail");

// ================= STUDENT APPLY LEAVE =================
exports.applyLeave = async (req, res) => {
  try {
    const { reason, fromDate, toDate } = req.body;

    if (!reason || !fromDate || !toDate) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const leave = await Leave.create({
      studentId: req.user.id,
      reason,
      fromDate,
      toDate,
    });

    const teachers = await User.find({ role: "teacher" });

    for (let teacher of teachers) {
      await Notification.create({
        userId: teacher._id,
        title: "New Leave Request",
        message: `New leave request from student.\nReason: ${reason}`,
      });

      await sendEmail(
        teacher.email,
        `New Leave Request\n\nReason: ${reason}\nFrom: ${fromDate}\nTo: ${toDate}`
      );
    }

    res.status(201).json({
      success: true,
      message: "Leave applied successfully",
      leave,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= VIEW ALL LEAVES =================
exports.getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate("studentId", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, leaves });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET MY LEAVES (Student) =================
exports.getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ studentId: req.user.id })
      .sort({ createdAt: -1 });

    res.json({ success: true, leaves });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= APPROVE / REJECT =================
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("studentId");

    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave not found" });
    }

    await Notification.create({
      userId: leave.studentId._id,
      title: "Leave Status Updated",
      message: `Your leave request has been ${status}`,
    });

    await sendEmail(
      leave.studentId.email,
      `Your leave request has been ${status}`
    );

    res.json({
      success: true,
      message: "Leave status updated",
      leave,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};