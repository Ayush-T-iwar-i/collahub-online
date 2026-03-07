const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/timetableController");
const { protect } = require("../middleware/authMiddleware");

// Teacher routes
router.post(  "/save",              protect, ctrl.saveTeacherSchedule);
router.get(   "/my",                protect, ctrl.getMyTimetable);
router.get(   "/subject/:subjectId",protect, ctrl.getSubjectSchedule);
router.delete("/:id",               protect, ctrl.deleteSchedule);

// Student route
router.get("/for-student", protect, ctrl.getStudentTimetable);

module.exports = router;