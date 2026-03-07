const SubjectAssignment = require("../models/SubjectAssignment");
const Timetable         = require("../models/Timetable");
const User              = require("../models/User");
const Subject           = require("../models/Subject");

// ════════════════════════════════════════
// GET Teachers by College + Department
// ════════════════════════════════════════
exports.getTeachersByDept = async (req, res) => {
  try {
    const { college, department } = req.query;
    if (!college || !department) {
      return res.status(400).json({ success: false, message: "college and department required" });
    }

    const teachers = await User.find({
      role:       "teacher",
      college:    college,
      department: department,
    }).select("_id name email teacherId phone profileImage");

    res.json({ success: true, teachers });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ════════════════════════════════════════
// ASSIGN Subject to Teacher (Admin)
// ════════════════════════════════════════
exports.assignSubject = async (req, res) => {
  try {
    const {
      subjectId, teacherId,
      college, department, semester, admissionYear,
      timetableSlots,
    } = req.body;

    // ── Validate ──
    if (!subjectId || !teacherId || !college || !department || !semester || !admissionYear) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    // ── Fetch Subject & Teacher ──
    const subject = await Subject.findById(subjectId);
    const teacher = await User.findById(teacherId);
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    // ── Check workload limit (max 6 subjects) ──
    const existing = await SubjectAssignment.countDocuments({
      teacherId, status: "active",
    });
    if (existing >= 6) {
      return res.status(400).json({
        success: false,
        message: `${teacher.name} already has ${existing} subjects assigned (max 6)`,
      });
    }

    // ── Check duplicate assignment ──
    const duplicate = await SubjectAssignment.findOne({
      subjectId, teacherId, department, semester, admissionYear, status: "active",
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "This subject is already assigned to this teacher for this class",
      });
    }

    // ── Check timetable conflicts ──
    if (timetableSlots?.length > 0) {
      for (const slot of timetableSlots) {
        const conflict = await Timetable.findOne({
          teacherId,
          day: slot.day,
          $or: [
            { startTime: { $lt: slot.endTime }, endTime: { $gt: slot.startTime } }
          ],
        });
        if (conflict) {
          return res.status(400).json({
            success: false,
            message: `⚠️ Time conflict on ${slot.day} ${slot.startTime}-${slot.endTime}. Teacher already has a class at this time.`,
          });
        }
      }
    }

    // ── Create Assignment ──
    const assignment = await SubjectAssignment.create({
      subjectId,
      subjectName:  subject.name,
      subjectCode:  subject.code || "",
      teacherId,
      teacherName:  teacher.name,
      college, department,
      semester:     Number(semester),
      admissionYear,
      timetableSlots: timetableSlots || [],
      assignedBy: req.user.id,
    });

    // ── Auto-create Timetable entries ──
    if (timetableSlots?.length > 0) {
      const timetableEntries = timetableSlots.map((slot, i) => ({
        subjectId,
        subjectName:  subject.name,
        subjectCode:  subject.code || "",
        teacherId,
        teacherName:  teacher.name,
        assignmentId: assignment._id,
        day:          slot.day,
        startTime:    slot.startTime,
        endTime:      slot.endTime,
        room:         slot.room || "",
        slotNumber:   slot.slotNumber || (i + 1),
        semester:     Number(semester),
        department,
        college,
        admissionYear,
      }));

      await Timetable.insertMany(timetableEntries);
    }

    res.status(201).json({
      success: true,
      message: `✅ "${subject.name}" successfully assigned to ${teacher.name}!`,
      assignment,
    });

  } catch (e) {
    console.log("ASSIGN SUBJECT ERROR:", e.message);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ════════════════════════════════════════
// GET All Assignments (Admin)
// ════════════════════════════════════════
exports.getAllAssignments = async (req, res) => {
  try {
    const assignments = await SubjectAssignment.find()
      .populate("subjectId", "name code")
      .populate("teacherId", "name email teacherId")
      .sort("-createdAt");
    res.json({ success: true, assignments });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ════════════════════════════════════════
// GET Assignments for a Teacher
// ════════════════════════════════════════
exports.getTeacherAssignments = async (req, res) => {
  try {
    const teacherId = req.params.teacherId || req.user.id;
    const assignments = await SubjectAssignment.find({ teacherId, status: "active" })
      .populate("subjectId", "name code credits")
      .sort("-createdAt");
    res.json({ success: true, assignments });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ════════════════════════════════════════
// UNASSIGN Subject (Admin)
// ════════════════════════════════════════
exports.unassignSubject = async (req, res) => {
  try {
    const assignment = await SubjectAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    // ── Delete timetable entries ──
    await Timetable.deleteMany({ assignmentId: assignment._id });

    // ── Delete assignment ──
    await SubjectAssignment.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Subject unassigned and timetable updated!" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ════════════════════════════════════════
// GET Teacher Timetable
// ════════════════════════════════════════
exports.getTeacherTimetable = async (req, res) => {
  try {
    const teacherId = req.params.teacherId || req.user.id;

    const slots = await Timetable.find({ teacherId })
      .populate("subjectId", "name code")
      .sort({ day: 1, startTime: 1 });

    // ── Group by day ──
    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const grouped = {};
    days.forEach(d => grouped[d] = []);

    slots.forEach(slot => {
      if (grouped[slot.day] !== undefined) {
        grouped[slot.day].push(slot);
      }
    });

    res.json({ success: true, timetable: grouped, slots });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};