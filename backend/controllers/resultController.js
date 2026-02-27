const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");
const Subject = require("../models/Subject");
const User = require("../models/User");
const PDFDocument = require("pdfkit");
const Result = require("../models/Result");

// ================= STUDENT RESULT =================
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

      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { totalMarks: 0, totalAssignments: 0 };
      }

      subjectMap[subjectName].totalMarks += sub.marks || 0;
      subjectMap[subjectName].totalAssignments += 1;
    });

    let result = [];
    let overallTotal = 0;
    let overallAssignments = 0;

    for (let subject in subjectMap) {
      const data = subjectMap[subject];
      const average = data.totalAssignments === 0
        ? 0
        : (data.totalMarks / data.totalAssignments).toFixed(2);

      result.push({ subject, totalMarks: data.totalMarks, average });
      overallTotal += data.totalMarks;
      overallAssignments += data.totalAssignments;
    }

    const overallPercentage = overallAssignments === 0
      ? 0
      : (overallTotal / overallAssignments).toFixed(2);

    res.json({
      success: true,
      subjects: result,
      overallTotal,
      overallPercentage,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= ADD RESULT =================
exports.addResult = async (req, res) => {
  try {
    const { studentId, subjectId, marksObtained, totalMarks } = req.body;

    const percentage = ((marksObtained / totalMarks) * 100).toFixed(2);

    let grade = "F";
    if (percentage >= 90) grade = "A+";
    else if (percentage >= 80) grade = "A";
    else if (percentage >= 70) grade = "B";
    else if (percentage >= 60) grade = "C";
    else if (percentage >= 50) grade = "D";

    const result = await Result.create({
      studentId,
      subjectId,
      marksObtained,
      totalMarks,
      percentage,
      grade,
    });

    res.status(201).json({ success: true, result });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= SUBJECT RANKING =================
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

// ================= EXPORT RESULT PDF =================
exports.exportResultPDF = async (req, res) => {
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
      if (!subjectMap[subjectName]) subjectMap[subjectName] = 0;
      subjectMap[subjectName] += sub.marks || 0;
    });

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=result.pdf");
    doc.pipe(res);

    doc.fontSize(20).text("Student Result", { align: "center" });
    doc.moveDown();

    for (let subject in subjectMap) {
      doc.fontSize(14).text(`${subject}: ${subjectMap[subject]} Marks`);
    }

    doc.end();

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GENERATE CERTIFICATE =================
exports.generateCertificate = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    const results = await Result.find({ studentId: student._id });
    if (!results.length)
      return res.status(404).json({ success: false, message: "No results found" });

    // ✅ Fixed: marksObtained (not r.marks)
    const totalMarks = results.reduce((sum, r) => sum + r.marksObtained, 0);
    const average = (totalMarks / results.length).toFixed(2);

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${student.name}-certificate.pdf`);
    doc.pipe(res);

    doc.fontSize(22).text("College Result Certificate", { align: "center" });
    doc.moveDown();
    doc.fontSize(16).text(`Name: ${student.name}`);
    doc.text(`Email: ${student.email}`);
    doc.moveDown();

    // ✅ Fixed: marksObtained (not r.marks), subjectId (not subjectName)
    results.forEach((r) => {
      doc.text(`Subject ID: ${r.subjectId} - Marks: ${r.marksObtained}/${r.totalMarks} (${r.grade})`);
    });

    doc.moveDown();
    doc.text(`Average Marks: ${average}`);
    doc.end();

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};