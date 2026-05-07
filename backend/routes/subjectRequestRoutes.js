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

// ── Teacher: Accepted subjects + shared subjects (for attendance) ──
router.get("/my-subjects", verifyToken, isTeacher, async (req, res) => {
  try {
    const now = new Date();

    // 1. Own accepted subjects
    const ownSubjects = await SubjectRequest.find({
      teacherId: req.user.id,
      status:    "accepted",
    }).sort({ createdAt: -1 });

    // 2. Subjects shared with this teacher — find all where sharedWith has this teacher
    const sharedSubjects = await SubjectRequest.find({
      status: "accepted",
      sharedWith: {
        $elemMatch: {
          teacherId: req.user.id,
          expiresAt: { $gt: now }, // not expired
        },
      },
    });

    // Build shared subjects list — only include the specific shared slots
    const sharedFormatted = [];
    sharedSubjects.forEach(sub => {
      const activeShares = sub.sharedWith.filter(
        s => s.teacherId.toString() === req.user.id.toString() && new Date(s.expiresAt) > now
      );
      activeShares.forEach(share => {
        sharedFormatted.push({
          ...sub.toObject(),
          _id:          sub._id,
          isShared:     true,               // ✅ flag for frontend
          originalTeacherName: sub.teacherName,
          // Override timetable to show only shared slot
          timetable: sub.timetable.filter(
            t => t.day === share.day && t.startTime === share.startTime
          ),
          sharedSlot: {
            day:       share.day,
            startTime: share.startTime,
            endTime:   share.endTime,
            expiresAt: share.expiresAt,
          },
        });
      });
    });

    res.json({
      success:  true,
      subjects: [...ownSubjects, ...sharedFormatted],
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: Get teachers in same college+dept for sharing ──
router.get("/teachers-list", verifyToken, isTeacher, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select("college department");
    const teachers = await User.find({
      role:    "teacher",
      college: me.college,          // ✅ same college — sabhi departments
      _id:     { $ne: req.user.id }, // exclude self
    }).select("name teacherId email department _id").sort({ department: 1, name: 1 });
    res.json({ success: true, teachers });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: Share a class slot with another teacher ──
// POST /subject-requests/:id/share
// Body: { teacherId, teacherName, day, startTime, endTime, expiresAt }
router.post("/:id/share", verifyToken, isTeacher, async (req, res) => {
  try {
    const subject = await SubjectRequest.findOne({
      _id:       req.params.id,
      teacherId: req.user.id,   // only owner can share
      status:    "accepted",
    });
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found or not yours" });
    }

    const { teacherId, teacherName, day, startTime, endTime, expiresAt } = req.body;
    if (!teacherId || !day || !startTime) {
      return res.status(400).json({ success: false, message: "teacherId, day, startTime required" });
    }

    // Verify target teacher exists
    const targetTeacher = await User.findById(teacherId).select("name role");
    if (!targetTeacher || targetTeacher.role !== "teacher") {
      return res.status(404).json({ success: false, message: "Target teacher not found" });
    }

    // Check if this slot exists in timetable
    const slotExists = subject.timetable.some(
      t => t.day === day && t.startTime === startTime
    );
    if (!slotExists) {
      return res.status(400).json({ success: false, message: "This time slot is not in timetable" });
    }

    // Remove existing share for same teacher+slot (avoid duplicates)
    subject.sharedWith = subject.sharedWith.filter(
      s => !(s.teacherId.toString() === teacherId && s.day === day && s.startTime === startTime)
    );

    // Calculate expiresAt — default: end of today's class time
    let expiry = expiresAt ? new Date(expiresAt) : null;
    if (!expiry) {
      // Default: expires when class ends today
      const today = new Date();
      const [endH, endM] = (endTime || "23:59").split(":").map(Number);
      expiry = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM, 0);
      // If already past, set to end of day
      if (expiry < new Date()) {
        expiry = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      }
    }

    subject.sharedWith.push({
      teacherId:   targetTeacher._id,
      teacherName: targetTeacher.name,
      day,
      startTime,
      endTime:     endTime || "",
      expiresAt:   expiry,
    });

    await subject.save();

    // Send notification to substitute teacher
    try {
      const Notification = require("../models/Notification");
      await Notification.create({
        userId:  teacherId,
        title:   "Class Assigned to You",
        message: `${subject.teacherName} has shared "${subject.subjectName}" class (${day} ${startTime}) with you. Please mark attendance.`,
        type:    "class_share",
        isRead:  false,
      });
    } catch (e) {
      console.log("Notification error:", e.message);
    }

    res.json({
      success: true,
      message: `Class shared with ${targetTeacher.name} until ${expiry.toLocaleTimeString("en-IN")}`,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: Unshare / remove a shared class ──
// DELETE /subject-requests/:id/share/:shareId
router.delete("/:id/share/:shareId", verifyToken, isTeacher, async (req, res) => {
  try {
    const subject = await SubjectRequest.findOne({
      _id:       req.params.id,
      teacherId: req.user.id,
      status:    "accepted",
    });
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    subject.sharedWith = subject.sharedWith.filter(
      s => s._id.toString() !== req.params.shareId
    );
    await subject.save();

    res.json({ success: true, message: "Share removed" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: Get share status for a subject ──
router.get("/:id/shares", verifyToken, isTeacher, async (req, res) => {
  try {
    const subject = await SubjectRequest.findOne({
      _id:       req.params.id,
      teacherId: req.user.id,
    });
    if (!subject) return res.status(404).json({ success: false, message: "Not found" });

    const now = new Date();
    const activeShares = subject.sharedWith.filter(s => new Date(s.expiresAt) > now);
    res.json({ success: true, shares: activeShares });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: My timetable (from accepted requests) ──
router.get("/teacher-timetable", verifyToken, isTeacher, async (req, res) => {
  try {
    const requests = await SubjectRequest.find({
      teacherId: req.user.id,
      status:    "accepted",
      timetable: { $exists: true, $ne: [] },
    }).sort({ subjectName: 1 });

    const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const byDay = {};
    DAYS.forEach(d => { byDay[d] = []; });
    const allSlots = [];

    requests.forEach(req => {
      (req.timetable || []).forEach(slot => {
        const obj = {
          _id:           slot._id,
          subjectName:   req.subjectName,
          subjectCode:   req.subjectCode,
          subjectId:     req.subjectId,
          day:           slot.day,
          startTime:     slot.startTime,
          endTime:       slot.endTime,
          room:          slot.room || "",
          semester:      req.semester,
          section:       req.section,
          admissionYear: req.admissionYear,
          department:    req.department,
          college:       req.college,
        };
        if (byDay[slot.day]) byDay[slot.day].push(obj);
        allSlots.push(obj);
      });
    });

    DAYS.forEach(d => {
      byDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    res.json({ success: true, timetable: byDay, slots: allSlots });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Student: Timetable from accepted SubjectRequests ──
router.get("/student-timetable", verifyToken, async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .select("college department semester admissionYear section role");

    if (!student || student.role !== "student") {
      return res.status(403).json({ success: false, message: "Students only" });
    }

    const requests = await SubjectRequest.find({
      college:       student.college,
      department:    student.department,
      semester:      Number(student.semester),
      admissionYear: String(student.admissionYear),
      status:        "accepted",
      timetable:     { $exists: true, $ne: [] },
      $or: [{ section: "All" }, { section: student.section || "A" }],
    }).sort({ subjectName: 1 });

    const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const byDay = {};
    DAYS.forEach(d => { byDay[d] = []; });
    const allSlots = [];

    requests.forEach(req => {
      (req.timetable || []).forEach(slot => {
        const obj = {
          subjectName:   req.subjectName,
          subjectCode:   req.subjectCode,
          subjectId:     req.subjectId,
          teacherName:   req.teacherName,
          teacherId:     req.teacherId,
          day:           slot.day,
          startTime:     slot.startTime,
          endTime:       slot.endTime,
          room:          slot.room || "",
          semester:      req.semester,
          section:       req.section,
          admissionYear: req.admissionYear,
          department:    req.department,
        };
        if (byDay[slot.day]) byDay[slot.day].push(obj);
        allSlots.push(obj);
      });
    });

    DAYS.forEach(d => {
      byDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    res.json({
      success:   true,
      timetable: byDay,
      slots:     allSlots,
      student: {
        college:       student.college,
        department:    student.department,
        semester:      student.semester,
        admissionYear: student.admissionYear,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Student: Teacher assigned subjects ──
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
      _id:         s._id,
      subjectName: s.name,
      subjectCode: s.code,
      type:        s.type,
      college:     s.college,
      department:  s.department,
      semester:    s.semester,
      credits:     s.credits,
      description: s.description,
    }));
    res.json({
      success:  true,
      subjects: formatted,
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
    const {
      subjectId, subjectName, subjectCode,
      college, department, semester, admissionYear, section,
    } = req.body;

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
      return res.status(400).json({
        success: false,
        message: "Request already sent for this subject/batch/section",
      });
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
router.put("/:id/accept", verifyToken, isAdmin, async (req, res) => {
  try {
    const request = await SubjectRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    const { timetable } = req.body;

    if (timetable && timetable.length > 0) {
      for (const slot of timetable) {
        const teacherConflict = await SubjectRequest.findOne({
          _id:       { $ne: request._id },
          teacherId: request.teacherId,
          status:    "accepted",
          timetable: { $elemMatch: { day: slot.day, startTime: slot.startTime } },
        });
        if (teacherConflict) {
          return res.status(400).json({
            success: false,
            message: `Teacher conflict: ${request.teacherName} already has "${teacherConflict.subjectName}" on ${slot.day} at ${slot.startTime}.`,
          });
        }

        const timetableConflict = await Timetable.findOne({
          teacherId: request.teacherId,
          slots: { $elemMatch: { day: slot.day, startTime: slot.startTime } },
        });
        if (timetableConflict) {
          return res.status(400).json({
            success: false,
            message: `Schedule conflict: ${request.teacherName} already has a class on ${slot.day} at ${slot.startTime}.`,
          });
        }

        if (slot.room && slot.room.trim()) {
          const roomConflict = await SubjectRequest.findOne({
            _id:    { $ne: request._id },
            status: "accepted",
            timetable: {
              $elemMatch: { day: slot.day, startTime: slot.startTime, room: slot.room.trim() },
            },
          });
          if (roomConflict) {
            return res.status(400).json({
              success: false,
              message: `Room conflict: Room ${slot.room} is already booked on ${slot.day} at ${slot.startTime} for "${roomConflict.subjectName}".`,
            });
          }
        }

        const batchConflict = await SubjectRequest.findOne({
          _id:           { $ne: request._id },
          college:       request.college,
          department:    request.department,
          semester:      request.semester,
          admissionYear: request.admissionYear,
          status:        "accepted",
          $or: [{ section: "All" }, { section: request.section }],
          timetable: { $elemMatch: { day: slot.day, startTime: slot.startTime } },
        });
        if (batchConflict) {
          return res.status(400).json({
            success: false,
            message: `Batch conflict: Students of Sem ${request.semester} batch ${request.admissionYear} already have "${batchConflict.subjectName}" on ${slot.day} at ${slot.startTime}.`,
          });
        }
      }
    }

    request.status    = "accepted";
    request.adminNote = "";
    if (timetable && timetable.length > 0) request.timetable = timetable;
    await request.save();

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
            day: s.day, startTime: s.startTime, endTime: s.endTime,
            room: s.room || "", slotNumber: i + 1,
          })),
        },
        { upsert: true, new: true }
      );
    }

    try {
      const Notification = require("../models/Notification");
      await Notification.create({
        userId:  request.teacherId,
        title:   "Subject Request Accepted",
        message: `Your request for "${request.subjectName}" has been accepted. Timetable has been assigned.`,
        type:    "subject_request",
        isRead:  false,
      });
    } catch (e) { console.log("Notification error:", e.message); }

    res.json({ success: true, message: "Request accepted and timetable assigned!", request });
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

    try {
      const Notification = require("../models/Notification");
      await Notification.create({
        userId:  request.teacherId,
        title:   "Subject Request Rejected",
        message: `Your request for "${request.subjectName}" has been rejected.${req.body.note ? ` Reason: ${req.body.note}` : ""}`,
        type:    "subject_request",
        isRead:  false,
      });
    } catch (e) { console.log("Notification error:", e.message); }

    res.json({ success: true, message: "Request rejected", request });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Teacher: Students for a subject ──
// NOTE: Also allow substitute teacher to access students
router.get("/:id/students", verifyToken, isTeacher, async (req, res) => {
  try {
    const now = new Date();

    // Check if own subject OR shared with this teacher
    let subject = await SubjectRequest.findOne({
      _id:       req.params.id,
      teacherId: req.user.id,
      status:    "accepted",
    });

    // If not own, check if shared
    if (!subject) {
      subject = await SubjectRequest.findOne({
        _id:    req.params.id,
        status: "accepted",
        sharedWith: {
          $elemMatch: {
            teacherId: req.user.id,
            expiresAt: { $gt: now },
          },
        },
      });
    }

    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found or access denied" });
    }

    const filter = {
      role:          "student",
      college:       subject.college,
      department:    subject.department,
      semester:      subject.semester,
      admissionYear: subject.admissionYear,
    };
    if (subject.section && subject.section !== "All") filter.section = subject.section;

    const students = await User.find(filter)
      .select("-password -refreshToken -otp -otpExpire")
      .sort({ name: 1 });

    res.json({
      success:  true,
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
      _id:       req.params.id,
      teacherId: req.user.id,
      status:    "pending",
    });
    if (!request) return res.status(404).json({ success: false, message: "Pending request not found" });
    await request.deleteOne();
    res.json({ success: true, message: "Request deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;