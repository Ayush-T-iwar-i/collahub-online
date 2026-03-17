const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const SubjectAssignment = require("../models/SubjectAssignment");

// ════════════════════════════════════════
// CREATE ASSIGNMENT (Teacher)
// ════════════════════════════════════════
exports.createAssignment = async (req, res) => {
  try {
    const { title, description, subjectId, subjectName, college, department, semester, dueDate, maxMarks } = req.body;
    const teacherId = req.user.id;

    if (!title || !subjectId || !dueDate) {
      return res.status(400).json({ success: false, message: "Title, Subject, and Due Date required" });
    }

    let fileUrl = null;
    if (req.file) {
      fileUrl = req.file.path || req.file.filename;
    }

    const assignment = await Assignment.create({
      title, description, subjectId, subjectName, teacherId, teacherName: req.user.name,
      college, department, semester, dueDate, maxMarks, file: fileUrl
    });

    res.status(201).json({ success: true, assignment, message: "Assignment created successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ════════════════════════════════════════
// GET MY ASSIGNMENTS (Teacher)
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
// GET MY SUBJECTS (Teacher)
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
