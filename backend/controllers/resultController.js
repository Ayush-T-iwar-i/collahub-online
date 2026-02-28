const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");
const Subject    = require("../models/Subject");
const User       = require("../models/User");
const PDFDocument = require("pdfkit");

// ─────────────────────────────────────────────
// HELPER: Grade calculate karo percentage se
// ─────────────────────────────────────────────
const getGrade = (percentage) => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
};

// ─────────────────────────────────────────────
// HELPER: Admission year se semester calculate
// ─────────────────────────────────────────────
const calcSemFromYear = (admissionYear) => {
  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const admission = parseInt(admissionYear);
  if (!admission || isNaN(admission)) return 1;

  let yearsCompleted = currentYear - admission;
  if (currentMonth < 7) yearsCompleted -= 1; // July se pehle naya year nahi

  const sem = (yearsCompleted * 2) + 1;
  return Math.min(Math.max(sem, 1), 8);
};

// =================================================================
// 1. STUDENT APNA RESULT DEKHE (Assignment based)
//    GET /results/my
// =================================================================
exports.getStudentResult = async (req, res) => {
  try {
    const studentId = req.user.id;

    const submissions = await Submission.find({ studentId }).populate({
      path: "assignmentId",
      populate: { path: "subjectId", model: "Subject" },
    });

    let subjectMap = {};

    submissions.forEach((sub) => {
      if (!sub.assignmentId || !sub.assignmentId.subjectId) return;
      const subjectName = sub.assignmentId.subjectId.name;
      if (!subjectMap[subjectName])
        subjectMap[subjectName] = { totalMarks: 0, totalAssignments: 0 };
      subjectMap[subjectName].totalMarks      += sub.marks || 0;
      subjectMap[subjectName].totalAssignments += 1;
    });

    let result          = [];
    let overallTotal    = 0;
    let overallCount    = 0;

    for (let subject in subjectMap) {
      const data    = subjectMap[subject];
      const average = data.totalAssignments === 0
        ? 0
        : (data.totalMarks / data.totalAssignments).toFixed(2);
      result.push({ subject, totalMarks: data.totalMarks, average });
      overallTotal += data.totalMarks;
      overallCount += data.totalAssignments;
    }

    const overallPercentage = overallCount === 0
      ? 0
      : (overallTotal / overallCount).toFixed(2);

    // ── Semester results bhi attach karo ──
    const student = await User.findById(studentId)
      .select("name studentId semester admissionYear results isPromoted");

    res.json({
      success: true,
      subjects:           result,
      overallTotal,
      overallPercentage,
      currentSemester:    student?.semester,
      admissionYear:      student?.admissionYear,
      isPromoted:         student?.isPromoted,
      semesterResults:    student?.results?.sort((a, b) => a.semester - b.semester) || [],
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================================================
// 2. ADMIN — SEMESTER RESULT UPLOAD + AUTO SEMESTER UPDATE
//    POST /results/upload
// =================================================================
exports.uploadResult = async (req, res) => {
  try {
    const {
      studentId,
      semester,
      year,
      sgpa,
      cgpa,
      status,    // "pass" | "fail"
      subjects,  // [{ name, code, marks, maxMarks, grade, status }]
    } = req.body;

    if (!studentId || !semester || !status)
      return res.status(400).json({ message: "studentId, semester and status required" });

    const student = await User.findOne({ _id: studentId, role: "student" });
    if (!student)
      return res.status(404).json({ message: "Student not found" });

    // ── Result save/update karo ──
    const existingIndex = student.results.findIndex(
      (r) => r.semester === Number(semester)
    );

    const resultData = {
      semester:   Number(semester),
      year:       year || new Date().getFullYear(),
      sgpa:       sgpa || 0,
      cgpa:       cgpa || 0,
      status,
      subjects:   subjects || [],
      uploadedAt: new Date(),
      uploadedBy: req.user?.name || "Admin",
    };

    if (existingIndex >= 0) {
      student.results[existingIndex] = resultData; // update
    } else {
      student.results.push(resultData);            // naya add
    }

    // ── AUTO SEMESTER UPDATE ──
    const currentSem = Number(semester);

    if (status === "pass") {
      // Pass → next semester (max 8)
      student.semester   = Math.min(currentSem + 1, 8);
      student.isPromoted = true;
    } else {
      // Fail → same semester
      student.semester   = currentSem;
      student.isPromoted = false;
    }

    await student.save();

    res.json({
      success: true,
      message: status === "pass"
        ? `✅ Pass! Student promoted to Semester ${student.semester}`
        : `❌ Fail. Student stays in Semester ${currentSem}`,
      currentSemester: student.semester,
      status,
    });

  } catch (error) {
    console.log("UPLOAD RESULT ERROR:", error.message);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// =================================================================
// 3. ADMIN — KISI BHI STUDENT KA RESULT DEKHE
//    GET /results/student/:id
// =================================================================
exports.getStudentResultById = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "student" })
      .select("name studentId semester admissionYear results isPromoted department college");

    if (!student)
      return res.status(404).json({ message: "Student not found" });

    res.json({
      success: true,
      student: {
        name:            student.name,
        studentId:       student.studentId,
        department:      student.department,
        college:         student.college,
        currentSemester: student.semester,
        admissionYear:   student.admissionYear,
        isPromoted:      student.isPromoted,
        results:         student.results.sort((a, b) => a.semester - b.semester),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =================================================================
// 4. ADMIN — RESULT DELETE KARO
//    DELETE /results/:studentId/:semester
// =================================================================
exports.deleteResult = async (req, res) => {
  try {
    const { studentId, semester } = req.params;

    const student = await User.findOne({ _id: studentId, role: "student" });
    if (!student)
      return res.status(404).json({ message: "Student not found" });

    const before = student.results.length;
    student.results = student.results.filter(
      (r) => r.semester !== Number(semester)
    );

    if (student.results.length === before)
      return res.status(404).json({ message: "Result not found for this semester" });

    await student.save();
    res.json({ success: true, message: "Result deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =================================================================
// 5. ADMIN — SYNC ALL SEMESTERS BY ADMISSION YEAR
//    POST /results/sync-semesters
//    (Sirf un students ke liye jo results nahi have)
// =================================================================
exports.syncSemesters = async (req, res) => {
  try {
    const students = await User.find({ role: "student" });
    let updated = 0;

    for (const student of students) {
      if (student.results.length === 0 && student.admissionYear) {
        const calcSem = calcSemFromYear(student.admissionYear);
        if (student.semester !== calcSem) {
          student.semester = calcSem;
          await student.save();
          updated++;
        }
      }
    }

    res.json({
      success: true,
      message: `Synced ${updated} students based on admission year`,
      updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =================================================================
// 6. SUBJECT RANKING (Teacher dekhe)
//    GET /results/rank/:subjectId
// =================================================================
exports.getSubjectRanking = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const submissions = await Submission.find()
      .populate({ path: "assignmentId", match: { subjectId } })
      .populate("studentId", "name email");

    let studentMap = {};

    submissions.forEach((sub) => {
      if (!sub.assignmentId) return;
      const sid = sub.studentId._id;
      if (!studentMap[sid]) {
        studentMap[sid] = {
          name: sub.studentId.name,
          email: sub.studentId.email,
          totalMarks: 0,
        };
      }
      studentMap[sid].totalMarks += sub.marks || 0;
    });

    let ranking = Object.values(studentMap);
    ranking.sort((a, b) => b.totalMarks - a.totalMarks);
    ranking = ranking.map((student, index) => ({ rank: index + 1, ...student }));

    res.json({ success: true, ranking });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================================================
// 7. EXPORT RESULT PDF (Student)
//    GET /results/export-pdf
// =================================================================
exports.exportResultPDF = async (req, res) => {
  try {
    const studentId = req.user.id;

    const [student, submissions] = await Promise.all([
      User.findById(studentId).select("name email studentId semester department college admissionYear results"),
      Submission.find({ studentId }).populate({
        path: "assignmentId",
        populate: { path: "subjectId", model: "Subject" },
      }),
    ]);

    let subjectMap = {};
    submissions.forEach((sub) => {
      if (!sub.assignmentId || !sub.assignmentId.subjectId) return;
      const subjectName = sub.assignmentId.subjectId.name;
      if (!subjectMap[subjectName]) subjectMap[subjectName] = 0;
      subjectMap[subjectName] += sub.marks || 0;
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${student.name}-result.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(22).font("Helvetica-Bold").text("CollaHub — Student Result", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica").text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, { align: "center" });
    doc.moveDown();

    // Student Info
    doc.fontSize(13).font("Helvetica-Bold").text("Student Details");
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    doc.text(`Name: ${student.name}`);
    doc.text(`Student ID: ${student.studentId || "—"}`);
    doc.text(`Department: ${student.department || "—"}`);
    doc.text(`College: ${student.college || "—"}`);
    doc.text(`Current Semester: ${student.semester || "—"}`);
    doc.moveDown();

    // Assignment based results
    if (Object.keys(subjectMap).length > 0) {
      doc.fontSize(13).font("Helvetica-Bold").text("Assignment Results");
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(11).font("Helvetica");
      for (let subject in subjectMap) {
        doc.text(`${subject}: ${subjectMap[subject]} marks`);
      }
      doc.moveDown();
    }

    // Semester results
    if (student.results && student.results.length > 0) {
      doc.fontSize(13).font("Helvetica-Bold").text("Semester Results");
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(11).font("Helvetica");
      student.results.sort((a, b) => a.semester - b.semester).forEach((r) => {
        doc.font("Helvetica-Bold").text(`Semester ${r.semester} (${r.year || ""})`);
        doc.font("Helvetica");
        doc.text(`  SGPA: ${r.sgpa || "—"}  |  CGPA: ${r.cgpa || "—"}  |  Status: ${r.status?.toUpperCase()}`);
        if (r.subjects && r.subjects.length > 0) {
          r.subjects.forEach((s) => {
            doc.text(`  • ${s.name} (${s.code || ""}): ${s.marks}/${s.maxMarks} — ${s.grade} — ${s.status}`);
          });
        }
        doc.moveDown(0.5);
      });
    }

    doc.end();

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =================================================================
// 8. GENERATE CERTIFICATE (Student)
//    GET /results/certificate
// =================================================================
exports.generateCertificate = async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .select("name email studentId department college semester results");

    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    if (!student.results || student.results.length === 0)
      return res.status(404).json({ success: false, message: "No semester results found" });

    const passedSems  = student.results.filter(r => r.status === "pass");
    const latestResult = passedSems.sort((a, b) => b.semester - a.semester)[0];

    const doc = new PDFDocument({ margin: 60 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${student.name}-certificate.pdf`);
    doc.pipe(res);

    doc.fontSize(24).font("Helvetica-Bold").text("CollaHub", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(16).text("Certificate of Academic Performance", { align: "center" });
    doc.moveDown();
    doc.moveTo(60, doc.y).lineTo(540, doc.y).lineWidth(2).stroke();
    doc.moveDown();

    doc.fontSize(13).font("Helvetica")
      .text(`This is to certify that`, { align: "center" });
    doc.fontSize(18).font("Helvetica-Bold")
      .text(student.name, { align: "center" });
    doc.fontSize(13).font("Helvetica")
      .text(`Student ID: ${student.studentId || "—"}`, { align: "center" })
      .text(`Department: ${student.department || "—"}`, { align: "center" })
      .text(`College: ${student.college || "—"}`, { align: "center" });
    doc.moveDown();

    if (latestResult) {
      doc.text(`has successfully completed Semester ${latestResult.semester}`, { align: "center" });
      doc.text(`with SGPA: ${latestResult.sgpa || "—"} | CGPA: ${latestResult.cgpa || "—"}`, { align: "center" });
    }

    doc.moveDown();
    doc.fontSize(11).text(`Current Semester: ${student.semester}`, { align: "center" });
    doc.moveDown(2);
    doc.text(`Issued on: ${new Date().toLocaleDateString("en-IN")}`, { align: "center" });
    doc.end();

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};