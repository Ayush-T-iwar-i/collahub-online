const express        = require("express");
const router         = express.Router();
const SubjectRequest = require("../models/SubjectRequest");
const Subject        = require("../models/Subject");
const User           = require("../models/User");
const Timetable      = require("../models/Timetable");
const { verifyToken, isAdmin, isTeacher } = require("../middleware/authMiddleware");

// ════════════════════════════════════════════
// SPECIFIC ROUTES PEHLE — PARAM ROUTES BAAD
// ════════════════════════════════════════════

// ── Teacher: Available subjects (same college + dept) ──
router.get("/available-subjects", verifyToken, isTeacher, async (req, res) => {
  try {
    const teacher = await User.findById(req.user.id).select("college department");
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });
    const subjects = await Subject.find({
      college:    teacher.college,
      department: teacher.department,
    }).sort({ semester: 1, name: 1 });
    res.json({ success: true, subjects, teacher });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: My requests ──
router.get("/my", verifyToken, isTeacher, async (req, res) => {
  try {
    const requests = await SubjectRequest.find({ teacherId: req.user.id })
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: Accepted subjects ──
router.get("/my-subjects", verifyToken, isTeacher, async (req, res) => {
  try {
    const subjects = await SubjectRequest.find({
      teacherId: req.user.id,
      status:    "accepted",
    }).sort({ createdAt: -1 });
    res.json({ success: true, subjects });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Student: Teacher assigned subjects + timetable ──
router.get("/student-subjects", verifyToken, async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .select("college department semester admissionYear section role");
    if (!student || student.role !== "student") {
      return res.status(403).json({ success: false, message: "Only students" });
    }
    const subjects = await SubjectRequest.find({
      college:       student.college,
      department:    student.department,
      semester:      student.semester,
      admissionYear: student.admissionYear,
      status:        "accepted",
      $or: [{ section: "All" }, { section: student.section || "A" }],
    }).sort({ subjectName: 1 });
    res.json({
      success: true,
      subjects,
      info: {
        college:       student.college,
        department:    student.department,
        semester:      student.semester,
        admissionYear: student.admissionYear,
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Student: Admin-added subjects from Subject model ──
router.get("/admin-subjects", verifyToken, async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .select("college department semester admissionYear role");
    if (!student || student.role !== "student") {
      return res.status(403).json({ success: false, message: "Only students" });
    }
    const subjects = await Subject.find({
      department: student.department,
      semester:   Number(student.semester),
    }).sort({ name: 1 });
    const formatted = subjects.map(s => ({
      _id: s._id, subjectName: s.name, subjectCode: s.code,
      type: s.type, college: s.college, department: s.department,
      semester: s.semester, credits: s.credits, description: s.description,
    }));
    res.json({ success: true, subjects: formatted, info: { college: student.college, department: student.department, semester: student.semester, admissionYear: student.admissionYear } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Admin: Get all requests ──
router.get("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const requests = await SubjectRequest.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: Send request ──
router.post("/", verifyToken, isTeacher, async (req, res) => {
  try {
    const { subjectId, subjectName, subjectCode, college, department, semester, admissionYear, section } = req.body;
    if (!subjectName || !college || !department || !semester || !admissionYear) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }
    const existing = await SubjectRequest.findOne({
      teacherId:     req.user.id,
      subjectName,
      semester:      Number(semester),
      admissionYear: String(admissionYear),
      section:       section || "All",
      status:        { $in: ["pending", "accepted"] },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "Request already sent for this subject/batch/section" });
    }
    const teacher = await User.findById(req.user.id).select("name");
    const request = await SubjectRequest.create({
      teacherId:     req.user.id,
      teacherName:   teacher.name,
      subjectId:     subjectId || null,
      subjectName,
      subjectCode:   subjectCode || "",
      college,
      department,
      semester:      Number(semester),
      admissionYear: String(admissionYear),
      section:       section || "All",
    });
    res.status(201).json({ success: true, message: "Request sent to admin!", request });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Admin: Accept + Assign Timetable ──
// Body: { timetable: [{day, startTime, endTime, room}] }
router.put("/:id/accept", verifyToken, isAdmin, async (req, res) => {
  try {
    const request = await SubjectRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    const { timetable } = req.body;

    // ── Conflict checks ──
    if (timetable && timetable.length > 0) {
      for (const slot of timetable) {

        // 1. Teacher conflict — same teacher, same day+time already assigned
        const teacherConflict = await SubjectRequest.findOne({
          _id:       { $ne: request._id },
          teacherId: request.teacherId,
          status:    "accepted",
          timetable: {
            $elemMatch: { day: slot.day, startTime: slot.startTime }
          },
        });
        if (teacherConflict) {
          return res.status(400).json({
            success: false,
            message: `⚠️ Teacher conflict: ${request.teacherName} already has "${teacherConflict.subjectName}" on ${slot.day} at ${slot.startTime}`,
          });
        }

        // 2. Room conflict — same room, same day+time
        if (slot.room && slot.room.trim()) {
          const roomConflict = await SubjectRequest.findOne({
            _id:    { $ne: request._id },
            status: "accepted",
            timetable: {
              $elemMatch: { day: slot.day, startTime: slot.startTime, room: slot.room.trim() }
            },
          });
          if (roomConflict) {
            return res.status(400).json({
              success: false,
              message: `⚠️ Room conflict: Room ${slot.room} is booked on ${slot.day} at ${slot.startTime} for "${roomConflict.subjectName}" (${roomConflict.teacherName})`,
            });
          }
        }

        // 3. Also check Timetable model (teacher's self-set schedule)
        const selfConflict = await Timetable.findOne({
          teacherId: request.teacherId,
          slots: {
            $elemMatch: { day: slot.day, startTime: slot.startTime }
          },
        });
        if (selfConflict) {
          return res.status(400).json({
            success: false,
            message: `⚠️ Timetable conflict: ${request.teacherName} already has a class on ${slot.day} at ${slot.startTime}`,
          });
        }
      }
    }

    // All checks passed — save
    request.status    = "accepted";
    request.adminNote = "";
    if (timetable && timetable.length > 0) {
      request.timetable = timetable;
    }
    await request.save();

    // Also save to Timetable model so teacher's /timetable/my also shows it
    if (timetable && timetable.length > 0 && request.subjectId) {
      await Timetable.findOneAndUpdate(
        { subjectId: request.subjectId, teacherId: request.teacherId },
        {
          subjectId:     request.subjectId,
          teacherId:     request.teacherId,
          college:       request.college,
          department:    request.department,
          semester:      request.semester,
          admissionYear: request.admissionYear,
          slots: timetable.map((s, i) => ({
            day:        s.day,
            startTime:  s.startTime,
            endTime:    s.endTime,
            room:       s.room || "",
            slotNumber: i + 1,
          })),
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, message: "Request accepted and timetable assigned! ✅", request });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Admin: Reject ──
router.put("/:id/reject", verifyToken, isAdmin, async (req, res) => {
  try {
    const request = await SubjectRequest.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", adminNote: req.body.note || "", timetable: [] },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    res.json({ success: true, message: "Request rejected", request });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: Students for a subject ──
router.get("/:id/students", verifyToken, isTeacher, async (req, res) => {
  try {
    const subject = await SubjectRequest.findById(req.params.id);
    if (!subject || subject.status !== "accepted") {
      return res.status(404).json({ success: false, message: "Accepted subject not found" });
    }
    const filter = {
      role:          "student",
      college:       subject.college,
      department:    subject.department,
      semester:      subject.semester,
      admissionYear: subject.admissionYear,
    };
    if (subject.section && subject.section !== "All") {
      filter.section = subject.section;
    }
    const students = await User.find(filter)
      .select("-password -refreshToken -otp -otpExpire")
      .sort({ name: 1 });
    res.json({
      success: true,
      students,
      subject: {
        name:          subject.subjectName,
        code:          subject.subjectCode,
        semester:      subject.semester,
        section:       subject.section,
        admissionYear: subject.admissionYear,
        department:    subject.department,
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: Delete pending request ──
router.delete("/:id", verifyToken, isTeacher, async (req, res) => {
  try {
    const request = await SubjectRequest.findOne({
      _id: req.params.id, teacherId: req.user.id, status: "pending",
    });
    if (!request) return res.status(404).json({ success: false, message: "Pending request not found" });
    await request.deleteOne();
    res.json({ success: true, message: "Request deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;