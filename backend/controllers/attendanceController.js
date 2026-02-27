const Subject = require("../models/Subject");
const User = require("../models/User");
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");

// ================= MARK ATTENDANCE =================
exports.markAttendance = async (req, res) => {
  try {
    const { studentId, subjectId, date, status } = req.body;

    const student = await User.findById(studentId);
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    const subject = await Subject.findById(subjectId);
    if (!subject)
      return res.status(404).json({ success: false, message: "Subject not found" });

    const alreadyMarked = await Attendance.findOne({ studentId, subjectId, date });
    if (alreadyMarked)
      return res.status(400).json({ success: false, message: "Attendance already marked" });

    const attendance = await Attendance.create({
      studentId,
      subjectId,
      date,
      status: status.toLowerCase(), // ✅ always lowercase
    });

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      attendance,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= ATTENDANCE PERCENTAGE =================
exports.getAttendancePercentage = async (req, res) => {
  try {
    const { studentId } = req.params;

    const total = await Attendance.countDocuments({ studentId });
    const present = await Attendance.countDocuments({ studentId, status: "present" }); // ✅ lowercase

    const percentage = total === 0 ? 0 : ((present / total) * 100).toFixed(2);

    res.json({
      success: true,
      totalClasses: total,
      presentClasses: present,
      percentage: percentage + "%",
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET STUDENT ATTENDANCE =================
exports.getStudentAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.find({ studentId: id }).populate("subjectId", "name");

    res.json({ success: true, attendance });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= MONTHLY ATTENDANCE REPORT =================
exports.getMonthlyReport = async (req, res) => {
  try {
    const studentId = req.user.id;

    const report = await Attendance.aggregate([
      {
        $match: { studentId: new mongoose.Types.ObjectId(studentId) }
      },
      {
        $group: {
          _id: { $month: "$date" },
          totalClasses: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ["$status", "present"] }, 1, 0] // ✅ lowercase fix
            }
          }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json({ success: true, report });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};