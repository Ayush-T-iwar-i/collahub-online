// controllers/noteController.js
const Note = require("../models/Note");
const User = require("../models/User");
const fs   = require("fs");
const path = require("path");

// ── Upload file to Cloudinary or local ──────────────────
const uploadFile = async (file) => {
  // Try Cloudinary
  if (process.env.CLOUD_NAME && process.env.CLOUD_API_KEY) {
    try {
      const cloudinary = require("cloudinary").v2;
      const mime       = file.mimetype || "";
      const resType    = mime.includes("image") ? "image" : "raw";
      const { Readable } = require("stream");
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "collahub/notes", resource_type: resType,
            public_id: `${Date.now()}_${(file.originalname||"note").replace(/\s+/g,"_")}` },
          (err, result) => { if (err) reject(err); else resolve(result.secure_url); }
        );
        const r = new Readable();
        r.push(file.buffer);
        r.push(null);
        r.pipe(stream);
      });
    } catch(e) {
      console.log("Cloudinary failed, using local:", e.message);
    }
  }

  // Local fallback
  const dir = path.join(__dirname, "../uploads/notes");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fname = `${Date.now()}_${(file.originalname||"note").replace(/\s+/g,"_")}`;
  fs.writeFileSync(path.join(dir, fname), file.buffer);
  const base = process.env.BASE_URL || `http://localhost:${process.env.PORT||5000}`;
  return `${base}/uploads/notes/${fname}`;
};

// ── Detect file type from mime ───────────────────────────
const getFileType = (mime = "") => {
  if (mime.includes("pdf"))                             return "pdf";
  if (mime.includes("presentation"))                    return "ppt";
  if (mime.includes("word") || mime.includes("document")) return "doc";
  if (mime.includes("image"))                           return "image";
  return "other";
};

// ══════════════════════════════════════════════════════════
// POST /teacher-notes/upload
// ══════════════════════════════════════════════════════════
exports.uploadNote = async (req, res) => {
  try {
    if (!req.file)    return res.status(400).json({ success: false, message: "No file uploaded" });

    const teacher = await User.findById(req.user.id).select("name college department");
    if (!teacher)  return res.status(404).json({ success: false, message: "Teacher not found" });

    const { subjectRequestId, subjectName, subjectCode,
            college, department, semester, admissionYear,
            section, title, description } = req.body;

    if (!title)       return res.status(400).json({ success: false, message: "title required" });
    if (!subjectName) return res.status(400).json({ success: false, message: "subjectName required" });

    const fileUrl  = await uploadFile(req.file);
    const fileType = getFileType(req.file.mimetype);

    const note = await Note.create({
      title:            title.trim(),
      description:      description?.trim() || "",
      teacherId:        req.user.id,
      teacherName:      teacher.name,
      subjectRequestId: subjectRequestId || null,
      subjectName:      subjectName.trim(),
      subjectCode:      subjectCode?.trim() || "",
      college:          college || teacher.college || "",
      department:       department || teacher.department,
      semester:         Number(semester) || 1,
      admissionYear:    admissionYear || "",
      section:          section || "All",
      fileUrl,
      fileType,
      fileName:         req.file.originalname || "file",
      mimeType:         req.file.mimetype || "",
    });

    res.status(201).json({ success: true, note });
  } catch (e) {
    console.error("uploadNote error:", e.message);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════════
// GET /teacher-notes/my?subjectName=X
// ══════════════════════════════════════════════════════════
exports.getMyNotes = async (req, res) => {
  try {
    const filter = { teacherId: req.user.id };
    if (req.query.subjectName) filter.subjectName = req.query.subjectName;
    const notes = await Note.find(filter).sort("-createdAt");
    res.json({ success: true, notes });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════════
// DELETE /teacher-notes/:id
// ══════════════════════════════════════════════════════════
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, teacherId: req.user.id });
    if (!note) return res.status(404).json({ success: false, message: "Not found" });
    await note.deleteOne();
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════════
// GET /teacher-notes/for-student?subjectName=X
// ══════════════════════════════════════════════════════════
exports.getNotesForStudent = async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .select("college department semester admissionYear section");
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const filter = {
      department: student.department,
      semester:   Number(student.semester),
      $or: [{ section: "All" }, { section: student.section || "A" }],
    };
    if (req.query.subjectName) filter.subjectName = req.query.subjectName;
    if (student.admissionYear) {
      filter.$and = [{
        $or: [{ admissionYear: "" }, { admissionYear: student.admissionYear }]
      }];
    }

    const notes = await Note.find(filter).sort("-createdAt")
      .select("title description teacherName subjectName subjectCode fileUrl fileType fileName createdAt");

    res.json({ success: true, notes, count: notes.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════════════
// GET /teacher-notes/by-subject?subjectName=X
// ══════════════════════════════════════════════════════════
exports.getNotesBySubject = async (req, res) => {
  try {
    const { subjectName, department, semester } = req.query;
    if (!subjectName) return res.status(400).json({ success: false, message: "subjectName required" });
    const filter = { subjectName };
    if (department) filter.department = department;
    if (semester)   filter.semester   = Number(semester);
    const notes = await Note.find(filter).sort("-createdAt");
    res.json({ success: true, notes });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};