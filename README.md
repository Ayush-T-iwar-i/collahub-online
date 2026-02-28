                            #############COLLAहUB####################
# 🎓 CollaHub, COLLAहUB — College Management & Attendance App

<div align="center">

![CollaHub](https://img.shields.io/badge/CollaHub-College%20Management-6366f1?style=for-the-badge)
![React Native](https://img.shields.io/badge/React_Native-Expo-0ea5e9?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-22c55e?style=flat-square&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-4ade80?style=flat-square&logo=mongodb)
![JWT](https://img.shields.io/badge/Auth-JWT-f59e0b?style=flat-square)

**A full-stack mobile application for managing college attendance, results, assignments, timetable, and notices — across three roles: Student, Teacher, and Admin.**

</div>

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Features by Role](#-features-by-role)
3. [Tech Stack](#-tech-stack)
4. [Project Structure](#-project-structure)
5. [User Roles & Flows](#-user-roles--flows)
6. [Authentication System](#-authentication-system)
7. [Result & Semester System](#-result--semester-system)
8. [Navigation Architecture](#-navigation-architecture)
9. [UI Design System](#-ui-design-system)
10. [API Reference](#-api-reference)
11. [Database Models](#-database-models)
12. [Environment Variables](#-environment-variables)
13. [Getting Started](#-getting-started)
14. [Dependencies](#-dependencies)
15. [Bug Fixes Log](#-bug-fixes-log)
16. [Roadmap](#-roadmap)

---

## 🌟 Project Overview

**COLLAहUB** is a comprehensive college management system that digitizes the entire academic workflow of an institution. It supports three distinct user roles — Student, Teacher, and Admin — each with their own dedicated interface, navigation, and features.

The application is built with a **dark-themed glassmorphism UI**, role-specific color schemes, smooth animations, and a clean component architecture.

### What problem does it solve?
- Manual attendance registers → **Digital attendance marking**
- Paper result sheets → **Online result upload with auto-semester promotion**
- Notice boards → **Digital announcement system**
- Manual timetables → **Dynamic timetable management**
- Spreadsheet-based student data → **Searchable, filterable student management**

---

## ✨ Features by Role

### 🧑‍🎓 Student
| Feature | Details |
|---------|---------|
| Email OTP Registration | Secure 3-step signup: Email → OTP → Fill Details |
| Attendance Tracking | Subject-wise percentage with progress bars |
| Timetable View | Day-wise class schedule |
| Assignment Submission | Submit and track assignment status |
| Result View | Assignment marks + Semester-wise SGPA/CGPA |
| PDF Download | Downloadable result report and certificate |
| Digital ID Card | Profile screen with college ID card view |
| Notice Board | View college-wide announcements |
| Forgot Password | 3-step OTP-based password reset |

### 👨‍🏫 Teacher
| Feature | Details |
|---------|---------|
| Email OTP Registration | Secure signup with email verification |
| Mark Attendance | Today's schedule → Select class → Mark students |
| View Students | Department and semester filtered student list |
| Create Assignments | Assign tasks with due dates and marks |
| Subject Ranking | View top performers per subject |
| Notice Board | View college announcements |
| Forgot Password | 3-step OTP password reset |

### 🛡️ Admin
| Feature | Details |
|---------|---------|
| Secret Key Registration | Protected admin registration |
| Dashboard | Institution-wide stats — students, teachers, subjects |
| Manage Students | College → Department → Student drill-down (Full CRUD) |
| Manage Teachers | Add, edit, delete teacher accounts |
| Manage Subjects | Subject CRUD with department and semester mapping |
| Manage Timetable | Day-wise class schedule management |
| View Attendance | All attendance records with percentage statistics |
| Post Notices | Categorized announcements (General, Academic, Event, Exam, Alert) |
| Upload Results | Semester result upload with auto-semester promotion |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Mobile Frontend** | React Native + Expo SDK 51 | Cross-platform iOS & Android app |
| **Navigation** | Expo Router v3 (file-based) | Screen routing and layouts |
| **Backend** | Node.js + Express.js | RESTful API server |
| **Database** | MongoDB + Mongoose ODM | Document-based data storage |
| **Authentication** | JWT (Access Token + Refresh Token) | Stateless secure auth |
| **Email Service** | Nodemailer + Gmail SMTP | OTP delivery |
| **File Storage** | Cloudinary + Multer | Profile image upload |
| **PDF Generation** | PDFKit | Result PDFs and certificates |
| **Animations** | React Native Reanimated v3 | Smooth UI transitions |
| **UI Libraries** | Expo Linear Gradient, Expo Blur, Ionicons | Visual components |
| **Local Storage** | AsyncStorage | Token and session storage |

---

## 📁 Project Structure

```
collageAtt/
│
├── README.md
│
├── mobileApp/                          # React Native Frontend (Expo)
│   ├── app/
│   │   ├── index.js                    # Landing page — role selection
│   │   ├── verify-otp.js               # OTP verification screen
│   │   │
│   │   ├── (auth)/                     # Grouped auth screens
│   │   │   ├── _layout.js              # Auth layout (stack)
│   │   │   ├── student-login.js        # Student login — cyan theme
│   │   │   └── teacher-login.js        # Teacher login — amber theme
│   │   │
│   │   ├── student/                    # All student screens
│   │   │   ├── _layout.js              # Drawer navigator
│   │   │   ├── dashboard.js            # Home: stats + notices + timetable
│   │   │   ├── register.js             # 3-step registration flow
│   │   │   ├── forgot.js               # Forgot password (3 steps)
│   │   │   ├── profile.js              # Profile + Digital ID card
│   │   │   ├── timetable.js            # Weekly class schedule
│   │   │   ├── notes.js                # Study notes
│   │   │   └── attendance/
│   │   │       └── [subject].js        # Subject-wise attendance detail
│   │   │
│   │   ├── teacher/                    # All teacher screens
│   │   │   ├── _layout.js              # Drawer navigator
│   │   │   ├── dashboard.js            # Home: classes + student count
│   │   │   ├── register.js             # Teacher registration
│   │   │   ├── forgot.js               # Forgot password
│   │   │   ├── profile.js              # Teacher profile
│   │   │   ├── mark-attendance.js      # Select class → mark attendance
│   │   │   └── students.js             # Student list with filters
│   │   │
│   │   └── admin/                      # All admin screens
│   │       ├── _layout.js              # Stack navigator
│   │       ├── login.js                # Admin login — purple theme
│   │       ├── register.js             # Admin register (secret key)
│   │       ├── forgot.js               # Forgot password
│   │       ├── dashboard.js            # Stats + management cards
│   │       ├── manage-students.js      # Drill-down: College→Dept→Students
│   │       ├── manage-teachers.js      # Teacher CRUD
│   │       ├── manage-subjects.js      # Subject CRUD
│   │       ├── manage-timetable.js     # Timetable CRUD + day filter
│   │       ├── view-attendance.js      # All records + stats
│   │       └── post-notice.js          # Post and manage notices
│   │
│   ├── services/
│   │   └── api.js                      # Axios instance with auto token refresh
│   │
│   ├── components/
│   │   ├── CustomDrawer.js             # Student custom drawer UI
│   │   └── TeacherDrawer.js            # Teacher custom drawer UI
│   │
│   └── assets/                         # Images, icons, splash
│
└── backend/                            # Node.js + Express Backend
    ├── server.js                       # Entry point + route mounting
    ├── .env                            # Environment variables
    │
    ├── models/
    │   ├── User.js                     # Unified model: student + teacher + admin
    │   ├── Subject.js                  # Academic subject
    │   ├── Assignment.js               # Assignment created by teacher
    │   ├── Submission.js               # Student's assignment submission
    │   ├── Timetable.js                # Class schedule entry
    │   └── Result.js                   # Legacy result model
    │
    ├── controllers/
    │   ├── authController.js           # Register, Login, OTP, Token refresh
    │   ├── userController.js           # Profile CRUD, Students/Teachers list
    │   ├── adminController.js          # Admin auth + Add student/teacher
    │   ├── resultController.js         # Results, PDF, Certificate, Semester auto-update
    │   ├── attendanceController.js     # Mark and fetch attendance records
    │   ├── assignmentController.js     # Assignment CRUD + submissions
    │   ├── timetableController.js      # Timetable CRUD
    │   ├── subjectController.js        # Subject CRUD
    │   ├── noticeController.js         # Notice board CRUD
    │   └── dashboardController.js      # Dashboard statistics
    │
    ├── routes/
    │   ├── authRoutes.js
    │   ├── adminRoutes.js
    │   ├── studentTeacherRoutes.js
    │   ├── resultRoutes.js
    │   ├── subjectRoutes.js
    │   ├── timetableRoutes.js
    │   ├── noticeRoutes.js
    │   └── assignmentRoutes.js
    │
    └── middleware/
        ├── authMiddleware.js           # verifyToken, isStudent, isTeacher guards
        └── uploadMiddleware.js         # Multer configuration for file uploads
```

---

## 👥 User Roles & Flows

### Student Journey
```
Landing Page
    └─► Register (3 steps)
            Step 1: Enter email → Receive OTP
            Step 2: Verify 6-digit OTP (5 min timer)
            Step 3: Fill name, phone, studentId, college,
                    department, semester, gender, password
                    └─► Account created ✅
    └─► Login → Student Dashboard (Drawer Navigation)
            ├── Home        → Attendance summary + Today's classes + Notices
            ├── Attendance  → Subject-wise cards with progress bars
            ├── Timetable   → Weekly schedule grid
            ├── Notes       → Study material
            ├── Results     → Marks + Semester results + Download
            └── Profile     → Personal info + Digital ID card
```

### Teacher Journey
```
Landing Page
    └─► Register (same 3-step OTP flow)
    └─► Login → Teacher Dashboard (Drawer Navigation)
            ├── Home              → Today's classes + Student count
            ├── Mark Attendance   → Today's schedule → Select class
            │                       → Student list → Mark Present/Absent
            │                       → Submit attendance
            ├── Students          → Department + Semester filter
            └── Profile           → Personal info + Logout
```

### Admin Journey
```
Landing Page
    └─► Admin Login (purple theme, shield icon)
            ↓
        Admin Dashboard
            ├── Manage Students   → College cards → Department cards → Student list
            │                        (Add / Edit / Delete)
            ├── Manage Teachers   → Teacher list (Add / Edit / Delete)
            ├── Manage Subjects   → Subject list (Add / Edit / Delete)
            ├── Manage Timetable  → Day filter → Entry list (Add / Edit / Delete)
            ├── View Attendance   → All records + Stats (≥75%, <50%, Avg%)
            └── Post Notice       → Category + Title + Content → Post
```

---

## 🔐 Authentication System

### Token Strategy
```
Login Response:
{
  accessToken:  JWT (expires in 15 minutes)
  refreshToken: JWT (expires in 7 days)
  user:         { id, name, email, role }
}

Storage: AsyncStorage
  - @access_token
  - @refresh_token
  - studentData / teacherData / adminData (user info)
```

### Auto Token Refresh
```
Request with expired accessToken
    ↓
API returns 401 Unauthorized
    ↓
Axios interceptor catches it
    ↓
POST /auth/refresh-token with refreshToken
    ↓
New accessToken received
    ↓
Original request retried automatically ✅
    ↓
If refreshToken also expired → Clear storage → Redirect to Login
```

### Registration Flow
```
Step 1  →  POST /auth/send-email-otp     (email entered)
Step 2  →  POST /auth/verify-email-otp   (OTP verified)
Step 3  →  POST /auth/register           (details submitted)
```

### Forgot Password Flow
```
Step 1  →  POST /auth/forgot-password    (send OTP to email)
Step 2  →  OTP verified (5-minute timer + resend option)
Step 3  →  POST /auth/reset-password     (new password set)
```

---

## 📊 Result & Semester System

### Type 1 — Assignment-Based Results (Automatic)
```
Teacher creates Assignment
    ↓
Student submits → Teacher grades it (Submission.marks)
    ↓
Student sees:
  - Subject-wise total marks and average
  - Exportable as PDF
```

### Type 2 — Semester Results (Admin uploaded)
```
Admin uploads result for a student's semester:
  Fields: semester, year, SGPA, CGPA, status, subjects[]

  If status = "pass"  →  student.semester += 1  (promoted)  ✅
  If status = "fail"  →  student.semester stays  (held back) ❌

Result is saved in student.results[] array (history maintained)
```

### Auto-Sync by Admission Year
For students who have no uploaded results yet, the system can calculate their current semester from their admission year:

```
Formula:
  yearsCompleted = currentYear - admissionYear
  if (currentMonth < July) yearsCompleted -= 1
  semester = (yearsCompleted × 2) + 1
  semester = clamp between 1 and 8

Example:
  Admission Year : 2023
  Current Date   : September 2025
  Years Completed: 2
  Semester       : (2 × 2) + 1 = 5
```

Trigger sync: `POST /results/sync-semesters` (Admin only)

---

## 🗺️ Navigation Architecture

```
app/ (Expo Router file-based routing)
│
├── index.js                    ← Landing page (entry point)
│
├── (auth)/                     ← Auth group (Stack layout)
│   ├── student-login.js
│   └── teacher-login.js
│
├── student/                    ← Student group (Drawer layout)
│   ├── _layout.js
│   ├── dashboard.js            ← Default screen
│   ├── register.js
│   ├── forgot.js
│   ├── profile.js
│   ├── timetable.js
│   ├── notes.js
│   └── attendance/[subject].js ← Dynamic route
│
├── teacher/                    ← Teacher group (Drawer layout)
│   ├── _layout.js
│   ├── dashboard.js            ← Default screen
│   ├── register.js
│   ├── forgot.js
│   ├── profile.js
│   ├── mark-attendance.js
│   └── students.js
│
└── admin/                      ← Admin group (Stack layout)
    ├── _layout.js
    ├── login.js                ← Default screen
    ├── register.js
    ├── forgot.js
    ├── dashboard.js
    ├── manage-students.js
    ├── manage-teachers.js
    ├── manage-subjects.js
    ├── manage-timetable.js
    ├── view-attendance.js
    └── post-notice.js
```

### Back Navigation Rules
| Screen | Back Goes To |
|--------|-------------|
| Student/Teacher Login | Landing page (`router.replace("/")`) |
| Student/Teacher Register | Login screen |
| Admin screens | Admin Dashboard |
| Dashboard | Double back press = Exit app |

---

## 🎨 UI Design System

### Color Palette by Role
| Role | Primary Color | Secondary | Background | Card |
|------|-------------|-----------|------------|------|
| Student | `#00c6ff` Cyan | `#0072ff` Blue | `#080d17` | `#1a2535` |
| Teacher | `#f59e0b` Amber | `#d97706` Gold | `#080d17` | `#1a2535` |
| Admin | `#a78bfa` Purple | `#7c3aed` Violet | `#080d17` | `#1a2535` |

### Semantic Colors
```
Success   →  #34d399  (green)
Warning   →  #f59e0b  (amber)
Danger    →  #f87171  (red)
Info      →  #60a5fa  (blue)
Muted     →  #64748b  (slate)
Disabled  →  #374151  (dark gray)
```

### UI Patterns
- **Glassmorphism Cards** — semi-transparent with subtle borders
- **Linear Gradient** — backgrounds and CTA buttons
- **Bottom Sheet Modals** — forms, pickers, and confirmations
- **Progress Bars** — attendance percentage visualization
- **Step Bar** — multi-step registration flow indicator
- **Drill-Down Navigation** — College → Department → Students
- **Color-Coded Departments** — visual grouping for academic units
- **Breadcrumb Trail** — shows current location in drill-down

---

## 🔌 API Reference

### Authentication  `/auth`
```http
POST   /auth/register              Register a new user
POST   /auth/login                 Login (any role)
POST   /auth/logout                Logout (clear refresh token)
POST   /auth/send-email-otp        Send OTP to email
POST   /auth/verify-email-otp      Verify the OTP
POST   /auth/forgot-password       Send password reset OTP
POST   /auth/reset-password        Set new password
POST   /auth/refresh-token         Exchange refresh token for new access token
```

### Admin  `/admin`
```http
POST   /admin/register             Register admin (requires secret key)
POST   /admin/login                Admin login
POST   /admin/add-student          Manually add a student
POST   /admin/add-teacher          Manually add a teacher
```

### Students & Teachers
```http
GET    /students/all               List all students
PUT    /students/:id               Update student data
DELETE /students/:id               Delete a student

GET    /teachers/all               List all teachers
PUT    /teachers/:id               Update teacher data
DELETE /teachers/:id               Delete a teacher
```

### User Profile
```http
GET    /user/profile               Get authenticated user's profile
PUT    /user/profile               Update name or password
POST   /user/upload-image          Upload profile picture (multipart)
```

### Results
```http
GET    /results/my                 Student: get own results (assignment + semester)
POST   /results/upload             Admin: upload semester result
GET    /results/student/:id        Admin: get any student's full result
DELETE /results/:studentId/:sem    Admin: delete a semester result
POST   /results/sync-semesters     Admin: auto-sync semesters by admission year
GET    /results/rank/:subjectId    Teacher: subject-wise student ranking
GET    /results/export-pdf         Student: download result as PDF
GET    /results/certificate        Student: download academic certificate
```

### Subjects
```http
GET    /subjects/all               List all subjects
POST   /subjects/create            Create a new subject
PUT    /subjects/:id               Update subject
DELETE /subjects/:id               Delete subject
```

### Timetable
```http
GET    /timetable/all              Admin: all timetable entries
GET    /timetable/teacher          Teacher: own schedule
POST   /timetable/create           Admin: create entry
PUT    /timetable/:id              Admin: update entry
DELETE /timetable/:id              Admin: delete entry
```

### Attendance
```http
POST   /attendance/mark            Teacher: mark attendance for a class
GET    /attendance/all             Admin: all attendance records
GET    /attendance/student         Student: own attendance summary
GET    /attendance/by-subject/:id  Teacher: students enrolled in a subject
```

### Notices
```http
GET    /api/posts                  List all notices
POST   /api/posts                  Admin: post a notice
DELETE /api/posts/:id              Admin: delete a notice
```

### Dashboard
```http
GET    /dashboard/admin            Admin stats (totals, recent activity)
GET    /dashboard/teacher          Teacher stats (today's classes, students)
```

---

## 🗄️ Database Models

### User.js — Unified Model
```javascript
{
  // Common fields
  name:           String,
  email:          { type: String, unique: true },
  password:       String,           // bcrypt hashed
  phone:          String,
  role:           "student" | "teacher" | "admin",
  profileImage:   String,           // Cloudinary URL
  refreshToken:   String,
  otp:            String,
  otpExpire:      Date,
  isEmailVerified: Boolean,

  // Student-specific
  studentId:      String,
  department:     String,
  gender:         String,
  admissionYear:  String,
  college:        String,
  semester:       Number,           // Current semester (1–8)
  isPromoted:     Boolean,          // Whether last result was pass
  results: [{                       // Semester result history
    semester:     Number,
    year:         Number,
    sgpa:         Number,
    cgpa:         Number,
    status:       "pass" | "fail" | "pending",
    subjects: [{
      name, code, marks, maxMarks, grade, status
    }],
    uploadedAt:   Date,
    uploadedBy:   String,
  }],

  // Teacher-specific
  teacherId:      String,
  university:     String,
  age:            Number,
}
```

### Subject.js
```javascript
{
  name:        String,    // "Data Structures"
  code:        String,    // "CS301"
  department:  String,
  semester:    Number,
  credits:     Number,
  description: String,
}
```

### Timetable.js
```javascript
{
  day:        String,     // "Monday"
  subjectId:  ObjectId → Subject,
  teacherId:  ObjectId → User,
  startTime:  String,     // "09:00 AM"
  endTime:    String,     // "10:00 AM"
  room:       String,     // "Room 101"
  semester:   Number,
  department: String,
}
```

### Assignment.js
```javascript
{
  title:       String,
  description: String,
  subjectId:   ObjectId → Subject,
  teacherId:   ObjectId → User,
  dueDate:     Date,
  totalMarks:  Number,
}
```

### Submission.js
```javascript
{
  assignmentId: ObjectId → Assignment,
  studentId:    ObjectId → User,
  fileUrl:      String,    // Cloudinary URL
  marks:        Number,
  grade:        String,
  submittedAt:  Date,
}
```

---

## ⚙️ Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
# ── Server ──────────────────────────────────
PORT=5000

# ── Database ────────────────────────────────
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/collahub

# ── JWT Secrets ─────────────────────────────
JWT_SECRET=your_access_token_secret_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here

# ── Email (Gmail SMTP) ───────────────────────
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your_gmail_app_password

# ── Cloudinary (Image Upload) ────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ── Admin Registration ───────────────────────
ADMIN_SECRET_KEY=your_admin_secret_key_2025
```

> **How to get Gmail App Password:**
> Google Account → Security → 2-Step Verification → App Passwords → Generate for "Mail"

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Expo Go app on your phone
- Cloudinary account (free tier works)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/collahub.git
cd collahub
```

### 2. Setup Backend
```bash
cd backend
npm install

# Create and fill .env file
cp .env.example .env

# Start the server
npm start
# or with auto-reload:
npx nodemon server.js
```

### 3. Setup Frontend
```bash
cd mobileApp
npm install
npx expo start
```

### 4. Connect Frontend to Your Backend
Open `services/api.js` and update the base URL:
```javascript
const API = axios.create({
  baseURL: "http://192.168.x.x:5000",   // your local machine IP
  timeout: 10000,
});
```

> **Find your local IP:**
> - Windows: Run `ipconfig` → IPv4 Address
> - Mac/Linux: Run `ifconfig` → inet address

### 5. Run on Your Device
1. Install **Expo Go** from Play Store or App Store
2. Scan the QR code shown in your terminal
3. App will open on your device ✅

---

## 📦 Dependencies

### Frontend — `mobileApp/package.json`
```json
{
  "expo": "~51.0.0",
  "expo-router": "~3.5.0",
  "expo-linear-gradient": "~13.0.2",
  "expo-blur": "~13.0.2",
  "react-native-reanimated": "~3.10.0",
  "@react-native-async-storage/async-storage": "1.23.1",
  "@expo/vector-icons": "^14.0.0",
  "axios": "^1.7.0",
  "react-native-safe-area-context": "4.10.1"
}
```

### Backend — `backend/package.json`
```json
{
  "express": "^4.19.0",
  "mongoose": "^8.4.0",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "nodemailer": "^6.9.0",
  "cloudinary": "^2.3.0",
  "multer": "^1.4.5",
  "streamifier": "^0.1.1",
  "pdfkit": "^0.15.0",
  "dotenv": "^16.4.0",
  "cors": "^2.8.5"
}
```

---

## 🐛 Bug Fixes Log

| # | Bug | Root Cause | Fix Applied |
|---|-----|-----------|-------------|
| 1 | `semester` field not saving | Field missing in `User.js` schema | Added `semester: Number` to User model |
| 2 | `/students/all` returns empty array | Controller was querying wrong model | Fixed to query `User.find({ role: "student" })` |
| 3 | Teacher login shows white screen | Wrong component was saved in file | Rebuilt `teacher-login.js` from scratch |
| 4 | Admin route files not found | Filenames had trailing whitespace | Renamed via PowerShell `Rename-Item` |
| 5 | Import path `../../services/api` errors | Wrong relative path depth | Corrected all import paths in nested folders |
| 6 | Back button causes login loop | Using `router.push()` instead of `router.replace()` | Changed all auth redirects to `router.replace()` |
| 7 | `/admin/add-student` returns 404 | Route was not defined | Added `addStudent` and `addTeacher` to `adminController.js` |
| 8 | Student and User models conflict | Two separate schemas existed | Migrated everything to unified `User.js` model |
| 9 | `manage-subjects` warning in console | Filename had space: `manage-subjects .js` | Renamed the file to remove trailing space |
| 10 | Result system incomplete | Only assignment-based result existed | Added semester-based result upload with auto-promotion logic |

---

## 🔮 Roadmap

### Phase 2 — Upcoming
- [ ] 🔔 Push Notifications via Firebase FCM
- [ ] 📁 Assignment file upload (PDF/Image via Cloudinary)
- [ ] 📊 Bulk import students from Excel file
- [ ] 👨‍👩‍👧 Parent portal — view child's attendance and results

### Phase 3 — Advanced
- [ ] 🤳 Face recognition attendance
- [ ] 💬 Real-time teacher-student chat
- [ ] 🌐 Offline mode with background data sync
- [ ] 🌙 Dark / Light theme toggle
- [ ] 🌍 Multi-language support (Hindi / English)
- [ ] 📈 Analytics dashboard with visual charts (Recharts / Victory)
- [ ] 🎓 Automated certificate generation on semester completion

---

## 📞 Troubleshooting

| Problem | Solution |
|---------|---------|
| App can't connect to backend | Check IP address in `services/api.js`, ensure phone and PC are on same WiFi |
| OTP not received | Check Gmail App Password in `.env`, check spam folder |
| Images not uploading | Verify Cloudinary credentials in `.env` |
| MongoDB connection fails | Check `MONGO_URI` in `.env`, whitelist your IP in Atlas |
| Expo QR not scanning | Try pressing `w` for web or `a` for Android emulator |

---

## 👨‍💻 Author

**Ayush Tiwari**
Full Stack Mobile Developer
React Native + Node.js + MongoDB

---

## 📄 License

```
Copyright © 2025 CollaHub, COLLAहUB
All rights reserved.

This project is private and proprietary.
Unauthorized copying, distribution, or modification is prohibited.
```

---

<div align="center">
  Built with ❤️ using React Native + Node.js + MongoDB
  <br/>
  <sub>CollaHub — Digitizing College Management</sub>
</div>
