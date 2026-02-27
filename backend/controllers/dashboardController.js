const Attendance = require("../models/Attendance");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Subject = require("../models/Subject");
const User = require("../models/User");

/* ================= STUDENT DASHBOARD ================= */
const studentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;

    const submissions = await Submission.find({ studentId });
    const totalSubmissions = submissions.length;

    const totalMarks = submissions.reduce((acc, item) => acc + (item.marks || 0), 0);

    const averageMarks = totalSubmissions === 0
      ? 0
      : (totalMarks / totalSubmissions).toFixed(2);

    const highestMarks = submissions.length === 0
      ? 0
      : Math.max(...submissions.map((s) => s.marks || 0));

    res.json({
      success: true,
      totalSubmissions,
      totalMarks,
      averageMarks,
      highestMarks,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= TEACHER DASHBOARD ================= */
const teacherDashboard = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const subjects = await Subject.find({ teacherId });
    const subjectIds = subjects.map((s) => s._id);

    const assignments = await Assignment.find({ subjectId: { $in: subjectIds } });
    const assignmentIds = assignments.map((a) => a._id);

    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } });
    const students = await User.countDocuments({ role: "student" });

    res.json({
      success: true,
      totalSubjects: subjects.length,
      totalAssignments: assignments.length,
      totalSubmissions: submissions.length,
      totalStudents: students,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= ADMIN DASHBOARD ================= */
const adminDashboard = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalTeachers = await User.countDocuments({ role: "teacher" });
    const totalSubjects = await Subject.countDocuments();
    const totalAssignments = await Assignment.countDocuments();
    const totalAttendance = await Attendance.countDocuments();

    res.json({
      success: true,
      totalStudents,
      totalTeachers,
      totalSubjects,
      totalAssignments,
      totalAttendance,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= ADMIN TOP STUDENTS ================= */
const adminTopStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" });

    let result = [];

    for (let student of students) {
      const submissions = await Submission.find({ studentId: student._id });

      const totalMarks = submissions.reduce((acc, item) => acc + (item.marks || 0), 0);
      const average = submissions.length === 0 ? 0 : totalMarks / submissions.length;

      result.push({
        studentId: student._id,
        name: student.name,
        email: student.email,
        totalMarks,
        average: average.toFixed(2),
      });
    }

    result.sort((a, b) => b.totalMarks - a.totalMarks);

    res.json({
      success: true,
      data: result.slice(0, 5),
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= ADMIN ANALYTICS ================= */
const adminAnalytics = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalTeachers = await User.countDocuments({ role: "teacher" });
    const totalSubjects = await Subject.countDocuments();
    const totalAssignments = await Assignment.countDocuments();
    const totalSubmissions = await Submission.countDocuments();
    const totalAttendance = await Attendance.countDocuments();

    res.json({
      success: true,
      totalStudents,
      totalTeachers,
      totalSubjects,
      totalAssignments,
      totalSubmissions,
      totalAttendance,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  studentDashboard,
  teacherDashboard,
  adminDashboard,
  adminTopStudents,
  adminAnalytics,
};