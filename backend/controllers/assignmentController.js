const Assignment = require("../models/Assignment");
const SubjectAssignment = require("../models/SubjectAssignment");
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
// CREATE ASSIGNMENT (Teacher)
// POST /assignments
// ════════════════════════════════════════
exports.createAssignment = async (req, res) => {
  try {
    const {
      title, description, subjectId, subjectName,
      college, department, semester, dueDate, maxMarks,
    } = req.body;
    const teacherId = req.user.id;

    if (!title || !subjectId || !dueDate) {
      return res.status(400).json({ success: false, message: "Title, Subject, and Due Date required" });
    }

    let fileUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, "collahub/assignments");
      fileUrl = uploadResult.secure_url;
    }

    const assignment = await Assignment.create({
      title,
      description,
      subjectId,
      subjectName,
      teacherId,
      teacherName: req.user.name,
      college,
      department,
      semester,
      dueDate,
      maxMarks: maxMarks || 100,
      file: fileUrl,
    });

    // Notify all students in the class
    // (Notification creation is optional here — can be done via a separate job)
    // For now, just return success

    res.status(201).json({ success: true, assignment, message: "Assignment created successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ════════════════════════════════════════
// GET MY ASSIGNMENTS (Teacher)
// GET /assignments/teacher
// ════════════════════════════════════════
exports.getTeacherAssignments = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const assignments = await Assignment.find({ teacherId }).sort("-createdAt");
    res.json({ success: true, assignments });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ════════════════════════════════════════
// GET MY SUBJECTS (Teacher — for assignment dropdown)
// GET /assignments/my-subjects
// Returns SubjectAssignment[] with subjectId populated
// ════════════════════════════════════════
exports.getTeacherAssignedSubjects = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const assignments = await SubjectAssignment.find({ teacherId, status: "active" })
      .populate("subjectId", "name code")
      .select("subjectId subjectName college department semester");
    res.json({ success: true, assignments });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ════════════════════════════════════════
// GET ASSIGNMENTS FOR STUDENT
// GET /assignments/my
// Filters by student's college, department, semester
// ════════════════════════════════════════
exports.getStudentAssignments = async (req, res) => {
  try {
    const { college, department, semester } = req.user;
    const assignments = await Assignment.find({ college, department, semester }).sort("-createdAt");
    res.json({ success: true, assignments });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};