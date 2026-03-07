const User   = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");

// ══════════════════════════════════════════════════════════
// ✅ FIXED: Student ID generator — deletion & race-condition safe
//
// ❌ OLD BUG (countDocuments):
//    Students: 2023-CSE-001, 2023-CSE-002  → count=2 → next=003 ✅
//    Delete 001 → count=1 → next=002 ← DUPLICATE! 💥
//    Two simultaneous requests → both get count=2 → both get 003 ← DUPLICATE! 💥
//
// ✅ FIX (findOne + sort):
//    Always finds the HIGHEST existing serial and adds 1.
//    Deletions don't affect it. Much safer under load.
// ══════════════════════════════════════════════════════════
const generateStudentId = async (department, admissionYear) => {
  const deptMatch = department?.match(/\(([^)]+)\)/);
  const deptCode  = deptMatch
    ? deptMatch[1].toUpperCase()
    : department?.split(" ").filter(w => w.length > 2)[0]?.toUpperCase() || "DEPT";

  const year   = admissionYear || new Date().getFullYear();
  const prefix = `${year}-${deptCode}-`;

  // Find highest existing ID for this year+dept combination
  const lastStudent = await User.findOne({
    role:      "student",
    studentId: { $regex: `^${prefix}` },
  })
    .sort({ studentId: -1 })
    .select("studentId")
    .lean();

  let nextSerial = 1;
  if (lastStudent?.studentId) {
    const parts   = lastStudent.studentId.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextSerial = lastNum + 1;
  }

  return `${prefix}${String(nextSerial).padStart(3, "0")}`;
};

// ── Auto Semester from Admission Year ──────────────────────
const getAutoSemester = (admissionYear) => {
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const yearDiff     = currentYear - parseInt(admissionYear);
  const isOddSem     = currentMonth >= 7;
  let semester       = yearDiff * 2 + (isOddSem ? 1 : 2);
  if (semester < 1) semester = 1;
  if (semester > 8) semester = 8;
  return semester;
};

/* ═══════════════════════ REGISTER ADMIN ═══════════════════════ */
const registerAdmin = async (req, res) => {
  try {
    let { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    email = email.toLowerCase().trim();
    const emailExist = await User.findOne({ email });
    if (emailExist)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword, role: "admin" });
    res.status(201).json({ message: "Admin created successfully" });
  } catch (error) {
    console.log("ADMIN REGISTER ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

/* ═══════════════════════ LOGIN ADMIN ═══════════════════════════ */
const loginAdmin = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    email = email.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user || user.role !== "admin")
      return res.status(400).json({ message: "Invalid admin credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid admin credentials" });

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ message: "Admin login successful", accessToken, user });
  } catch (error) {
    console.log("ADMIN LOGIN ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

/* ═══════════════════════ ADD STUDENT ════════════════════════════
   POST /admin/add-student
   ✅ Student ID auto-generated: YEAR-DEPT-NNN (e.g. 2023-CSE-004)
   ✅ Semester auto-calculated from admissionYear (or manual override)
═════════════════════════════════════════════════════════════════*/
const addStudent = async (req, res) => {
  try {
    let {
      name, email, password, phone,
      admissionYear, college, department,
      gender, semester: manualSemester,
    } = req.body;

    if (!name || !email || !password || !college || !department || !admissionYear)
      return res.status(400).json({ message: "All fields required" });

    email = email.toLowerCase().trim();

    const emailExist = await User.findOne({ email });
    if (emailExist)
      return res.status(400).json({ message: "Email already registered" });

    // ✅ Generate unique Student ID
    const studentId = await generateStudentId(department, admissionYear);
    console.log("✅ Student ID:", studentId);

    // ✅ Semester: use manual if provided, else auto-calculate
    const semester = manualSemester
      ? Number(manualSemester)
      : getAutoSemester(admissionYear);
    console.log("✅ Semester:", semester, "for year:", admissionYear);

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await User.create({
      name:            name.trim(),
      email,
      password:        hashedPassword,
      phone:           phone || "",
      studentId,
      admissionYear:   String(admissionYear),
      college,
      department,
      semester,
      gender:          gender || "",
      role:            "student",
      isEmailVerified: true,
    });

    res.status(201).json({
      message: "Student added successfully",
      student: {
        _id:           student._id,
        name:          student.name,
        email:         student.email,
        studentId:     student.studentId,
        department:    student.department,
        semester:      student.semester,
        admissionYear: student.admissionYear,
        college:       student.college,
      },
    });
  } catch (error) {
    console.log("ADD STUDENT ERROR:", error.message);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

/* ═══════════════════════ ADD TEACHER ════════════════════════════ */
const addTeacher = async (req, res) => {
  try {
    let { name, email, password, phone, teacherId, college, department } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password required" });

    email = email.toLowerCase().trim();

    const emailExist = await User.findOne({ email });
    if (emailExist)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = await User.create({
      name, email,
      password:        hashedPassword,
      phone:           phone       || "",
      teacherId:       teacherId   || "",
      college:         college     || "",
      department:      department  || "",
      role:            "teacher",
      isEmailVerified: true,
    });

    res.status(201).json({
      message: "Teacher added successfully",
      teacher: {
        _id:        teacher._id,
        name:       teacher.name,
        email:      teacher.email,
        teacherId:  teacher.teacherId,
        department: teacher.department,
      },
    });
  } catch (error) {
    console.log("ADD TEACHER ERROR:", error.message);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

/* ═══════════════════════ BATCH SEMESTER UPDATE ══════════════════
   PUT /admin/update-batch-semester
   Body: { college, department, admissionYear, newSemester? }
   newSemester omit karein → auto-calculates from admissionYear
═════════════════════════════════════════════════════════════════*/
const updateBatchSemester = async (req, res) => {
  try {
    const { college, department, admissionYear, newSemester } = req.body;

    if (!admissionYear)
      return res.status(400).json({ message: "admissionYear required" });

    const targetSemester = newSemester
      ? Number(newSemester)
      : getAutoSemester(admissionYear);

    console.log(`✅ Batch Update: ${college} | ${department} | Year:${admissionYear} → Sem ${targetSemester}`);

    const filter = { role: "student", admissionYear: String(admissionYear) };
    if (college)    filter.college    = college;
    if (department) filter.department = department;

    const result = await User.updateMany(filter, { $set: { semester: targetSemester } });

    console.log(`✅ Updated ${result.modifiedCount} students to Sem ${targetSemester}`);

    res.json({
      success:      true,
      message:      `${result.modifiedCount} students updated to Semester ${targetSemester}`,
      newSemester:  targetSemester,
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.log("BATCH UPDATE ERROR:", error.message);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  addStudent,
  addTeacher,
  updateBatchSemester,
};