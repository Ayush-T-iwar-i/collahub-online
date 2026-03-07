const Subject = require("../models/Subject");
const User    = require("../models/User");

// ══════════════════════════════════════════════
// HELPER: Flexible college match
// "NIET" ↔ "Nims Institute of Engineering and Technology"
// Skip karta hai: of, and, the, for, in, at, &
// ══════════════════════════════════════════════
const SKIP = ["of","and","the","for","in","at","&","a","an"];

function makeAbbrev(str) {
  return str
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0 && !SKIP.includes(w))
    .map(w => w[0])
    .join("");
}

function collegeMatches(subjectCollege, userCollege) {
  if (!subjectCollege || !userCollege) return false;

  const sc = subjectCollege.toLowerCase().trim();
  const uc = userCollege.toLowerCase().trim();

  if (sc === uc)                         return true; // exact
  if (sc.includes(uc) || uc.includes(sc)) return true; // one inside other

  const scAbbrev = makeAbbrev(sc);
  const ucAbbrev = makeAbbrev(uc);

  if (scAbbrev === ucAbbrev) return true; // niet === niet
  if (sc === ucAbbrev)       return true; // "niet" === abbrev of full name
  if (uc === scAbbrev)       return true; // reverse

  return false;
}

// ══════════════════════════════════════════════
// ADMIN: Create Subject
// POST /subjects/create
// ══════════════════════════════════════════════
exports.createSubject = async (req, res) => {
  try {
    const { name, code, type, college, department, semester, credits, description } = req.body;

    if (!name || !code || !college || !department || !semester) {
      return res.status(400).json({
        success: false,
        message: "name, code, college, department, semester — sab required hain",
      });
    }

    const subject = await Subject.create({
      name:        name.trim(),
      code:        code.trim().toUpperCase(),
      type:        type || "Theory",
      college:     college.trim(),
      department:  department.trim(),
      semester:    Number(semester),
      credits:     Number(credits) || 0,
      description: description?.trim() || "",
    });

    res.status(201).json({ success: true, subject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Is department & semester mein same code ka subject already hai",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════
// ADMIN: Get All Subjects
// GET /subjects
// GET /subjects?college=NIET&department=CSE&semester=2
// ══════════════════════════════════════════════
exports.getSubjects = async (req, res) => {
  try {
    const { college, department, semester } = req.query;
    const filter = {};
    if (college)    filter.college    = college;
    if (department) filter.department = department;
    if (semester)   filter.semester   = Number(semester);

    const subjects = await Subject.find(filter)
      .sort({ college: 1, semester: 1, name: 1 });

    res.json({ success: true, subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════
// TEACHER: Matching subjects
// GET /subjects/for-teacher
// Match: college (flexible) + department
// ══════════════════════════════════════════════
exports.getSubjectsForTeacher = async (req, res) => {
  try {
    const teacher = await User.findById(req.user.id)
      .select("name college department");

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    if (!teacher.college || !teacher.department) {
      return res.status(400).json({
        success:  false,
        message:  "Teacher profile mein college aur department missing hai",
        subjects: [],
        teacher:  null,
      });
    }

    // Step 1: Same department ke saare subjects
    const allSubjects = await Subject.find({
      department: teacher.department.trim(),
    }).sort({ semester: 1, name: 1 });

    // Step 2: Flexible college match
    const subjects = allSubjects.filter(s =>
      collegeMatches(s.college, teacher.college)
    );

    console.log(`[for-teacher] ${teacher.college} | ${teacher.department} → ${subjects.length}/${allSubjects.length}`);

    res.json({
      success: true,
      subjects,
      teacher: {
        id:         teacher._id,
        name:       teacher.name,
        college:    teacher.college,
        department: teacher.department,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════
// STUDENT: Matching subjects
// GET /subjects/for-student
// Match: college (flexible) + department + semester
// ══════════════════════════════════════════════
exports.getSubjectsForStudent = async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .select("name college department semester admissionYear");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (!student.college || !student.department || !student.semester) {
      return res.status(400).json({
        success:  false,
        message:  "Student profile incomplete — college, department, semester required",
        subjects: [],
        info:     null,
      });
    }

    // Step 1: Same department + semester
    const allSubjects = await Subject.find({
      department: student.department.trim(),
      semester:   Number(student.semester),
    }).sort({ name: 1 });

    // Step 2: Flexible college match
    const subjects = allSubjects.filter(s =>
      collegeMatches(s.college, student.college)
    );

    console.log(`[for-student] ${student.college} | ${student.department} | Sem ${student.semester} → ${subjects.length}/${allSubjects.length}`);

    res.json({
      success: true,
      subjects,
      info: {
        college:       student.college,
        department:    student.department,
        semester:      student.semester,
        admissionYear: student.admissionYear || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════
// ADMIN: Get Subject by ID
// GET /subjects/:id
// ══════════════════════════════════════════════
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    res.json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════
// ADMIN: Update Subject
// PUT /subjects/:id
// ══════════════════════════════════════════════
exports.updateSubject = async (req, res) => {
  try {
    const { name, code, type, credits, description } = req.body;
    const updateData = {};

    if (name)                      updateData.name        = name.trim();
    if (code)                      updateData.code        = code.trim().toUpperCase();
    if (type)                      updateData.type        = type;
    if (credits !== undefined)     updateData.credits     = Number(credits) || 0;
    if (description !== undefined) updateData.description = description.trim();

    const subject = await Subject.findByIdAndUpdate(
      req.params.id, updateData, { new: true }
    );

    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    res.json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════
// ADMIN: Delete Subject
// DELETE /subjects/:id
// ══════════════════════════════════════════════
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    res.json({ success: true, message: "Subject deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};