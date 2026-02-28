require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// ===== ROUTES =====
const authRoutes = require("./routes/authRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const adminRoutes = require("./routes/adminRoutes");
const postRoutes = require("./routes/postRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const courseRoutes = require("./routes/courseRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const notesRoutes = require("./routes/notesRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const resultRoutes = require("./routes/resultRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const userRoutes = require("./routes/userRoutes");
const logger = require("./middleware/logger");
const studentTeacherRoutes = require("./routes/studentTeacherRoutes");
const errorHandler = require("./middleware/errorHandler");
const app = express();

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(cors());
app.use(logger);

// ===== DB =====
connectDB();

// ===== HEALTH CHECK =====
app.get("/", (req, res) => res.send("Backend is running 🚀"));

// ===== MOUNT ROUTES =====
app.use("/auth", authRoutes);
app.use("/teacher", teacherRoutes);
app.use("/admin", adminRoutes);
app.use("/api/posts", postRoutes);
app.use("/announcements", announcementRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/assignments", assignmentRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/courses", courseRoutes);
app.use("/leaves", leaveRoutes);
app.use("/notes", notesRoutes);
app.use("/notices", noticeRoutes);
app.use("/notifications", notificationRoutes);
app.use("/results", resultRoutes);
app.use("/subjects", subjectRoutes);
app.use("/submissions", submissionRoutes);
app.use("/timetable", timetableRoutes);
app.use("/user", userRoutes);
app.use("/", studentTeacherRoutes);

app.use(errorHandler);

// ===== SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});