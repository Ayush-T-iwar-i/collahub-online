const User    = require("../models/User");
const bcrypt  = require("bcryptjs");

// Helper — safe model import
const safeCount = async (modelPath) => {
  try { return await require(modelPath).countDocuments(); } catch { return 0; }
};

// ══════════════════════════════════════════════════
// GET STATS  —  GET /super-admin/stats
// ══════════════════════════════════════════════════
exports.getSuperAdminStats = async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalAdmins] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      User.countDocuments({ role: "admin"   }),
    ]);

    const colleges      = await User.distinct("college");
    const totalColleges = colleges.length;

    const [totalSubjects, totalPosts, totalResults, totalAssignments] = await Promise.all([
      safeCount("../models/Subject"),
      safeCount("../models/Post"),
      safeCount("../models/Result"),
      safeCount("../models/Assignment"),
    ]);

    res.json({
      success: true,
      totalStudents, totalTeachers, totalAdmins,
      totalColleges, totalSubjects,
      totalPosts, totalResults, totalAssignments,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// EMERGENCY SHUTDOWN  —  POST /super-admin/shutdown
// Clears all refresh tokens → forces every user to logout
// ══════════════════════════════════════════════════
exports.emergencyShutdown = async (req, res) => {
  try {
    // Clear every user's refresh token — they all get kicked out
    await User.updateMany({}, { $set: { refreshToken: null } });

    // Set global flag so middleware can block new logins if needed
    global.systemShutdown   = true;
    global.shutdownMessage  = req.body.message || "System under maintenance. Please try again later.";
    global.shutdownAt       = new Date();
    global.shutdownBy       = req.user?.id;

    console.log(`\n🚨  EMERGENCY SHUTDOWN by ${req.user?.id} at ${global.shutdownAt}\n`);

    res.json({
      success: true,
      message: "Shutdown complete. All users logged out.",
      shutdownAt: global.shutdownAt,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// RESTORE SYSTEM  —  POST /super-admin/restore
// ══════════════════════════════════════════════════
exports.restoreSystem = async (req, res) => {
  try {
    global.systemShutdown  = false;
    global.shutdownMessage = null;
    console.log(`\n✅  System restored by ${req.user?.id}\n`);
    res.json({ success: true, message: "System restored. Users can now login." });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// GET ALL USERS  —  GET /super-admin/users
// Query params: role, college, page, limit
// ══════════════════════════════════════════════════
exports.getAllUsers = async (req, res) => {
  try {
    const { role, college, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role    && role    !== "all") filter.role    = role;
    if (college && college !== "all") filter.college = college;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -refreshToken")
        .sort("-createdAt")
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit)),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, users, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// CREATE ADMIN  —  POST /super-admin/create-admin
// ══════════════════════════════════════════════════
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, college, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const hash  = await bcrypt.hash(password, 10);
    const admin = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hash,
      role: "admin",
      college: college?.trim(),
      phone,
    });

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: { id: admin._id, name: admin.name, email: admin.email, college: admin.college },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// DELETE ANY USER  —  DELETE /super-admin/users/:id
// ══════════════════════════════════════════════════
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: `${user.role} account deleted successfully` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// GLOBAL BROADCAST  —  POST /super-admin/broadcast
// Sends notification to all users
// ══════════════════════════════════════════════════
exports.sendBroadcast = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    // Create notification for every user in DB
    const Notification = require("../models/Notification");
    const allUsers = await User.find({}).select("_id");

    const notifications = allUsers.map(u => ({
      userId:  u._id,
      title:   "System Announcement",
      message: message.trim(),
      type:    "broadcast",
    }));

    await Notification.insertMany(notifications);

    res.json({
      success: true,
      message: `Broadcast sent to ${allUsers.length} users`,
      count:   allUsers.length,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// GET ALL COLLEGES  —  GET /super-admin/colleges
// ══════════════════════════════════════════════════
exports.getColleges = async (req, res) => {
  try {
    const College = require("../models/College");

    // College model se saari colleges lo
    const allColleges = await College.find().sort({ createdAt: -1 }).lean();

    // Har college ke liye students/teachers/admins count karo
    const collegeData = await Promise.all(
      allColleges.map(async (c) => {
        const [students, teachers, admins] = await Promise.all([
          User.countDocuments({ college: c.name, role: "student" }),
          User.countDocuments({ college: c.name, role: "teacher" }),
          User.countDocuments({ college: c.name, role: "admin"   }),
        ]);
        return {
          _id:       c._id,
          name:      c.name,
          shortName: c.shortName,
          type:      c.type,
          address:   c.address,
          phone:     c.phone,
          email:     c.email,
          website:   c.website,
          students,
          teachers,
          admins,
          total: students + teachers + admins,
        };
      })
    );

    res.json({ success: true, colleges: collegeData });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// ADD COLLEGE  —  POST /super-admin/colleges
// ══════════════════════════════════════════════════
exports.addCollege = async (req, res) => {
  try {
    const College = require("../models/College");
    const { name, shortName, type, address, phone, email, website } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "College name is required" });
    }

    // Duplicate check
    const dup = await College.findOne({ name: name.trim() });
    if (dup) {
      return res.status(400).json({ success: false, message: "This college already exists" });
    }

    const college = await College.create({
      name:      name.trim(),
      shortName: shortName?.trim() || "",
      type:      type || "Engineering",
      address:   address?.trim() || "",
      phone:     phone?.trim() || "",
      email:     email?.trim() || "",
      website:   website?.trim() || "",
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, message: "College added successfully!", college });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// UPDATE COLLEGE  —  PUT /super-admin/colleges/:name
// ══════════════════════════════════════════════════
exports.updateCollege = async (req, res) => {
  try {
    const College = require("../models/College");
    const oldName = decodeURIComponent(req.params.name);
    const { name, shortName, type, address, phone, email, website } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "College name is required" });
    }

    // College model mein update karo
    const updated = await College.findOneAndUpdate(
      { name: oldName },
      { $set: { name: name.trim(), shortName, type, address, phone, email, website } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "College not found" });
    }

    // Agar naam badla to saare users ka college field bhi update karo
    if (oldName !== name.trim()) {
      await User.updateMany(
        { college: oldName },
        { $set: { college: name.trim() } }
      );
    }

    res.json({ success: true, message: "College updated successfully!", college: updated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// DELETE COLLEGE  —  DELETE /super-admin/colleges/:name
// ══════════════════════════════════════════════════
exports.deleteCollege = async (req, res) => {
  try {
    const College = require("../models/College");
    const collegeName = decodeURIComponent(req.params.name);

    const [students, teachers, admins] = await Promise.all([
      User.countDocuments({ college: collegeName, role: "student" }),
      User.countDocuments({ college: collegeName, role: "teacher" }),
      User.countDocuments({ college: collegeName, role: "admin"   }),
    ]);

    const total = students + teachers + admins;
    if (total > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete — ${total} users still linked (${students} students, ${teachers} teachers, ${admins} admins). Remove all users first.`,
      });
    }

    await College.findOneAndDelete({ name: collegeName });

    res.json({ success: true, message: `"${collegeName}" deleted successfully.` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// GET ANNOUNCEMENTS  —  GET /super-admin/announcements
// ══════════════════════════════════════════════════
exports.getAnnouncements = async (req, res) => {
  try {
    let Notification;
    try { Notification = require("../models/Notification"); } catch {
      return res.json({ success: true, announcements: [] });
    }
    const { page = 1, limit = 20 } = req.query;
    const [announcements, total] = await Promise.all([
      Notification.find({ type: { $in: ["broadcast", "announcement"] } })
        .sort("-createdAt")
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .lean(),
      Notification.countDocuments({ type: { $in: ["broadcast", "announcement"] } }),
    ]);
    // Deduplicate — ek hi broadcast ke kai records hote hain, ek dikhao
    const seen = new Set();
    const unique = announcements.filter(a => {
      const key = a.message + a.createdAt?.toString().slice(0, 16);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    res.json({ success: true, announcements: unique, total });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// DELETE ANNOUNCEMENT  —  DELETE /super-admin/announcements/:id
// ══════════════════════════════════════════════════
exports.deleteAnnouncement = async (req, res) => {
  try {
    let Notification;
    try { Notification = require("../models/Notification"); } catch {
      return res.status(404).json({ success: false, message: "Notification model not found" });
    }
    // Delete all with same message (broadcast ke saare copies)
    const target = await Notification.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: "Not found" });
    await Notification.deleteMany({ message: target.message, type: target.type });
    res.json({ success: true, message: "Announcement deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// GET ALL POSTS  —  GET /super-admin/posts
// ══════════════════════════════════════════════════
exports.getAllPosts = async (req, res) => {
  try {
    let Post;
    try { Post = require("../models/Post"); } catch {
      return res.json({ success: true, posts: [], total: 0 });
    }
    const { college, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (college && college !== "all") filter.college = college;
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort("-createdAt")
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .populate("author", "name role")
        .lean(),
      Post.countDocuments(filter),
    ]);
    res.json({ success: true, posts, total });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// DELETE POST  —  DELETE /super-admin/posts/:id
// ══════════════════════════════════════════════════
exports.deletePost = async (req, res) => {
  try {
    let Post;
    try { Post = require("../models/Post"); } catch {
      return res.status(404).json({ success: false, message: "Post model not found" });
    }
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });
    res.json({ success: true, message: "Post deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// GET ALL SUBJECTS  —  GET /super-admin/subjects
// ══════════════════════════════════════════════════
exports.getAllSubjects = async (req, res) => {
  try {
    let Subject;
    try { Subject = require("../models/Subject"); } catch {
      return res.json({ success: true, subjects: [], total: 0 });
    }
    const { college, department, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (department) filter.department = department;
    // college filter via teachers
    const [subjects, total] = await Promise.all([
      Subject.find(filter)
        .sort("name")
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .lean(),
      Subject.countDocuments(filter),
    ]);
    res.json({ success: true, subjects, total });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// GET ALL RESULTS  —  GET /super-admin/results
// ══════════════════════════════════════════════════
exports.getAllResults = async (req, res) => {
  try {
    let Result;
    try { Result = require("../models/Result"); } catch {
      return res.json({ success: true, results: [], total: 0 });
    }
    const { college, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (college && college !== "all") filter.college = college;
    const [results, total] = await Promise.all([
      Result.find(filter)
        .sort("-createdAt")
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .populate("student", "name studentId")
        .lean(),
      Result.countDocuments(filter),
    ]);
    res.json({ success: true, results, total });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// GET ATTENDANCE SUMMARY  —  GET /super-admin/attendance
// ══════════════════════════════════════════════════
exports.getAttendanceSummary = async (req, res) => {
  try {
    let Attendance;
    try { Attendance = require("../models/Attendance"); } catch {
      return res.json({ success: true, summary: [] });
    }
    const { college } = req.query;

    // Group attendance by subject
    const matchStage = {};
    if (college && college !== "all") matchStage.college = college;

    const summary = await Attendance.aggregate([
      { $match: matchStage },
      { $group: {
          _id: { subject: "$subject", subjectName: "$subjectName" },
          total:   { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        }
      },
      { $project: {
          subject:     "$_id.subjectName",
          subjectName: "$_id.subjectName",
          total:       1,
          present:     1,
          percentage: {
            $round: [{ $multiply: [{ $divide: ["$present", "$total"] }, 100] }, 0]
          }
        }
      },
      { $sort: { percentage: 1 } },
    ]);

    res.json({ success: true, summary });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ══════════════════════════════════════════════════
// HEALTH CHECK  —  GET /health
// (server.js mein add karna hoga — super-admin se bahar)
// ══════════════════════════════════════════════════
exports.healthCheck = async (req, res) => {
  res.json({
    success: true,
    status: "online",
    uptime: process.uptime(),
    timestamp: new Date(),
    message: "Backend server is running fine!",
  });
};