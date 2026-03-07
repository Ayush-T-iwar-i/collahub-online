const Attendance    = require("../models/Attendance");
const SubjectRequest = require("../models/SubjectRequest");
const User          = require("../models/User");

// ── Teacher: Mark/Update Attendance ──
exports.markAttendance = async (req, res) => {
  try {
    const {
      subjectId, subjectName, department, semester,
      admissionYear, date, records,
    } = req.body;

    if (!subjectId || !date || !records?.length) {
      return res.status(400).json({ success:false, message:"subjectId, date, records required" });
    }

    // Verify teacher owns this subject
    const subject = await SubjectRequest.findOne({
      _id:       subjectId,
      teacherId: req.user.id,
      status:    "accepted",
    });
    if (!subject) {
      return res.status(403).json({ success:false, message:"Subject not found or not authorized" });
    }

    // Delete old records for this date + subject (update case)
    await Attendance.deleteMany({ subjectId, date, markedBy: req.user.id });

    // Insert new records
    const docs = records.map(r => ({
      studentId:    r.studentId,
      subjectId,
      subjectName:  subjectName || subject.subjectName,
      department:   department  || subject.department,
      semester:     semester    || subject.semester,
      admissionYear: admissionYear || subject.admissionYear,
      date,
      status:   r.status,    // "present" | "absent"
      markedBy: req.user.id,
      markedByName: req.user.name || "",
    }));

    await Attendance.insertMany(docs);

    res.json({
      success: true,
      message: "Attendance marked successfully",
      total:   docs.length,
      present: docs.filter(d=>d.status==="present").length,
      absent:  docs.filter(d=>d.status==="absent").length,
    });
  } catch (e) {
    console.log("MARK ATTENDANCE ERROR:", e.message);
    res.status(500).json({ success:false, message:"Server error" });
  }
};

// ── Teacher: Check if already marked ──
exports.checkAttendance = async (req, res) => {
  try {
    const { subjectId, date } = req.query;
    const records = await Attendance.find({
      subjectId, date, markedBy: req.user.id,
    });
    res.json({
      success: true,
      marked:  records.length > 0,
      records: records.map(r => ({ studentId: r.studentId, status: r.status })),
    });
  } catch (e) {
    res.status(500).json({ success:false, message:"Server error" });
  }
};

// ── Student: Get My Attendance ──
exports.getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.user.id }).sort("-date");

    // Group by subject
    const map = {};
    records.forEach(r => {
      const key = r.subjectId?.toString() || r.subjectName || "unknown";
      if (!map[key]) {
        map[key] = {
          subjectId:   r.subjectId,
          subjectName: r.subjectName,
          department:  r.department,
          semester:    r.semester,
          total:       0, present:0, absent:0, records:[],
        };
      }
      map[key].total++;
      if (r.status==="present") map[key].present++;
      else map[key].absent++;
      map[key].records.push({ date:r.date, status:r.status });
    });

    const subjects = Object.values(map).map(s=>({
      ...s,
      percentage: s.total > 0 ? Math.round((s.present/s.total)*100) : 0,
    }));

    res.json({ success:true, subjects, totalDays: records.length });
  } catch (e) {
    res.status(500).json({ success:false, message:"Server error" });
  }
};

// ── Admin/Teacher: Get attendance by subject ──
exports.getBySubject = async (req, res) => {
  try {
    const { subjectId, date } = req.query;
    const filter = { subjectId };
    if (date) filter.date = date;

    const records = await Attendance.find(filter)
      .populate("studentId","name studentId email")
      .sort("-date");

    res.json({ success:true, records, total:records.length });
  } catch (e) {
    res.status(500).json({ success:false, message:"Server error" });
  }
};