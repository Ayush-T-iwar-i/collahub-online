const express = require("express");
const router  = express.Router();

const {
  registerAdmin, loginAdmin,
  getStudents, addStudent, bulkAddStudents, removeStudent, updateBatchSemester, assignSection,
  getTeachers, addTeacher,
  assignSubjectToTeacher, removeAssignedSubject,
} = require("../controllers/adminController");

const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const SubjectRequest = require("../models/SubjectRequest");
const Timetable = require("../models/Timetable");

// ── Auth ────────────────────────────────────────────────
router.post("/register", registerAdmin);
router.post("/login",    loginAdmin);

// ── Students ───────────────────────────────────────────
router.get   ("/students",               verifyToken, isAdmin, getStudents);
router.post  ("/add-student",            verifyToken, isAdmin, addStudent);
router.post  ("/bulk-add-students",      verifyToken, isAdmin, bulkAddStudents);
router.delete("/students/:studentId",    verifyToken, isAdmin, removeStudent);
router.put   ("/update-batch-semester",  verifyToken, isAdmin, updateBatchSemester);
router.put   ("/assign-section",         verifyToken, isAdmin, assignSection);

// ── Teachers ───────────────────────────────────────────
router.get   ("/teachers",               verifyToken, isAdmin, getTeachers);
router.post  ("/add-teacher",            verifyToken, isAdmin, addTeacher);

// ── Subject Assignment ─────────────────────────────────
router.post  ("/assign-subject",                          verifyToken, isAdmin, assignSubjectToTeacher);
router.delete("/assign-subject/:teacherId/:subjectIndex", verifyToken, isAdmin, removeAssignedSubject);

// ── Subject Requests ───────────────────────────────────
router.get("/subject-requests", verifyToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await SubjectRequest.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ ACCEPT REQUEST (FINAL CLEAN VERSION)
router.put("/subject-requests/:id/accept", verifyToken, isAdmin, async (req, res) => {
  try {
    const request = await SubjectRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const { timetable } = req.body;

    // ── CHECK 0: Same subject same batch/section ─────────
    if (request.subjectId) {
      const sameSubjectConflict = await SubjectRequest.findOne({
        _id:           { $ne: request._id },
        subjectId:     request.subjectId,
        semester:      request.semester,
        admissionYear: request.admissionYear,
        status:        "accepted",
        $or: [
          { section: "All" },
          { section: request.section },
          ...(request.section === "All" ? [{}] : []),
        ],
      });

      if (sameSubjectConflict) {
        return res.status(400).json({
          success: false,
          message: `"${request.subjectName}" already assigned to ${sameSubjectConflict.teacherName}. Only one teacher allowed per batch/section.`,
        });
      }
    }

    if (timetable && timetable.length > 0) {
      for (const slot of timetable) {

        // ── CHECK 1: Teacher conflict ─────────
        const teacherConflict = await SubjectRequest.findOne({
          _id:       { $ne: request._id },
          teacherId: request.teacherId,
          status:    "accepted",
          timetable: { $elemMatch: { day: slot.day, startTime: slot.startTime } },
        });

        if (teacherConflict) {
          return res.status(400).json({
            success: false,
            message: `Teacher already busy at ${slot.day} ${slot.startTime}`,
          });
        }

        // ── CHECK 2: Room conflict ─────────
        if (slot.room && slot.room.trim()) {
          const roomConflict = await SubjectRequest.findOne({
            _id:    { $ne: request._id },
            status: "accepted",
            timetable: {
              $elemMatch: {
                day: slot.day,
                startTime: slot.startTime,
                room: slot.room.trim(),
              },
            },
          });

          if (roomConflict) {
            return res.status(400).json({
              success: false,
              message: `Room ${slot.room} already booked`,
            });
          }
        }

        // ── CHECK 3: Batch conflict ─────────
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
            message: `Students already have class at this time`,
          });
        }
      }
    }

    // ── SAVE ───────────────────────────────
    request.status = "accepted";
    request.adminNote = "";

    if (timetable && timetable.length > 0) {
      request.timetable = timetable;
    }

    await request.save();

    // ── SAVE TIMETABLE ─────────────────────
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

    // ── NOTIFICATION ───────────────────────
    try {
      const Notification = require("../models/Notification");

      await Notification.create({
        userId: request.teacherId,
        title: "Subject Request Accepted ✅",
        message: `Your subject "${request.subjectName}" has been approved.`,
        type: "subject_request",
        isRead: false,
      });
    } catch (err) {
      console.log("Notification error:", err.message);
    }

    res.json({
      success: true,
      message: "Request accepted successfully",
      request,
    });

  } catch (err) {
    console.log("ACCEPT ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── REJECT ─────────────────────────────────────────────
router.put("/subject-requests/:id/reject", verifyToken, isAdmin, async (req, res) => {
  try {
    const request = await SubjectRequest.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", adminNote: req.body.note || "", timetable: [] },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, message: "Request rejected", request });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;