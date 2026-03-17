const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");
const Notification = require("../models/Notification");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// ════════════════════════════════════════
// HELPER — upload buffer to Cloudinary
// ════════════════════════════════════════
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// ════════════════════════════════════════
// SUBMIT ASSIGNMENT (Student)
// POST /submissions
// ════════════════════════════════════════
exports.submitAssignment = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { assignmentId } = req.body;

    if (!assignmentId) {
      return res.status(400).json({ success: false, message: "Assignment ID required" });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    // Check if already submitted
    const existing = await Submission.findOne({ assignmentId, studentId });
    if (existing) {
      return res.status(400).json({ success: false, message: "Already submitted" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "File required" });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      "collahub/submissions"
    );

    const submission = await Submission.create({
      assignmentId,
      studentId,
      studentName: req.user.name,
      college: req.user.college,
      department: req.user.department,
      semester: req.user.semester,
      file: uploadResult.secure_url,
      fileName: req.file.originalname,
    });

    // Notify teacher
    await Notification.create({
      userId: assignment.teacherId,
      title: "New Submission",
      message: `${req.user.name} submitted "${assignment.title}"`,
      type: "submission",
      refId: submission._id,
    });

    res.status(201).json({ success: true, submission, message: "Submitted successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ════════════════════════════════════════
// GET MY SUBMISSIONS (Student)
// GET /submissions/my
// ════════════════════════════════════════
exports.getMySubmissions = async (req, res) => {
  try {
    const studentId = req.user.id;
    const submissions = await Submission.find({ studentId })
      .populate("assignmentId", "title subjectName dueDate maxMarks")
      .sort("-submittedAt");
    res.json({ success: true, submissions });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ════════════════════════════════════════
// GET ALL SUBMISSIONS FOR TEACHER
// GET /submissions/all
// Only submissions for THIS teacher's assignments
// ════════════════════════════════════════
exports.getAllSubmissions = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Get all assignment IDs created by this teacher
    const assignments = await Assignment.find({ teacherId }).select("_id");
    const assignmentIds = assignments.map((a) => a._id);

    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } })
      .populate("assignmentId", "title subjectName dueDate maxMarks")
      .populate("studentId", "name enrollmentNo")
      .sort("-submittedAt");

    res.json({ success: true, submissions });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ════════════════════════════════════════
// GRADE SUBMISSION (Teacher)
// PUT /submissions/:id/marks
// ════════════════════════════════════════
exports.gradeSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { marks, feedback } = req.body;

    if (marks === undefined || marks === null) {
      return res.status(400).json({ success: false, message: "Marks required" });
    }

    const submission = await Submission.findById(id).populate(
      "assignmentId",
      "title maxMarks teacherId"
    );
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    // Only the assignment's teacher can grade
    if (String(submission.assignmentId.teacherId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (marks > submission.assignmentId.maxMarks) {
      return res.status(400).json({
        success: false,
        message: `Marks cannot exceed max marks (${submission.assignmentId.maxMarks})`,
      });
    }

    submission.marks = marks;
    submission.feedback = feedback || null;
    submission.gradedAt = new Date();
    submission.gradedBy = req.user.id;
    await submission.save();

    // Notify student
    await Notification.create({
      userId: submission.studentId,
      title: "Assignment Graded",
      message: `Your submission for "${submission.assignmentId.title}" was graded: ${marks}/${submission.assignmentId.maxMarks}`,
      type: "grade",
      refId: submission._id,
    });

    res.json({ success: true, submission, message: "Graded successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};