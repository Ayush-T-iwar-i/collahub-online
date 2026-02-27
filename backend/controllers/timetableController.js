const Timetable = require("../models/Timetable");

// ================= ADD TIMETABLE =================
exports.addTimetable = async (req, res) => {
  try {
    const data = await Timetable.create(req.body);
    res.status(201).json({ success: true, timetable: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET ALL TIMETABLE =================
exports.getAllTimetable = async (req, res) => {
  try {
    const data = await Timetable.find()
      .populate("subjectId", "name")
      .populate("teacherId", "name");

    res.json({ success: true, timetable: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= DELETE TIMETABLE =================
exports.deleteTimetable = async (req, res) => {
  try {
    await Timetable.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Timetable deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};