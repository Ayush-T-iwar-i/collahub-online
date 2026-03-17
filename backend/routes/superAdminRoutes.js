// backend/routes/superAdminRoutes.js
const express = require("express");
const router  = express.Router();

const { verifyToken, isSuperAdmin } = require("../middleware/authMiddleware");
const {
  // ── Existing ──
  getSuperAdminStats,
  emergencyShutdown,
  restoreSystem,
  getAllUsers,
  createAdmin,
  deleteUser,
  sendBroadcast,
  getColleges,
  addCollege,
  updateCollege,
  deleteCollege,
  // ── New ──
  getAnnouncements,
  deleteAnnouncement,
  getAllPosts,
  deletePost,
  getAllSubjects,
  getAllResults,
  getAttendanceSummary,
} = require("../controllers/superAdminController");

// ── All routes need login + super-admin ──
router.use(verifyToken, isSuperAdmin);

// ── Dashboard ──
router.get("/stats",              getSuperAdminStats);

// ── Users ──
router.get("/users",              getAllUsers);          // ?role=student/teacher/admin&college=X&page=1
router.post("/create-admin",      createAdmin);
router.delete("/users/:id",       deleteUser);

// ── Colleges ──
router.get("/colleges",           getColleges);
router.post("/colleges",          addCollege);
router.put("/colleges/:name",     updateCollege);
router.delete("/colleges/:name",  deleteCollege);

// ── System ──
router.post("/shutdown",          emergencyShutdown);
router.post("/restore",           restoreSystem);
router.post("/broadcast",         sendBroadcast);

// ── Announcements ──
router.get("/announcements",         getAnnouncements);
router.delete("/announcements/:id",  deleteAnnouncement);

// ── Posts ──
router.get("/posts",              getAllPosts);          // ?college=X&page=1
router.delete("/posts/:id",       deletePost);

// ── Subjects ──
router.get("/subjects",           getAllSubjects);       // ?department=X

// ── Results ──
router.get("/results",            getAllResults);        // ?college=X

// ── Attendance ──
router.get("/attendance",         getAttendanceSummary); // ?college=X

module.exports = router;