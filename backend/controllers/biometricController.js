// ══════════════════════════════════════════════════════════════════════
// biometricController.js  —  backend/controllers/biometricController.js
//
// Essl / FingerTec device ADMS Push Protocol support
//
// Device setup:
//   Device Menu → Comm → ADMS → Server Address = [CollaHub server IP]
//                               Port            = 5000 (ya jo bhi port ho)
//                               Protocol        = HTTP
//
// Device POST bhejta hai:
//   POST /biometric/push
//   Body: form-data ya JSON with punch log
// ══════════════════════════════════════════════════════════════════════

const BiometricLog = require("../models/BiometricLog");
const User         = require("../models/User");

// ─────────────────────────────────────────────────────────
//  Helper: punchType detect karna (time-based logic)
//  Essl device sometimes sends only "IN" or "OUT"
//  otherwise we guess from time
// ─────────────────────────────────────────────────────────
function detectPunchType(rawType, punchTime) {
  // Agar device ne explicitly bheja
  if (rawType) {
    const t = String(rawType).toLowerCase();
    if (t.includes("out") || t === "1") return "CheckOut";
    if (t.includes("in")  || t === "0") return "CheckIn";
    if (t.includes("break"))            return "Break";
  }
  // Time-based fallback: 6am–12pm = CheckIn, baaki = CheckOut
  const hour = new Date(punchTime).getHours();
  return (hour >= 6 && hour < 13) ? "CheckIn" : "CheckOut";
}

// ─────────────────────────────────────────────────────────
//  Helper: deviceUserId se CollaHub student dhundho
//  Essl device mein student ka User ID enroll hota hai
//  (studentId ya phone ya numeric ID)
// ─────────────────────────────────────────────────────────
async function matchStudent(deviceUserId) {
  if (!deviceUserId) return null;
  const id = String(deviceUserId).trim();

  // Try: studentId field
  let user = await User.findOne({ studentId: id, role: "student" })
    .select("_id name studentId college department semester section role");

  // Try: numeric prefix match (agar device mein sirf number store hai)
  if (!user) {
    user = await User.findOne({
      studentId: { $regex: id, $options: "i" },
      role: "student",
    }).select("_id name studentId college department semester section role");
  }

  // Try: phone number match (some colleges use phone as ID)
  if (!user) {
    user = await User.findOne({ phone: id, role: "student" })
      .select("_id name studentId college department semester section role");
  }

  return user;
}

// ══════════════════════════════════════════════════════════════
// 1. ESSL ADMS PUSH ENDPOINT
//    POST /biometric/push
//    Essl device automatically yahan push karta hai
//
//    Essl ADMS payload (form-urlencoded):
//    SN=<serial>&table=ATTLOG&Stamp=<timestamp>&
//    Data=<userid>\t<datetime>\t<status>\t<verify>\t<reserved>\t<workcode>
// ══════════════════════════════════════════════════════════════
exports.handleEsslPush = async (req, res) => {
  try {
    const body = req.body;

    // ── Essl ADMS format: raw text body ──
    // Data field: "1001\t2024-03-12 09:05:00\t0\t1\t0\t0"
    // Fields:      UserID  DateTime              Status VerifyType Reserved WorkCode
    // Status: 0=CheckIn, 1=CheckOut, 4=Break

    const sn        = body.SN || body.sn || "UNKNOWN";
    const table     = body.table || body.Table || "ATTLOG";
    const rawData   = body.Data || body.data || "";
    const stamp     = body.Stamp || body.stamp || "";

    // Heartbeat — device only pings, no data
    if (!rawData && table !== "ATTLOG") {
      return res.send("OK");
    }

    // Parse multiple lines (multiple logs can come in one push)
    const lines = rawData.split("\n").filter(l => l.trim());
    const results = [];

    for (const line of lines) {
      const parts     = line.trim().split("\t");
      if (parts.length < 2) continue;

      const deviceUserId = parts[0]?.trim();
      const dateTimeStr  = parts[1]?.trim(); // "2024-03-12 09:05:00"
      const statusCode   = parts[2]?.trim(); // "0"=in, "1"=out
      const verifyType   = parts[3]?.trim(); // "1"=finger, "4"=face, "15"=face

      const punchTime  = new Date(dateTimeStr);
      if (isNaN(punchTime.getTime())) continue; // invalid date skip

      const punchType  = detectPunchType(statusCode, punchTime);
      const verifyMode = verifyType === "4" || verifyType === "15" ? "Face"
                       : verifyType === "1" ? "Fingerprint"
                       : verifyType === "2" ? "Card"
                       : "Unknown";

      // Duplicate check — same device + user + 30 second window mein same punch
      const thirtySecondsAgo = new Date(punchTime.getTime() - 30000);
      const existing = await BiometricLog.findOne({
        deviceSerial: sn,
        deviceUserId,
        punchTime:    { $gte: thirtySecondsAgo, $lte: new Date(punchTime.getTime() + 30000) },
      });
      if (existing) continue; // duplicate skip

      // Match student
      const student = await matchStudent(deviceUserId);

      // Save log
      const log = await BiometricLog.create({
        deviceSerial:  sn,
        deviceLabel:   "Main Gate",
        deviceUserId,
        userId:        student?._id       || null,
        studentId:     student?.studentId || null,
        name:          student?.name      || null,
        college:       student?.college   || null,
        department:    student?.department|| null,
        semester:      student?.semester  || null,
        section:       student?.section   || null,
        punchTime,
        punchType,
        verifyMode,
        matched:       !!student,
        processed:     false,
        rawPayload:    { sn, line, stamp },
      });

      results.push(log._id);

      // If student matched — optional: also create attendance record
      if (student && punchType === "CheckIn") {
        await autoMarkAttendance(student, punchTime, sn);
        await BiometricLog.findByIdAndUpdate(log._id, { processed: true });
      }
    }

    // Essl device expects this response
    res.set("Content-Type", "text/plain");
    res.send(`OK: ${results.length} logs saved`);

  } catch (e) {
    console.error("Biometric push error:", e.message);
    // Device ko 200 bhejo — warna retry loop mein phans jayega
    res.send("OK");
  }
};

// ──────────────────────────────────────────────────────────
//  Auto mark attendance when student punches CheckIn
//  (Optional — enable/disable as needed)
// ──────────────────────────────────────────────────────────
async function autoMarkAttendance(student, punchTime, deviceSerial) {
  try {
    // Check if attendance already exists for today
    const Attendance = require("../models/Attendance") ||
                       require("../models/AttendanceModel");
    if (!Attendance) return;

    const dayStart = new Date(punchTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(punchTime);
    dayEnd.setHours(23, 59, 59, 999);

    // Sirf ek baar per day gate attendance
    const exists = await Attendance.findOne({
      student:    student._id,
      date:       { $gte: dayStart, $lte: dayEnd },
      type:       "gate",
    });
    if (exists) return;

    await Attendance.create({
      student:       student._id,
      studentId:     student.studentId,
      college:       student.college,
      department:    student.department,
      semester:      student.semester,
      section:       student.section,
      date:          punchTime,
      status:        "present",
      type:          "gate",       // gate attendance (class se alag)
      source:        "biometric",
      deviceSerial,
      markedAt:      new Date(),
    });
  } catch (e) {
    // Silently fail — attendance model structure may differ
    console.log("Auto-attendance note:", e.message);
  }
}

// ══════════════════════════════════════════════════════════════
// 2. HEARTBEAT — Essl device status check karta hai
//    GET /biometric/ping
// ══════════════════════════════════════════════════════════════
exports.heartbeat = (req, res) => {
  // Essl ADMS protocol: device expects specific response
  res.set("Content-Type", "text/plain");
  res.send("OK");
};

// ══════════════════════════════════════════════════════════════
// 3. GET LIVE LOGS — Admin dashboard ke liye
//    GET /biometric/logs?date=2024-03-12&college=NIET&limit=50
// ══════════════════════════════════════════════════════════════
exports.getLogs = async (req, res) => {
  try {
    const { date, college, department, matched, limit = 50, page = 1 } = req.query;

    const filter = {};

    if (date) {
      const d = new Date(date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end   = new Date(d); end.setHours(23, 59, 59, 999);
      filter.punchTime = { $gte: start, $lte: end };
    } else {
      // Default: aaj ke logs
      const today = new Date(); today.setHours(0, 0, 0, 0);
      filter.punchTime = { $gte: today };
    }

    if (college)    filter.college    = college;
    if (department) filter.department = department;
    if (matched !== undefined) filter.matched = matched === "true";

    const [logs, total] = await Promise.all([
      BiometricLog.find(filter)
        .sort("-punchTime")
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .lean(),
      BiometricLog.countDocuments(filter),
    ]);

    // Today's stats
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalToday, matchedToday, checkInsToday, unmatched] = await Promise.all([
      BiometricLog.countDocuments({ punchTime: { $gte: today } }),
      BiometricLog.countDocuments({ punchTime: { $gte: today }, matched: true }),
      BiometricLog.countDocuments({ punchTime: { $gte: today }, punchType: "CheckIn" }),
      BiometricLog.countDocuments({ punchTime: { $gte: today }, matched: false }),
    ]);

    res.json({
      success: true,
      logs,
      total,
      page: Number(page),
      stats: {
        totalToday,
        matchedToday,
        checkInsToday,
        unmatched,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════════════
// 4. GET STUDENT GATE HISTORY
//    GET /biometric/student/:studentId?days=7
// ══════════════════════════════════════════════════════════════
exports.getStudentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const days = Number(req.query.days) || 7;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await BiometricLog.find({
      studentId,
      punchTime: { $gte: since },
    }).sort("-punchTime").lean();

    res.json({ success: true, logs, days });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════════════
// 5. MANUAL DEVICE PULL — Essl SDK se directly fetch karo
//    POST /biometric/pull  { deviceIp, devicePort }
//    (When device does not push, manually pull)
// ══════════════════════════════════════════════════════════════
exports.manualPull = async (req, res) => {
  try {
    const { deviceIp, devicePort = 4370 } = req.body;
    if (!deviceIp) return res.status(400).json({ message: "deviceIp required" });

    // node-zklib use karo (npm install node-zklib)
    let ZKLib;
    try { ZKLib = require("node-zklib"); }
    catch { return res.status(500).json({ message: "install node-zklib: npm install node-zklib" }); }

    const device = new ZKLib(deviceIp, devicePort, 10000, 4000);
    await device.createSocket();

    const data = await device.getAttendances();
    await device.disconnect();

    const logs = data?.data || [];
    let saved = 0;

    for (const entry of logs) {
      const deviceUserId = String(entry.deviceUserId || entry.uid);
      const punchTime    = new Date(entry.attendTime || entry.timestamp);
      if (isNaN(punchTime.getTime())) continue;

      const exists = await BiometricLog.findOne({
        deviceUserId,
        punchTime: { $gte: new Date(punchTime.getTime() - 5000) },
      });
      if (exists) continue;

      const student   = await matchStudent(deviceUserId);
      const punchType = detectPunchType(entry.type, punchTime);

      await BiometricLog.create({
        deviceSerial: deviceIp,
        deviceLabel:  "Manual Pull",
        deviceUserId,
        userId:       student?._id       || null,
        studentId:    student?.studentId || null,
        name:         student?.name      || null,
        college:      student?.college   || null,
        department:   student?.department|| null,
        semester:     student?.semester  || null,
        section:      student?.section   || null,
        punchTime,
        punchType,
        verifyMode:   "Unknown",
        matched:      !!student,
        processed:    false,
        rawPayload:   entry,
      });
      saved++;
    }

    res.json({ success: true, totalFetched: logs.length, saved });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════════════
// 6. ENROLL DEVICE USER → STUDENT MAPPING
//    POST /biometric/enroll  { deviceUserId, studentId }
//    Agar device mein "1001" hai aur student "STU2023001" hai
// ══════════════════════════════════════════════════════════════
exports.enrollMapping = async (req, res) => {
  try {
    const { deviceUserId, studentId } = req.body;
    if (!deviceUserId || !studentId) {
      return res.status(400).json({ message: "deviceUserId and studentId both required" });
    }

    const student = await User.findOne({ studentId, role: "student" });
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Update all unmatched logs for this deviceUserId
    const result = await BiometricLog.updateMany(
      { deviceUserId, matched: false },
      {
        userId:     student._id,
        studentId:  student.studentId,
        name:       student.name,
        college:    student.college,
        department: student.department,
        semester:   student.semester,
        section:    student.section,
        matched:    true,
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} logs matched to ${student.name}`,
      student: { name: student.name, studentId: student.studentId },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════════════
// 7. UNMATCHED LOGS — Admin fix kare
//    GET /biometric/unmatched
// ══════════════════════════════════════════════════════════════
exports.getUnmatched = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const logs = await BiometricLog.find({ matched: false, punchTime: { $gte: today } })
      .sort("-punchTime")
      .limit(100)
      .lean();
    res.json({ success: true, logs, count: logs.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════
// GET TEACHER ATTENDANCE  —  GET /biometric/teacher-attendance
// Same college ke saare teachers + aaj ke punch stats
// Query: college, date (YYYY-MM-DD)
// ══════════════════════════════════════════════════════
exports.getTeacherAttendance = async (req, res) => {
  try {
    const BiometricLog = require("../models/BiometricLog");
    const User = require("../models/User");

    const { college, date } = req.query;
    if (!college) return res.status(400).json({ success: false, message: "College required" });

    // Date range — full day
    const dayStart = new Date(date || new Date());
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    // Get all teachers of this college
    const teachers = await User.find({
      role: "teacher",
      college: { $regex: new RegExp(college.trim(), "i") },
    }).select("_id name email department teacherId college").lean();

    if (!teachers.length) {
      return res.json({ success: true, teachers: [], stats: { total: 0, present: 0, absent: 0, totalPunches: 0 } });
    }

    const teacherIds = teachers.map(t => t._id);

    // Get today's logs for these teachers
    const logs = await BiometricLog.find({
      userId: { $in: teacherIds },
      punchTime: { $gte: dayStart, $lte: dayEnd },
    }).sort({ punchTime: -1 }).lean();

    // Map logs to teachers
    const logsByTeacher = {};
    logs.forEach(log => {
      const tid = log.userId?.toString();
      if (!logsByTeacher[tid]) logsByTeacher[tid] = [];
      logsByTeacher[tid].push(log);
    });

    // Build response
    const teacherData = teachers.map(t => {
      const tid = t._id.toString();
      const teacherLogs = logsByTeacher[tid] || [];
      const lastPunch = teacherLogs[0] || null; // already sorted desc
      return {
        ...t,
        todayPunches: teacherLogs.length,
        lastPunch: lastPunch ? {
          punchType: lastPunch.punchType,
          punchTime: lastPunch.punchTime,
          verifyMode: lastPunch.verifyMode,
        } : null,
      };
    });

    // Sort: present first, then absent
    teacherData.sort((a, b) => {
      if (a.lastPunch && !b.lastPunch) return -1;
      if (!a.lastPunch && b.lastPunch) return 1;
      return 0;
    });

    const present = teacherData.filter(t => !!t.lastPunch).length;

    res.json({
      success: true,
      teachers: teacherData,
      stats: {
        total: teachers.length,
        present,
        absent: teachers.length - present,
        totalPunches: logs.length,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════
// GET TEACHER PUNCH LOGS  —  GET /biometric/teacher-logs
// Ek specific teacher ke logs for a date
// Query: userId, date (YYYY-MM-DD)
// ══════════════════════════════════════════════════════
exports.getTeacherLogs = async (req, res) => {
  try {
    const BiometricLog = require("../models/BiometricLog");

    const { userId, date } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    const dayStart = new Date(date || new Date());
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const logs = await BiometricLog.find({
      userId,
      punchTime: { $gte: dayStart, $lte: dayEnd },
    }).sort({ punchTime: 1 }).lean();

    res.json({ success: true, logs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};