const express        = require("express");
const router         = express.Router();
const Attendance     = require("../models/Attendance");
const SubjectRequest = require("../models/SubjectRequest");
const User           = require("../models/User");
const { verifyToken, isTeacher } = require("../middleware/authMiddleware");

// ── Teacher: Attendance Mark Karo ──
router.post("/mark", verifyToken, isTeacher, async (req, res) => {
  try {
    const { subjectId, date, day, time, records } = req.body; // ✅ day, time added

    if (!subjectId || !date || !records?.length) {
      return res.status(400).json({ success: false, message: "subjectId, date, records required" });
    }

    const subject = await SubjectRequest.findById(subjectId);
    if (!subject || subject.status !== "accepted") {
      return res.status(404).json({ success: false, message: "Accepted subject not found" });
    }

    if (subject.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not your subject" });
    }

    const teacher = await User.findById(req.user.id).select("name");

    const ops = records.map(r => ({
      updateOne: {
        filter: { studentId: r.studentId, subjectId, date },
        update: {
          $set: {
            studentId:     r.studentId,
            subjectId,
            subjectName:   subject.subjectName,
            department:    subject.department,
            semester:      subject.semester,
            admissionYear: subject.admissionYear,
            date,
            day:           day  || "",   // ✅
            time:          time || "",   // ✅
            status:        r.status,
            markedBy:      req.user.id,
            markedByName:  teacher.name,
          }
        },
        upsert: true,
      }
    }));

    await Attendance.bulkWrite(ops);

    const present = records.filter(r => r.status === "present").length;
    const absent  = records.filter(r => r.status === "absent").length;

    res.json({
      success: true,
      message: `Attendance marked! Present: ${present}, Absent: ${absent}`,
      date, day, time, present, absent,
    });
  } catch (e) {
    console.log("MARK ERROR:", e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: Subject ki attendance history ──
router.get("/subject/:subjectId", verifyToken, isTeacher, async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { subjectId: req.params.subjectId };
    if (date) filter.date = date;

    const records = await Attendance.find(filter)
      .populate("studentId", "name studentId email")
      .sort({ date: -1 });

    res.json({ success: true, records });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: Ek date ki attendance ──
router.get("/subject/:subjectId/date/:date", verifyToken, isTeacher, async (req, res) => {
  try {
    const { subjectId, date } = req.params;

    const subject = await SubjectRequest.findById(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });

    const records = await Attendance.find({ subjectId, date })
      .populate("studentId", "name studentId email");

    const allStudents = await User.find({
      role:          "student",
      college:       subject.college,
      department:    subject.department,
      semester:      subject.semester,
      admissionYear: subject.admissionYear,
    }).select("name studentId email").sort({ name: 1 });

    const attendanceMap = {};
    records.forEach(r => {
      attendanceMap[r.studentId._id.toString()] = r.status;
    });

    const merged = allStudents.map(s => ({
      studentId: s._id,
      name:      s.name,
      rollNo:    s.studentId,
      email:     s.email,
      status:    attendanceMap[s._id.toString()] || "absent",
      isMarked:  !!attendanceMap[s._id.toString()],
    }));

    res.json({ success: true, records: merged, date, subject: subject.subjectName });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Student: Apni attendance dekho ──
router.get("/my", verifyToken, async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .select("college department semester admissionYear role");

    if (!student || student.role !== "student") {
      return res.status(403).json({ success: false, message: "Only students" });
    }

    const records = await Attendance.find({ studentId: req.user.id })
      .populate("subjectId", "subjectName subjectCode teacherName")
      .sort({ date: -1 });

    const summaryMap = {};
    records.forEach(r => {
      const key     = r.subjectId?._id?.toString() || r.subjectName;
      const name    = r.subjectId?.subjectName || r.subjectName || "Unknown";
      const code    = r.subjectId?.subjectCode || "";
      const teacher = r.subjectId?.teacherName || r.markedByName || "";

      if (!summaryMap[key]) {
        summaryMap[key] = {
          subjectId:   key,
          subjectName: name,
          subjectCode: code,
          teacherName: teacher,
          total:   0,
          present: 0,
          absent:  0,
          records: [],
        };
      }
      summaryMap[key].total++;
      if (r.status === "present") summaryMap[key].present++;
      else summaryMap[key].absent++;
      summaryMap[key].records.push({
        date:   r.date,
        day:    r.day  || "",   // ✅
        time:   r.time || "",   // ✅
        status: r.status,
      });
    });

    const summary = Object.values(summaryMap).map(s => ({
      ...s,
      percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
    }));

    res.json({ success: true, summary, totalRecords: records.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Student: Ek subject ki detail attendance ──
router.get("/my/subject/:subjectId", verifyToken, async (req, res) => {
  try {
    const records = await Attendance.find({
      studentId: req.user.id,
      subjectId: req.params.subjectId,
    }).sort({ date: -1 });

    const total   = records.length;
    const present = records.filter(r => r.status === "present").length;
    const absent  = records.filter(r => r.status === "absent").length;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({
      success: true,
      records: records.map(r => ({
        date:   r.date,
        day:    r.day  || "",  // ✅
        time:   r.time || "",  // ✅
        status: r.status,
      })),
      stats: { total, present, absent, percentage: percent }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;