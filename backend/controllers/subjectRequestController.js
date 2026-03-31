const SubjectRequest = require("../models/SubjectRequest");
const User           = require("../models/User");

// ══════════════════════════════════════════════════════
// TEACHER: Send Request
// POST /subject-requests
// ══════════════════════════════════════════════════════
exports.sendRequest = async (req, res) => {
  try {
    const {
      subjectId, subjectName, subjectCode,
      college, department, semester, admissionYear, section,
    } = req.body;

    if (!subjectName || !college || !department || !semester || !admissionYear) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const teacher = await User.findById(req.user.id);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    // Duplicate check
    const existing = await SubjectRequest.findOne({
      teacherId:     req.user.id,
      subjectName:   subjectName.trim(),
      department,
      semester:      Number(semester),
      admissionYear,
      section:       section || "All",
      status:        { $in: ["pending", "accepted"] },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Request already ${existing.status} for this subject/batch/section`,
      });
    }

    const request = await SubjectRequest.create({
      teacherId:    req.user.id,
      teacherName:  teacher.name,
      subjectId:    subjectId || null,
      subjectName:  subjectName.trim(),
      subjectCode:  subjectCode?.trim() || "",
      college,
      department,
      semester:     Number(semester),
      admissionYear,
      section:      section || "All",
    });

    res.status(201).json({ success: true, message: "Request sent to admin!", request });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════
// TEACHER: Get My Requests
// GET /subject-requests/my
// ══════════════════════════════════════════════════════
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await SubjectRequest
      .find({ teacherId: req.user.id })
      .sort("-createdAt");
    res.json({ success: true, requests });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════
// TEACHER: Delete My Request (only pending)
// DELETE /subject-requests/:id
// ══════════════════════════════════════════════════════
exports.deleteMyRequest = async (req, res) => {
  try {
    const req_ = await SubjectRequest.findOne({
      _id: req.params.id,
      teacherId: req.user.id,
    });
    if (!req_) return res.status(404).json({ success: false, message: "Not found" });
    if (req_.status !== "pending") {
      return res.status(400).json({ success: false, message: "Cannot delete accepted/rejected request" });
    }
    await req_.deleteOne();
    res.json({ success: true, message: "Request deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════
// ADMIN: Get All Requests
// GET /subject-requests
// ══════════════════════════════════════════════════════
exports.getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await SubjectRequest.find(filter).sort("-createdAt");
    res.json({ success: true, requests });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════
// ADMIN: Accept + Assign Timetable
// PUT /subject-requests/:id/accept
// Body: { timetable: [{day, startTime, endTime, room}] }
// ══════════════════════════════════════════════════════
exports.acceptRequest = async (req, res) => {
  try {
    const request = await SubjectRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    const { timetable, subjectType } = req.body;
    if (subjectType) request.subjectType = subjectType;

    // ── Conflict checks (only Teacher + Room — NOT batch) ──────────────────
    if (timetable && timetable.length > 0) {
      for (const slot of timetable) {

        // 1. Teacher conflict — same teacher, same day+time
        //    (A teacher cannot teach two subjects at the same time)
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

        // 2. Room conflict — same room, same college, same day+time
        //    (Different colleges can use same room number — college-scoped)
        if (slot.room && slot.room.trim()) {
          const roomConflict = await SubjectRequest.findOne({
            _id:     { $ne: request._id },
            college: request.college,           // same college only
            status:  "accepted",
            timetable: {
              $elemMatch: {
                day:       slot.day,
                startTime: slot.startTime,
                room:      slot.room.trim(),
              },
            },
          });
          if (roomConflict) {
            return res.status(400).json({
              success: false,
              message: `Room conflict: Room "${slot.room}" is already booked on ${slot.day} at ${slot.startTime} for "${roomConflict.subjectName}" (${roomConflict.teacherName}).`,
            });
          }
        }

        // 3. Student batch conflict — same semester + admissionYear + section cannot
        //    have two different subjects at the same time
        const batchConflict = await SubjectRequest.findOne({
          _id:          { $ne: request._id },
          college:      request.college,
          department:   request.department,
          semester:     request.semester,
          admissionYear:request.admissionYear,
          status:       "accepted",
          $or: [
            { section: "All" },
            { section: request.section },
            ...(request.section === "All" ? [{}] : []),
          ],
          timetable: { $elemMatch: { day: slot.day, startTime: slot.startTime } },
        });
        if (batchConflict) {
          return res.status(400).json({
            success: false,
            message: `Schedule conflict: ${request.teacherName} already has a class on ${slot.day} at ${slot.startTime} — students of Sem ${request.semester} Batch ${request.admissionYear} already have "${batchConflict.subjectName}" at this time.`,
          });
        }
      }
    }

    request.status    = "accepted";
    request.adminNote = "";
    if (timetable && timetable.length > 0) {
      request.timetable = timetable;
    }
    await request.save();

    res.json({ success: true, message: "Request accepted and timetable assigned!", request });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════
// ADMIN: Reject Request
// PUT /subject-requests/:id/reject
// ══════════════════════════════════════════════════════
exports.rejectRequest = async (req, res) => {
  try {
    const request = await SubjectRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Not found" });

    request.status    = "rejected";
    request.adminNote = req.body.note || "";
    request.timetable = [];
    await request.save();

    res.json({ success: true, message: "Request rejected", request });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════
// STUDENT: Get My Timetable
// GET /subject-requests/student-timetable
// Returns accepted requests matching student's college+dept+sem+year+section
// ══════════════════════════════════════════════════════
exports.getStudentTimetable = async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .select("college department semester admissionYear section");

    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    // Match: same college + dept + semester + admissionYear
    // Section: match "All" OR student's exact section
    const filter = {
      college:       student.college,
      department:    student.department,
      semester:      Number(student.semester),
      admissionYear: String(student.admissionYear),
      status:        "accepted",
      timetable:     { $exists: true, $ne: [] },
      $or: [
        { section: "All" },
        { section: student.section || "A" },
      ],
    };

    const requests = await SubjectRequest.find(filter).sort("subjectName");

    // Build timetable grouped by day
    const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const byDay = {};
    DAYS.forEach(d => { byDay[d] = []; });

    requests.forEach(req => {
      (req.timetable || []).forEach(slot => {
        if (byDay[slot.day]) {
          byDay[slot.day].push({
            subjectName:  req.subjectName,
            subjectCode:  req.subjectCode,
            subjectId:    req.subjectId,
            teacherName:  req.teacherName,
            teacherId:    req.teacherId,
            day:          slot.day,
            startTime:    slot.startTime,
            endTime:      slot.endTime,
            room:         slot.room || "",
            semester:     req.semester,
            section:      req.section,
            admissionYear: req.admissionYear,
          });
        }
      });
    });

    // Sort by time
    DAYS.forEach(d => {
      byDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    res.json({
      success: true,
      timetable: byDay,
      student: {
        college:       student.college,
        department:    student.department,
        semester:      student.semester,
        admissionYear: student.admissionYear,
        section:       student.section,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════
// TEACHER: Get My Timetable (from accepted requests)
// GET /subject-requests/teacher-timetable
// ══════════════════════════════════════════════════════
exports.getTeacherTimetable = async (req, res) => {
  try {
    const requests = await SubjectRequest.find({
      teacherId: req.user.id,
      status:    "accepted",
      timetable: { $exists: true, $ne: [] },
    }).sort("subjectName");

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
};

// ══════════════════════════════════════════════════════
// TEACHER: Get students for a subject (for attendance)
// GET /subject-requests/:id/students
// ══════════════════════════════════════════════════════
exports.getStudentsForSubject = async (req, res) => {
  try {
    const subject = await SubjectRequest.findOne({
      _id:       req.params.id,
      teacherId: req.user.id,
      status:    "accepted",
    });
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found or not accepted" });
    }

    const filter = {
      role:          "student",
      college:       subject.college,
      department:    subject.department,
      semester:      subject.semester,
      admissionYear: subject.admissionYear,
    };
    // Section filter if not "All"
    if (subject.section && subject.section !== "All") {
      filter.section = subject.section;
    }

    const students = await User.find(filter)
      .select("name studentId email phone gender semester admissionYear department college section profileImage");

    res.json({
      success: true,
      subject: {
        name:          subject.subjectName,
        code:          subject.subjectCode,
        department:    subject.department,
        semester:      subject.semester,
        admissionYear: subject.admissionYear,
        section:       subject.section,
      },
      students,
      total: students.length,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════
// TEACHER: Get My Accepted Subjects (for attendance list)
// GET /subject-requests/my-subjects
// ══════════════════════════════════════════════════════
exports.getMySubjects = async (req, res) => {
  try {
    const subjects = await SubjectRequest.find({
      teacherId: req.user.id,
      status:    "accepted",
    }).sort("-createdAt");
    res.json({ success: true, subjects });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};