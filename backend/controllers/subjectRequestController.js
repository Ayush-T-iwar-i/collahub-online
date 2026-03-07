const SubjectRequest = require("../models/SubjectRequest");
const User           = require("../models/User");

// ── Teacher: Send Request ──
exports.sendRequest = async (req, res) => {
  try {
    const { subjectName, subjectCode, college, department, semester, admissionYear } = req.body;

    if (!subjectName || !college || !department || !semester || !admissionYear) {
      return res.status(400).json({ success:false, message:"All fields required" });
    }

    const teacher = await User.findById(req.user.id);
    if (!teacher) return res.status(404).json({ success:false, message:"Teacher not found" });

    // Check duplicate — same teacher, same subject, same section, same semester, pending/accepted
    const existing = await SubjectRequest.findOne({
      teacherId:   req.user.id,
      subjectName: subjectName.trim(),
      department,
      semester:    Number(semester),
      admissionYear,
      status:      { $in: ["pending","accepted"] },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Request already ${existing.status} for this subject/section`,
      });
    }

    const request = await SubjectRequest.create({
      teacherId:   req.user.id,
      teacherName: teacher.name,
      subjectName: subjectName.trim(),
      subjectCode: subjectCode?.trim() || "",
      college,
      department,
      semester:    Number(semester),
      admissionYear,
    });

    res.status(201).json({ success:true, message:"Request sent to admin!", request });
  } catch (e) {
    console.log("SEND REQUEST ERROR:", e.message);
    res.status(500).json({ success:false, message:"Server error" });
  }
};

// ── Teacher: Get My Requests ──
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await SubjectRequest.find({ teacherId: req.user.id }).sort("-createdAt");
    res.json({ success:true, requests });
  } catch (e) {
    res.status(500).json({ success:false, message:"Server error" });
  }
};

// ── Teacher: Delete My Request (only if pending) ──
exports.deleteMyRequest = async (req, res) => {
  try {
    const req_ = await SubjectRequest.findOne({ _id:req.params.id, teacherId:req.user.id });
    if (!req_) return res.status(404).json({ success:false, message:"Request not found" });
    if (req_.status !== "pending") {
      return res.status(400).json({ success:false, message:"Cannot delete accepted/rejected request" });
    }
    await req_.deleteOne();
    res.json({ success:true, message:"Request deleted" });
  } catch (e) {
    res.status(500).json({ success:false, message:"Server error" });
  }
};

// ── Admin: Get All Requests ──
exports.getAllRequests = async (req, res) => {
  try {
    const { status } = req.query; // optional filter: pending/accepted/rejected
    const filter = status ? { status } : {};
    const requests = await SubjectRequest.find(filter).sort("-createdAt");
    res.json({ success:true, requests });
  } catch (e) {
    res.status(500).json({ success:false, message:"Server error" });
  }
};

// ── Admin: Accept Request ──
exports.acceptRequest = async (req, res) => {
  try {
    const request = await SubjectRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success:false, message:"Request not found" });

    request.status = "accepted";
    await request.save();

    res.json({ success:true, message:"Request accepted!", request });
  } catch (e) {
    res.status(500).json({ success:false, message:"Server error" });
  }
};

// ── Admin: Reject Request ──
exports.rejectRequest = async (req, res) => {
  try {
    const request = await SubjectRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success:false, message:"Request not found" });

    request.status    = "rejected";
    request.adminNote = req.body.note || "";
    await request.save();

    res.json({ success:true, message:"Request rejected", request });
  } catch (e) {
    res.status(500).json({ success:false, message:"Server error" });
  }
};

// ── Teacher: Get My Accepted Subjects (for attendance) ──
exports.getMySubjects = async (req, res) => {
  try {
    const subjects = await SubjectRequest.find({
      teacherId: req.user.id,
      status:    "accepted",
    }).sort("-createdAt");
    res.json({ success:true, subjects });
  } catch (e) {
    res.status(500).json({ success:false, message:"Server error" });
  }
};

// ── Teacher: Get Students for a Subject (attendance use) ──
exports.getStudentsForSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const subject = await SubjectRequest.findOne({
      _id:       subjectId,
      teacherId: req.user.id,
      status:    "accepted",
    });
    if (!subject) {
      return res.status(404).json({ success:false, message:"Subject not found or not accepted" });
    }

    // Find students matching: same college + dept + semester + admissionYear
    const students = await User.find({
      role:          "student",
      college:       subject.college,
      department:    subject.department,
      semester:      subject.semester,
      admissionYear: subject.admissionYear,
    }).select("name studentId email phone gender semester admissionYear department college profileImage");

    res.json({
      success: true,
      subject: {
        name:          subject.subjectName,
        code:          subject.subjectCode,
        department:    subject.department,
        semester:      subject.semester,
        admissionYear: subject.admissionYear,
        section:       `${subject.department.match(/\(([^)]+)\)/)?.[1] || subject.department.split(" ")[0]} ${subject.admissionYear}`,
      },
      students,
      total: students.length,
    });
  } catch (e) {
    res.status(500).json({ success:false, message:"Server error" });
  }
};