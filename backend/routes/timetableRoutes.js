const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/timetableController");
const { verifyToken } = require("../middleware/authMiddleware");

// Teacher routes
router.post(  "/save",              verifyToken, ctrl.saveTeacherSchedule);
router.get(   "/my",                verifyToken, ctrl.getMyTimetable);
router.get(   "/subject/:subjectId",verifyToken, ctrl.getSubjectSchedule);
router.delete("/:id",               verifyToken, ctrl.deleteSchedule);

// Student route
router.get("/for-student", verifyToken, ctrl.getStudentTimetable);

module.exports = router;