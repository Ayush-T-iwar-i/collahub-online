const Timetable = require("../models/Timetable");
const Subject   = require("../models/Subject");
const User      = require("../models/User");

// College flexible match helper
const SKIP = ["of","and","the","for","in","at","&","a","an"];
function makeAbbrev(str) {
  return str.toLowerCase().split(/\s+/)
    .filter(w => w.length > 0 && !SKIP.includes(w))
    .map(w => w[0]).join("");
}
function collegeMatches(c1, c2) {
  if (!c1 || !c2) return false;
  const a = c1.toLowerCase().trim();
  const b = c2.toLowerCase().trim();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return makeAbbrev(a) === makeAbbrev(b);
}

// ══════════════════════════════════════════════
// TEACHER: Save or update schedule
// POST /timetable/save
// ══════════════════════════════════════════════
exports.saveTeacherSchedule = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { subjectId, slots, admissionYear } = req.body;

    if (!subjectId)     return res.status(400).json({ success:false, message:"subjectId required" });
    if (!slots?.length) return res.status(400).json({ success:false, message:"At least one slot required" });

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ success:false, message:"Subject not found" });

    const timetable = await Timetable.findOneAndUpdate(
      { subjectId, teacherId },
      {
        subjectId,
        teacherId,
        college:       subject.college,
        department:    subject.department,
        semester:      subject.semester,
        admissionYear: admissionYear || "",
        slots: slots.map((s, i) => ({
          day:        s.day,
          startTime:  s.startTime,
          endTime:    s.endTime,
          room:       s.room || "",
          slotNumber: i + 1,
        })),
      },
      { upsert:true, new:true }
    );

    res.json({ success:true, timetable });
  } catch (error) {
    res.status(500).json({ success:false, message:error.message });
  }
};

// ══════════════════════════════════════════════
// TEACHER: Apna timetable dekho
// GET /timetable/my
// ══════════════════════════════════════════════
exports.getMyTimetable = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const timetables = await Timetable.find({ teacherId })
      .populate("subjectId", "name code type credits");

    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const grouped = {};
    days.forEach(d => grouped[d] = []);

    timetables.forEach(tt => {
      tt.slots.forEach(slot => {
        grouped[slot.day]?.push({
          timetableId:   tt._id,
          subjectId:     tt.subjectId?._id,
          subjectName:   tt.subjectId?.name,
          subjectCode:   tt.subjectId?.code,
          department:    tt.department,
          semester:      tt.semester,
          admissionYear: tt.admissionYear,
          day:           slot.day,
          startTime:     slot.startTime,
          endTime:       slot.endTime,
          room:          slot.room,
          slotNumber:    slot.slotNumber,
        });
      });
    });

    days.forEach(d => {
      grouped[d].sort((a,b) => a.startTime.localeCompare(b.startTime));
    });

    res.json({ success:true, timetable:grouped, raw:timetables });
  } catch (error) {
    res.status(500).json({ success:false, message:error.message });
  }
};

// ══════════════════════════════════════════════
// TEACHER: Ek subject ka existing schedule
// GET /timetable/subject/:subjectId
// ══════════════════════════════════════════════
exports.getSubjectSchedule = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const timetable = await Timetable.findOne({
      subjectId: req.params.subjectId,
      teacherId,
    }).populate("subjectId","name code type semester");

    res.json({ success:true, timetable: timetable || null });
  } catch (error) {
    res.status(500).json({ success:false, message:error.message });
  }
};

// ══════════════════════════════════════════════
// STUDENT: Apne subjects ka timetable
// GET /timetable/for-student
// ══════════════════════════════════════════════
exports.getStudentTimetable = async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .select("college department semester name");

    if (!student) return res.status(404).json({ success:false, message:"Student not found" });
    if (!student.college || !student.department || !student.semester) {
      return res.status(400).json({ success:false, message:"Profile incomplete", timetable:{} });
    }

    const timetables = await Timetable.find({
      department: student.department.trim(),
      semester:   Number(student.semester),
    })
      .populate("subjectId", "name code type credits")
      .populate("teacherId", "name teacherId employeeId");

    const matched = timetables.filter(tt => collegeMatches(tt.college, student.college));

    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const grouped = {};
    days.forEach(d => grouped[d] = []);

    matched.forEach(tt => {
      tt.slots.forEach(slot => {
        grouped[slot.day]?.push({
          timetableId:   tt._id,
          subjectId:     tt.subjectId?._id,
          subjectName:   tt.subjectId?.name,
          subjectCode:   tt.subjectId?.code,
          subjectType:   tt.subjectId?.type,
          credits:       tt.subjectId?.credits,
          teacherName:   tt.teacherId?.name,
          teacherEmpId:  tt.teacherId?.teacherId || tt.teacherId?.employeeId,
          department:    tt.department,
          semester:      tt.semester,
          day:           slot.day,
          startTime:     slot.startTime,
          endTime:       slot.endTime,
          room:          slot.room,
        });
      });
    });

    days.forEach(d => {
      grouped[d].sort((a,b) => a.startTime.localeCompare(b.startTime));
    });

    res.json({
      success:   true,
      timetable: grouped,
      student: {
        name:       student.name,
        college:    student.college,
        department: student.department,
        semester:   student.semester,
      },
    });
  } catch (error) {
    res.status(500).json({ success:false, message:error.message });
  }
};

// ══════════════════════════════════════════════
// TEACHER: Schedule delete
// DELETE /timetable/:id
// ══════════════════════════════════════════════
exports.deleteSchedule = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const tt = await Timetable.findOneAndDelete({ _id:req.params.id, teacherId });
    if (!tt) return res.status(404).json({ success:false, message:"Not found" });
    res.json({ success:true, message:"Schedule deleted" });
  } catch (error) {
    res.status(500).json({ success:false, message:error.message });
  }
};