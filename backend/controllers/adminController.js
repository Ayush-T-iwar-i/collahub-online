const User   = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");

// ─── Helpers ──────────────────────────────────────────────

const getAutoSemester = (admissionYear) => {
  const now      = new Date();
  const diff     = now.getFullYear() - parseInt(admissionYear);
  const isOddSem = now.getMonth() + 1 >= 7;
  let sem        = diff * 2 + (isOddSem ? 1 : 2);
  return Math.min(8, Math.max(1, sem));
};

// ══════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════
const registerAdmin = async (req, res) => {
  try {
    let { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    email = email.toLowerCase().trim();
    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already exists" });

    await User.create({ name, email, password: await bcrypt.hash(password, 10), role: "admin" });
    res.status(201).json({ message: "Admin created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const loginAdmin = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    email = email.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user || user.role !== "admin" || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: "Invalid admin credentials" });

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ message: "Admin login successful", accessToken, user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ══════════════════════════════════════════════════════════
//  STUDENTS
// ══════════════════════════════════════════════════════════

const getStudents = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id).select("college").lean();
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const { department, admissionYear, semester } = req.query;
    const filter = { role: "student", college: admin.college };
    if (department)    filter.department    = department;
    if (admissionYear) filter.admissionYear = String(admissionYear);
    if (semester)      filter.semester      = Number(semester);

    const students = await User.find(filter)
      .select("-password -refreshToken -otp -otpExpire -results")
      .sort({ admissionYear: -1, name: 1 }).lean();

    res.json({ success: true, students, total: students.length });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

const addStudent = async (req, res) => {
  try {
    let { name, email, password, phone, admissionYear, college, department, gender, semester: manualSem, studentId } = req.body;

    if (!name || !email || !password || !college || !department || !admissionYear || !studentId)
      return res.status(400).json({ message: "All required fields missing (including studentId)" });

    email = email.toLowerCase().trim();
    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already registered" });

    // Check if studentId already in use
    if (await User.findOne({ studentId: studentId.trim() }))
      return res.status(400).json({ message: "Student ID already in use. Please enter a unique Student ID." });

    const semester = manualSem ? Number(manualSem) : getAutoSemester(admissionYear);

    const s = await User.create({
      name: name.trim(), email,
      password: await bcrypt.hash(password, 10),
      phone: phone || "", studentId: studentId.trim(),
      admissionYear: String(admissionYear),
      college, department, semester,
      gender: gender || "",
      role: "student", isEmailVerified: true,
    });

    res.status(201).json({
      message: "Student added successfully",
      student: {
        _id: s._id, name: s.name, email: s.email,
        studentId: s.studentId, department: s.department,
        semester: s.semester, admissionYear: s.admissionYear, college: s.college,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

const removeStudent = async (req, res) => {
  try {
    const s = await User.findOneAndDelete({ _id: req.params.studentId, role: "student" });
    if (!s) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

const updateBatchSemester = async (req, res) => {
  try {
    const { department, admissionYear, newSemester } = req.body;
    if (!admissionYear) return res.status(400).json({ message: "admissionYear required" });

    // Always use admin's own college — never trust body for college
    const admin    = await User.findById(req.user.id).select("college").lean();
    const college  = admin?.college || "";
    if (!college) return res.status(400).json({ message: "Admin college not found" });

    const semester = newSemester ? Number(newSemester) : getAutoSemester(admissionYear);
    const filter   = { role: "student", college, admissionYear: String(admissionYear) };
    if (department) filter.department = department;

    const result = await User.updateMany(filter, { $set: { semester } });
    res.json({
      success: true,
      message: `${result.modifiedCount} students updated to Semester ${semester}`,
      newSemester: semester,
      updatedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

const assignSection = async (req, res) => {
  try {
    const { department, admissionYear, section, subSection } = req.body;
    if (!admissionYear || !section)
      return res.status(400).json({ message: "admissionYear and section required" });

    const admin  = await User.findById(req.user.id).select("college").lean();
    const filter = { role: "student", college: admin.college, admissionYear: String(admissionYear) };
    if (department) filter.department = department;

    const result = await User.updateMany(filter, { $set: { section, ...(subSection && {subSection})} });
    res.json({
      success: true,
      message: `${result.modifiedCount} students assigned to Section ${section}`,
      updatedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════
//  TEACHERS
// ══════════════════════════════════════════════════════════

const getTeachers = async (req, res) => {
  try {
    const admin          = await User.findById(req.user.id).select("college").lean();
    const { department } = req.query;
    const filter         = { role: "teacher", college: admin.college };
    if (department) filter.department = department;

    const teachers = await User.find(filter)
      .select("-password -refreshToken -otp -otpExpire")
      .sort({ name: 1 }).lean();

    res.json({ success: true, teachers, total: teachers.length });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

const addTeacher = async (req, res) => {
  try {

    let { name, email, password, phone, teacherId, college, department } = req.body;

    // ── Field by field validation ──
    if (!name || !name.trim())
      return res.status(400).json({ message: "Teacher name is required" });
    if (!email || !email.trim())
      return res.status(400).json({ message: "Email is required" });
    if (!password || !password.trim())
      return res.status(400).json({ message: "Password is required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    email = email.toLowerCase().trim();

    // ── Email duplicate check ──
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        message: `Email "${email}" is already registered as ${existing.role}. Please use a different email.`,
      });
    }

    // ── College check ──
    if (!college || !college.trim())
      return res.status(400).json({ message: "College is required. Please re-login and try again." });

    const t = await User.create({
      name:       name.trim(),
      email,
      password:   await bcrypt.hash(password, 10),
      phone:      phone?.trim()      || "",
      teacherId:  teacherId?.trim()  || "",
      college:    college.trim(),
      department: department?.trim() || "",
      role:       "teacher",
      isEmailVerified: true,
    });

    res.status(201).json({
      message: "Teacher added successfully",
      teacher: {
        _id:        t._id,
        name:       t.name,
        email:      t.email,
        teacherId:  t.teacherId,
        department: t.department,
        college:    t.college,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "A user with this email already exists.",
      });
    }
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════
//  SUBJECT ASSIGNMENT
// ══════════════════════════════════════════════════════════

const assignSubjectToTeacher = async (req, res) => {
  try {
    const {
      teacherId, subjectName, subjectCode, department,
      admissionYear, section, semester, days, timeSlot, roomNumber,
    } = req.body;

    if (!teacherId || !subjectName || !department || !days?.length || !timeSlot)
      return res.status(400).json({
        message: "teacherId, subjectName, department, days, timeSlot required",
      });

    const teacher = await User.findOne({ _id: teacherId, role: "teacher" });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const sub = {
      subjectName,
      subjectCode:   subjectCode   || "",
      department,
      admissionYear: admissionYear || "",
      section:       section       || "",
      semester:      semester ? Number(semester) : undefined,
      days:          Array.isArray(days) ? days : [days],
      timeSlot,
      roomNumber:    roomNumber || "",
      assignedAt:    new Date(),
    };

    teacher.assignedSubjects = teacher.assignedSubjects || [];
    teacher.assignedSubjects.push(sub);
    await teacher.save();

    res.json({
      success: true,
      message: `"${subjectName}" assigned to ${teacher.name}`,
      subject: sub,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

const removeAssignedSubject = async (req, res) => {
  try {
    const idx     = parseInt(req.params.subjectIndex);
    const teacher = await User.findOne({ _id: req.params.teacherId, role: "teacher" });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    if (idx < 0 || idx >= (teacher.assignedSubjects?.length || 0))
      return res.status(400).json({ message: "Invalid subject index" });

    teacher.assignedSubjects.splice(idx, 1);
    await teacher.save();
    res.json({ success: true, message: "Subject removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// ══════════════════════════════════════════════════════════
//  BULK ADD STUDENTS
// ══════════════════════════════════════════════════════════

const bulkAddStudents = async (req, res) => {
  try {
    const admin   = await User.findById(req.user.id).select("college").lean();
    const college = admin?.college || "";
    if (!college) return res.status(400).json({ message: "Admin college not found" });

    const { students } = req.body;
    if (!students || !Array.isArray(students) || students.length === 0)
      return res.status(400).json({ message: "students array required" });

    const results = { imported: 0, failed: [] };

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      try {
        const {
          name, email, password, phone,
          admissionYear, department, gender, section, semester: manualSem, studentId,
        } = s;

        if (!name || !email || !password || !department || !admissionYear || !studentId) {
          results.failed.push({ rowNum: i + 2, email: email || "—", error: "Missing required fields (studentId required)" });
          continue;
        }

        const cleanEmail = email.toLowerCase().trim();
        const exists     = await User.findOne({ email: cleanEmail });
        if (exists) {
          results.failed.push({ rowNum: i + 2, email: cleanEmail, error: "Email already registered" });
          continue;
        }

        // Check duplicate studentId
        const idExists = await User.findOne({ studentId: studentId.trim() });
        if (idExists) {
          results.failed.push({ rowNum: i + 2, email: cleanEmail, error: `Student ID "${studentId}" already in use` });
          continue;
        }

        const semester  = manualSem ? Number(manualSem) : getAutoSemester(admissionYear);

        await User.create({
          name: name.trim(),
          email: cleanEmail,
          password: await bcrypt.hash(password, 10),
          phone: phone || "",
          studentId,
          admissionYear: String(admissionYear),
          college,
          department,
          semester,
          gender:  gender  || "",
          section: section || "",
          role: "student",
          isEmailVerified: true,
        });

        results.imported++;
      } catch (err) {
        results.failed.push({ rowNum: i + 2, email: s.email || "—", error: err.message });
      }
    }

    res.status(200).json({
      success:  true,
      message:  `${results.imported} students imported successfully`,
      imported: results.imported,
      failed:   results.failed,
      total:    students.length,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

module.exports = {
  registerAdmin, loginAdmin,
  getStudents, addStudent, bulkAddStudents, removeStudent, updateBatchSemester, assignSection,
  getTeachers, addTeacher,
  assignSubjectToTeacher, removeAssignedSubject,
};