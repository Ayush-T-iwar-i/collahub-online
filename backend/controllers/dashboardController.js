const Attendance    = require("../models/Attendance");
const Assignment    = require("../models/Assignment");
const Submission    = require("../models/Submission");
const Subject       = require("../models/Subject");
const User          = require("../models/User");
const SubjectRequest = require("../models/SubjectRequest");

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

    // ✅ Get teacher's college + department for filtering
    const teacher = await User.findById(teacherId).select("college department").lean();
    const college    = teacher?.college    || "";
    const department = teacher?.department || "";

    // Subjects via Subject model
    const subjects    = await Subject.find({ teacherId });
    const subjectIds  = subjects.map(s => s._id);

    const assignments = await Assignment.find({ subjectId: { $in: subjectIds } });
    const assignmentIds = assignments.map(a => a._id);
    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } });

    // ✅ Count only students of same college + department
    const studentFilter = { role: "student" };
    if (college)    studentFilter.college    = college;
    if (department) studentFilter.department = department;
    const totalStudents = await User.countDocuments(studentFilter);

    // Attendance marked by this teacher (markedBy field)
    const attendanceMarked = await Attendance.countDocuments({ markedBy: req.user.id });

    res.json({
      success:          true,
      totalStudents,          // ✅ dept-filtered
      totalSubjects:    subjects.length,
      totalAssignments: assignments.length,
      totalSubmissions: submissions.length,
      attendanceMarked,
      college,
      department,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= ADMIN DASHBOARD ================= */
const adminDashboard = async (req, res) => {
  try {
    // Get admin's college — filter stats to same college only
    const admin = await User.findById(req.user.id).select("college").lean();
    const college = admin?.college || "";

    const collegeFilter = college ? { college } : {};

    const totalStudents    = await User.countDocuments({ role: "student",  ...collegeFilter });
    const totalTeachers    = await User.countDocuments({ role: "teacher",  ...collegeFilter });
    const totalSubjects    = await Subject.countDocuments(collegeFilter);
    const totalAssignments = await Assignment.countDocuments();
    const totalAttendance  = await Attendance.countDocuments();

    // Pending subject requests for this college's teachers
    let pendingRequests = 0;
    try {
      pendingRequests = await SubjectRequest.countDocuments({ status: "pending", college });
    } catch (e) { /* Model may not exist yet in some configurations */ }

    res.json({
      success: true,
      totalStudents,
      totalTeachers,
      totalSubjects,
      totalAssignments,
      totalAttendance,
      pendingRequests,
      college,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= ADMIN TOP STUDENTS ================= */
const adminTopStudents = async (req, res) => {
  try {
    // Get admin's college to scope results properly
    const admin   = await User.findById(req.user.id).select("college").lean();
    const college = admin?.college || "";

    const filter = { role: "student" };
    if (college) filter.college = college;

    const students = await User.find(filter).select("_id name email studentId").lean();
    const result = [];

    for (const student of students) {
      const submissions = await Submission.find({ studentId: student._id }).lean();
      const totalMarks = submissions.reduce((acc, item) => acc + (item.marks || 0), 0);
      const average    = submissions.length === 0 ? 0 : totalMarks / submissions.length;

      result.push({
        studentId: student._id,
        name: student.name,
        email: student.email,
        totalMarks,
        average: average.toFixed(2),
      });
    }

    result.sort((a, b) => b.totalMarks - a.totalMarks);

    res.json({ success: true, data: result.slice(0, 5) });

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