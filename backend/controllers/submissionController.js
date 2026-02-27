const Submission = require("../models/Submission");
const Notification = require("../models/Notification");
const Assignment = require("../models/Assignment");

// ================= SUBMIT ASSIGNMENT =================
exports.submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // ✅ Check already submitted
    const alreadySubmitted = await Submission.findOne({
      studentId: req.user.id,
      assignmentId,
    });

    if (alreadySubmitted) {
      return res.status(400).json({ success: false, message: "Already submitted" });
    }

    const submission = await Submission.create({
      studentId: req.user.id,
      assignmentId,
      file: req.file.path, // or req.file.filename depending on storage
    });

    res.status(201).json({ success: true, submission });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET ALL SUBMISSIONS (Teacher) =================
exports.getAllSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find()
      .populate("studentId", "name email")
      .populate("assignmentId", "title");

    res.json({ success: true, submissions });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET MY SUBMISSIONS (Student) =================
exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user.id })
      .populate("assignmentId", "title dueDate");

    res.json({ success: true, submissions });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GIVE MARKS (Teacher) =================
exports.giveMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const { marks } = req.body;

    if (marks === undefined || marks < 0) {
      return res.status(400).json({ success: false, message: "Valid marks required" });
    }

    const submission = await Submission.findByIdAndUpdate(
      id,
      { marks },
      { new: true }
    ).populate("studentId", "name email");

    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    // ✅ Notify student
    await Notification.create({
      userId: submission.studentId._id,
      title: "Marks Updated",
      message: `Your assignment has been graded. Marks: ${marks}`,
    });

    res.json({ success: true, submission });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};