const Assignment = require("../models/Assignment");
const Notification = require("../models/Notification");
const User = require("../models/User");

// ================= CREATE ASSIGNMENT =================
exports.createAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.create({
      title: req.body.title,
      description: req.body.description,
      subjectId: req.body.subjectId,
      file: req.file?.filename,
      dueDate: req.body.dueDate,
    });

    // ✅ Notification INSIDE function (was outside before — crash)
    const students = await User.find({ role: "student" });
    for (let student of students) {
      await Notification.create({
        userId: student._id,
        title: "New Assignment",
        message: `New assignment uploaded: ${assignment.title}`,
      });
    }

    res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      assignment,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET ALL ASSIGNMENTS =================
exports.getAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find().populate("subjectId");
    res.json({ success: true, assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET ASSIGNMENT BY ID =================
exports.getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate("subjectId");
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }
    res.json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= DELETE ASSIGNMENT =================
exports.deleteAssignment = async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Assignment deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};