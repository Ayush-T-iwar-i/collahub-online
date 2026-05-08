# COLLAहUB — College Attendance & Management System

<div align="center">

```
   ██████╗ ██████╗ ██╗     ██╗      █████╗ ██╗  ██╗██╗   ██╗██████╗ 
  ██╔════╝██╔═══██╗██║     ██║     ██╔══██╗██║  ██║██║   ██║██╔══██╗
  ██║     ██║   ██║██║     ██║     ███████║███████║██║   ██║██████╔╝
  ██║     ██║   ██║██║     ██║     ██╔══██║██╔══██║██║   ██║██╔══██╗
  ╚██████╗╚██████╔╝███████╗███████╗██║  ██║██║  ██║╚██████╔╝██████╔╝
   ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ 
```

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![React Native](https://img.shields.io/badge/React_Native-Expo_51-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-v24-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Railway](https://img.shields.io/badge/Deployed_on-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

### A comprehensive full-stack college management platform for Super Admins, Admins, Teachers, and Students.

**🌐 Live API:** [`https://collahub.up.railway.app`](https://collahub.up.railway.app/health)  
**📱 Domain:** [`collahub.online`](https://collahub.online)  
**📦 Repository:** [`UNIVERSITY-HUB-CODE`](https://github.com/Ayush-T-iwar-i/UNIVERSITY-HUB-CODE)

[View Live API Health](https://collahub.up.railway.app/health) • [Report a Bug](https://github.com/Ayush-T-iwar-i/UNIVERSITY-HUB-CODE/issues) • [Request Feature](https://github.com/Ayush-T-iwar-i/UNIVERSITY-HUB-CODE/issues)

</div>

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [System Architecture](#-system-architecture)
3. [User Roles & Access Levels](#-user-roles--access-levels)
4. [Complete Feature List](#-complete-feature-list)
   - [Super Admin](#super-admin-features)
   - [Admin](#admin-features)
   - [Teacher](#teacher-features)
   - [Student](#student-features)
5. [Tech Stack](#-tech-stack)
6. [Project Structure](#-project-structure)
7. [Database Schema](#-database-schema)
8. [Getting Started](#-getting-started)
   - [Prerequisites](#prerequisites)
   - [Backend Setup](#backend-setup)
   - [Mobile App Setup](#mobile-app-setup)
9. [Environment Variables](#-environment-variables)
10. [API Reference](#-api-reference)
    - [Authentication](#authentication-routes)
    - [Super Admin](#super-admin-routes)
    - [Admin](#admin-routes)
    - [Teacher](#teacher-routes)
    - [Student](#student-routes)
    - [Subject Requests & Timetable](#subject-requests--timetable-routes)
    - [Attendance](#attendance-routes)
    - [Posts & Announcements](#posts--announcements-routes)
    - [Assignments & Submissions](#assignments--submissions-routes)
    - [Results](#results-routes)
    - [Notifications](#notifications-routes)
    - [Dashboard](#dashboard-routes)
11. [Authentication Flow](#-authentication-flow)
12. [Key Feature Deep Dives](#-key-feature-deep-dives)
    - [Class Sharing (Substitute Teacher)](#class-sharing--substitute-teacher)
    - [Timetable Conflict Detection](#timetable-conflict-detection)
    - [Attendance System](#attendance-system)
    - [Safe Image Handling](#safe-image-handling)
13. [Deployment Guide](#-deployment-guide)
    - [Railway Deployment](#railway-deployment)
    - [DNS Configuration](#dns-configuration)
    - [Expo EAS Build](#expo-eas-build)
14. [Security Implementation](#-security-implementation)
15. [Frontend Architecture](#-frontend-architecture)
16. [Backend Architecture](#-backend-architecture)
17. [Error Handling](#-error-handling)
18. [Performance Optimizations](#-performance-optimizations)
19. [Known Issues & Roadmap](#-known-issues--roadmap)
20. [Contributing](#-contributing)
21. [License](#-license)

---

## 🎯 Project Overview

COLLAहUB is a **full-stack, mobile-first college management platform** built for Indian educational institutions. It digitizes the entire college workflow — from student enrollment and subject assignment to timetable management, attendance tracking, and result publication.

The system supports **4 distinct user roles** in a hierarchical structure:

```
Super Admin
    └── Admin (per college)
            ├── Teachers
            └── Students
```

### Why COLLAहUB?

Traditional college management relies on paper registers, Excel sheets, and disconnected systems. COLLAहUB brings everything into one app:

- ✅ **Real-time attendance** marking with conflict detection
- ✅ **Smart timetable** management with automatic conflict prevention
- ✅ **Class sharing** — substitute teacher feature for unavailable faculty
- ✅ **Multi-college support** — one platform, multiple institutions
- ✅ **Role-based dashboards** — each user sees only what they need
- ✅ **OTP-based authentication** — secure, email-verified login
- ✅ **Digital ID cards** — with QR code, downloadable as PNG

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Android    │  │     iOS      │  │   Expo Web       │  │
│  │  (Expo APK)  │  │  (Expo IPA)  │  │  (Browser)       │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         └─────────────────┴──────────────────┘             │
│                           │ HTTPS                           │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                       API GATEWAY                           │
│              Railway (collahub.up.railway.app)              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Express.js Server                      │    │
│  │                                                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐   │    │
│  │  │   CORS   │  │  Helmet  │  │  Rate Limiter   │   │    │
│  │  └──────────┘  └──────────┘  └─────────────────┘   │    │
│  │                                                     │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │            JWT Auth Middleware               │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  │                                                     │    │
│  │  Routes: auth | admin | teacher | student |         │    │
│  │          subject-requests | attendance |            │    │
│  │          assignments | results | posts | ...        │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      DATA LAYER                             │
│                                                             │
│  ┌──────────────────┐        ┌──────────────────────────┐   │
│  │   MongoDB Atlas  │        │       Cloudinary         │   │
│  │   (Database)     │        │   (Image Storage)        │   │
│  └──────────────────┘        └──────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Resend API (Email OTP)                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 User Roles & Access Levels

### Role Hierarchy

```
SUPER ADMIN
│   • Manages all colleges on the platform
│   • Creates and manages Admin accounts
│   • Views platform-wide statistics
│   • Has unrestricted access
│
├── ADMIN (per college)
│   │   • Manages one specific college
│   │   • Creates Teacher and Student accounts
│   │   • Approves subject requests
│   │   • Assigns timetables
│   │   • Views all college data
│   │
│   ├── TEACHER (per department)
│   │   │   • Requests subjects to teach
│   │   │   • Marks attendance for students
│   │   │   • Can share classes with substitutes
│   │   │   • Posts notes and assignments
│   │   │   • Views own timetable
│   │   │
│   └── STUDENT (per batch/section)
│           • Views their own timetable
│           • Tracks personal attendance
│           • Submits assignments
│           • Views results
│           • Reads posts and notices
```

### Permission Matrix

| Feature | Super Admin | Admin | Teacher | Student |
|---------|:-----------:|:-----:|:-------:|:-------:|
| Manage Colleges | ✅ | ❌ | ❌ | ❌ |
| Manage Admins | ✅ | ❌ | ❌ | ❌ |
| Manage Teachers | ✅ | ✅ | ❌ | ❌ |
| Manage Students | ✅ | ✅ | ❌ | ❌ |
| Approve Subject Requests | ✅ | ✅ | ❌ | ❌ |
| Assign Timetable | ✅ | ✅ | ❌ | ❌ |
| Request Subjects | ❌ | ❌ | ✅ | ❌ |
| Mark Attendance | ❌ | ❌ | ✅ | ❌ |
| Share Classes | ❌ | ❌ | ✅ | ❌ |
| View Own Attendance | ❌ | ❌ | ❌ | ✅ |
| Submit Assignments | ❌ | ❌ | ❌ | ✅ |
| Post Announcements | ✅ | ✅ | ✅ | ❌ |
| View All Data | ✅ | ✅ (college) | ✅ (own) | ✅ (own) |

---

## ✨ Complete Feature List

### Super Admin Features

#### College Management
- **Create Colleges** — register new educational institutions on the platform
- **View All Colleges** — list of all registered colleges with stats
- **Edit College Details** — update name, address, contact information
- **Deactivate Colleges** — suspend access for a college
- **College-wise Statistics** — students, teachers, subjects per college

#### Admin Account Management
- **Create Admin Accounts** — assign admins to colleges
- **View All Admins** — list of all admin users across colleges
- **Reset Admin Passwords** — force password reset
- **Manage Admin Access** — activate/deactivate admin accounts

#### Platform Statistics Dashboard
- Total colleges registered
- Total users (students + teachers + admins)
- Active sessions
- Platform health overview
- Recent registrations and activities

#### Super Admin Profile
- Secure profile with ID card
- Change password
- Upload profile photo

---

### Admin Features

#### Student Management
- **Add Students** — register new students with:
  - Personal info (name, email, phone, gender, DOB)
  - Academic info (college, department, semester, batch year, section)
  - Auto-generated Student ID
- **View All Students** — filterable by:
  - Department
  - Semester (1–8)
  - Admission Year (batch)
  - Section (A/B/C/D)
- **Edit Student Details** — update semester, section, department
- **Delete Student Accounts**
- **Bulk Import** (planned)

#### Teacher Management
- **Add Teachers** — register faculty with:
  - Personal info (name, email, phone)
  - Department assignment
  - Auto-generated Teacher ID
- **View All Teachers** — filterable by department
- **Edit Teacher Details** — update department, contact
- **Delete Teacher Accounts**
- **View Teacher's Timetable** — see what classes a teacher is assigned

#### Subject Management
- **Add Subjects** to the subject catalog with:
  - Subject name and code
  - Type: Theory / Lab / Both
  - Department and semester
  - Credits and description
- **Edit Subjects**
- **Delete Subjects**
- **View Subject Catalog** — filtered by department/semester

#### Subject Request Review
- **View All Requests** — filterable by status:
  - Pending (awaiting review)
  - Accepted (active)
  - Rejected
- **Accept Request + Assign Timetable**:
  - Visual timetable grid (Mon–Sat, 8AM–6PM)
  - Color-coded conflict indicators:
    - 🔴 RED — Teacher is already busy at that slot
    - 🟠 ORANGE — Same subject already assigned to same batch
    - 🔴 RED border — Room conflict
  - Room number assignment per slot
  - Day-wise tabs with conflict count badges
  - Schedule summary before saving
  - 4-layer conflict validation (teacher, room, batch, timetable model)
- **Reject Request** — with optional reason note
- **Edit Timetable** — modify assigned slots for accepted subjects

#### Room Timetable View
- View **room-wise schedule** across all days
- Filter rooms by search
- See which class is in which room at what time
- **Conflict Detection Tab**:
  - Room conflicts (same room double-booked)
  - Teacher conflicts (teacher in two places)
  - Batch conflicts (students have two classes)
- Tap any slot for full details (subject, teacher, batch, section)

#### Attendance Oversight
- View attendance records for all students
- Filter by:
  - Department
  - Semester
  - Date range
  - Subject
- Export attendance data
- View attendance percentage per student

#### Teacher Attendance (Biometric Gate)
- View teacher punch-in/punch-out records
- Gate biometric integration
- Daily/weekly attendance reports

#### Announcements & Posts
- Create announcements/notices for:
  - Specific college
  - All departments
  - Specific semester
- Attach media:
  - Images
  - Videos
  - Audio files
  - Documents
- Categorize posts: General | Academic | Event | Holiday | Exam | Alert
- View and manage all college posts

#### Admin Dashboard
- **Overview stats**: enrolled students, registered teachers, active subjects, pending requests
- **Quick menu** to all management sections
- **College posts feed** with like/comment support
- **Double-back-to-exit** protection on Android

---

### Teacher Features

#### My Subjects & Timetable
- **Request Subjects** to teach:
  - Select from college's subject catalog
  - Specify batch year, semester, section
- **View My Subjects** — all accepted subject requests
- **My Timetable** — weekly view (Mon–Sat) of all assigned slots
  - Color-coded by day
  - Current class highlighted
  - Room information displayed

#### Mark Attendance
- Select subject from list (own subjects + shared/substitute classes)
- **Smart subject list** sorted by time:
  - 🟢 Currently ongoing classes shown first (with LIVE badge)
  - 🟡 Upcoming classes next
  - ⚫ Past classes dimmed
- **Theory + Lab attendance** for "Both" type subjects
- **Date navigator**:
  - Previous/Next day arrows
  - Tap to open date picker (last 30 days)
  - Color-coded dates: ✅ green = marked, ❌ red = not marked
  - Sundays disabled
- **Student list** with profile photos and initials fallback
- **Quick mark all** — Present All / Absent All buttons
- **Stats bar** — present count, absent count, total
- **Submit/Update** with confirmation dialog
- After submission, option to:
  - Go to previous day
  - Go to next day
  - Back to subjects

#### Class Sharing (Substitute Teacher Feature)
- When unavailable, share a class with any teacher from same college
- **Share Modal**:
  - Shows all active timetable slots for that subject
  - Searchable list of ALL teachers in the same college (all departments)
  - Shows teacher name, department, teacher ID
  - Access auto-expires when class period ends
- **Substitute teacher sees**:
  - Class in their attendance list with purple "SUBSTITUTE" badge
  - Original teacher's name displayed
  - Time until expiry shown
- **Manage active shares**:
  - View who has access to which class
  - Remove shares at any time
- Notification sent to substitute teacher automatically

#### Notes & Study Material
- Post study notes for specific subjects/batches
- Notes appear with blue border + "STUDY NOTE" badge
- Students can view in their feed

#### Assignments
- Create assignments for specific subjects/batches
- Set due date
- View submissions from students

#### Profile & ID Card
- View personal information
- Upload/change profile photo (Cloudinary)
- **Tap profile photo** → full-screen preview
- **Download Teacher ID Card** (PNG):
  - College name and logo
  - Teacher photo with fallback initials
  - Name, Teacher ID, Department
  - QR code (encoded: ID, name, department)
  - "FACULTY" badge, "VALID" badge
  - COLLAHUB watermark
  - Works on both web (html2canvas) and mobile (react-native-view-shot)

#### Teacher Dashboard
- **Overview stats**: students in department, today's classes, total classes, attendance marked today
- **Today's Classes** section — color coded by day
- **Posts + Notes tabs** — view college feed
- **Profile** quick access with avatar

---

### Student Features

#### My Timetable
- View full weekly timetable (Mon–Sat)
- Shows teacher name, room, time for each class
- Today's classes highlighted
- Day tabs with class count badges

#### My Attendance
- View attendance percentage per subject
- See present/absent count for each subject
- Date-wise attendance history
- Visual progress indicators

#### My Results
- Semester-wise results:
  - SGPA per semester
  - CGPA (cumulative)
  - Pass/Fail status
- Horizontal scrollable result cards
- Color coded: green = pass, red = fail

#### Assignments
- View assigned homework/assignments
- Submit assignments before deadline
- View submission status

#### College Feed
- View posts from admins and teachers
- Like posts
- Comment on posts
- View attached media (images, videos, audio)

#### Notes & Study Material
- Access study notes posted by teachers
- Filter by subject

#### Profile & ID Card
- View personal academic information:
  - Department, semester, section, batch year
  - Student ID, email, phone
- Upload/change profile photo
- **Tap profile photo** → full-screen preview modal
- **Download Student ID Card** (PNG):
  - College header
  - Student photo
  - Name, Student ID, Department
  - Semester + Section + Batch Year badges
  - QR code (encoded: studentId, name, dept, batch)
  - "VALID" badge with join date
  - COLLAHUB watermark
  - Colorful gradient stripe header/footer
  - Works on web (html2canvas) and mobile (expo-media-library)

#### Student Dashboard
- Welcome card with name, ID, college, semester, section
- Performance stats: submissions, avg marks, highest marks, total marks
- College feed with like/comment
- Bottom tab bar: Home | Attendance | Notes | Schedule | Profile

---

## 🛠 Tech Stack

### Frontend (Mobile App)

| Technology | Version | Purpose |
|-----------|---------|---------|
| React Native | 0.74 | Cross-platform mobile framework |
| Expo | 51 | Development toolchain |
| Expo Router | 3.x | File-based navigation |
| Expo Linear Gradient | - | Gradient UI components |
| Expo Image Picker | - | Profile photo selection |
| Expo Media Library | - | Save ID card to gallery |
| Expo File System | - | File management |
| React Native View Shot | - | Capture ID card as PNG |
| html2canvas | - | Web ID card download |
| AsyncStorage | - | Local data persistence |
| Axios | - | HTTP client with interceptors |
| @expo/vector-icons | - | Ionicons icon set |
| react-native-qrcode-svg | - | QR code generation |
| react-native-safe-area-context | - | Safe area handling |
| expo-linear-gradient | - | Beautiful gradients |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | v24 | JavaScript runtime |
| Express.js | 5.x | Web framework |
| Mongoose | 8.x | MongoDB ODM |
| JWT (jsonwebtoken) | - | Authentication tokens |
| bcryptjs | - | Password hashing |
| Multer | - | File upload handling |
| Cloudinary SDK | - | Image cloud storage |
| Nodemailer / Resend | - | Email OTP delivery |
| Helmet | - | HTTP security headers |
| express-rate-limit | - | API rate limiting |
| cors | - | Cross-origin requests |
| dotenv | - | Environment variables |
| morgan / custom logger | - | Request logging |

### Infrastructure

| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Cloud database |
| Railway | Backend hosting + auto-deploy |
| Cloudinary | Profile image storage |
| Resend | Transactional email (OTP) |
| Hostinger | Domain (collahub.online) |
| GitHub | Version control + CI/CD |
| Expo EAS | Mobile app builds |

---

## 📁 Project Structure

```
UNIVERSITY-HUB-CODE/
│
├── README.md                           ← You are here
│
├── backend/                            ← Node.js + Express API
│   ├── config/
│   │   └── db.js                       ← MongoDB Atlas connection
│   │
│   ├── controllers/
│   │   ├── authController.js           ← Login, OTP, register, refresh
│   │   ├── userController.js           ← User CRUD, profile upload
│   │   ├── attendanceController.js     ← Mark, check, fetch attendance
│   │   ├── subjectController.js        ← Subject catalog CRUD
│   │   ├── assignmentController.js     ← Assignment management
│   │   ├── resultController.js         ← Student results
│   │   ├── postController.js           ← Posts, likes, comments
│   │   ├── notificationController.js   ← Push notifications
│   │   └── dashboardController.js      ← Stats for each role
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js           ← verifyToken, isAdmin, isTeacher
│   │   ├── errorHandler.js             ← Global error handler
│   │   ├── logger.js                   ← Request/response logger
│   │   └── upload.js                   ← Multer + Cloudinary config
│   │
│   ├── models/
│   │   ├── User.js                     ← All users (student/teacher/admin/super-admin)
│   │   ├── SubjectRequest.js           ← Subject requests + timetable + sharing
│   │   ├── Subject.js                  ← Subject catalog
│   │   ├── Timetable.js                ← Timetable model
│   │   ├── Attendance.js               ← Attendance records
│   │   ├── Assignment.js               ← Assignments
│   │   ├── Submission.js               ← Student submissions
│   │   ├── Result.js                   ← Semester results
│   │   ├── Post.js                     ← Announcements/posts
│   │   ├── Comment.js                  ← Post comments
│   │   ├── Notification.js             ← User notifications
│   │   ├── Course.js                   ← Course data
│   │   ├── Leave.js                    ← Leave requests
│   │   ├── Note.js                     ← Teacher notes/study material
│   │   └── Biometric.js                ← Gate biometric records
│   │
│   ├── routes/
│   │   ├── authRoutes.js               ← /auth/* endpoints
│   │   ├── adminRoutes.js              ← /admin/* endpoints
│   │   ├── superAdminRoutes.js         ← /super-admin/* endpoints
│   │   ├── teacherRoutes.js            ← /teacher/* endpoints
│   │   ├── teacherManageRoutes.js      ← /teachers/* (admin manages teachers)
│   │   ├── studentRoutes.js            ← /student/* endpoints
│   │   ├── studentTeacherRoutes.js     ← /students/* (admin manages students)
│   │   ├── subjectRoutes.js            ← /subjects/* (subject catalog)
│   │   ├── subjectRequestRoutes.js     ← /subject-requests/* (requests + timetable + sharing)
│   │   ├── attendanceRoutes.js         ← /attendance/* endpoints
│   │   ├── timetableRoutes.js          ← /timetable/* endpoints
│   │   ├── assignmentRoutes.js         ← /assignments/* endpoints
│   │   ├── submissionRoutes.js         ← /submissions/* endpoints
│   │   ├── resultRoutes.js             ← /results/* endpoints
│   │   ├── noticeRoutes.js             ← /notices/* endpoints
│   │   ├── postRoutes.js               ← /api/posts/* endpoints
│   │   ├── noteRoutes.js               ← /notes/* and /teacher-notes/*
│   │   ├── notificationRoutes.js       ← /notifications/* endpoints
│   │   ├── dashboardRoutes.js          ← /dashboard/* endpoints
│   │   ├── courseRoutes.js             ← /courses/* endpoints
│   │   ├── leaveRoutes.js              ← /leaves/* endpoints
│   │   ├── roomRoutes.js               ← /rooms/* endpoints
│   │   ├── otpRoutes.js                ← /otp/* endpoints
│   │   ├── announcementRoutes.js       ← /announcements/* endpoints
│   │   ├── biometricRoutes.js          ← /biometric/* endpoints
│   │   ├── userRoutes.js               ← /user/* (profile upload etc.)
│   │   └── superAdminRoutes.js         ← /super-admin/* endpoints
│   │
│   ├── server.js                       ← Express app, middleware, routes
│   ├── package.json
│   ├── .env                            ← (NOT committed — see .gitignore)
│   ├── .gitignore
│   └── railway.toml                    ← Railway deployment config
│
└── mobileApp/                          ← React Native (Expo)
    ├── app/
    │   ├── _layout.js                  ← Root layout
    │   ├── index.js                    ← Landing / role select
    │   ├── login.js                    ← Login screen
    │   │
    │   ├── (auth)/                     ← Auth screens
    │   │   ├── student-login.js
    │   │   ├── teacher-login.js
    │   │   ├── admin-login.js
    │   │   └── super-admin-login.js
    │   │
    │   ├── super-admin/                ← Super Admin screens
    │   │   ├── dashboard.js
    │   │   ├── manage-colleges.js
    │   │   ├── manage-admins.js
    │   │   └── profile.js
    │   │
    │   ├── admin/                      ← Admin screens
    │   │   ├── dashboard.js            ← Stats + menu + feed
    │   │   ├── manage-students.js
    │   │   ├── manage-teachers.js
    │   │   ├── manage-subjects.js
    │   │   ├── subject-requests.js     ← Review + timetable assignment
    │   │   ├── room-timetable.js       ← Room-wise view + conflicts
    │   │   ├── manage-timetable.js     ← Redirect to subject-requests
    │   │   ├── view-attendance.js
    │   │   ├── teacher-attendance.js
    │   │   ├── post-notice.js
    │   │   ├── biometric.js
    │   │   └── profile.js
    │   │
    │   ├── teacher/                    ← Teacher screens
    │   │   ├── dashboard.js            ← Stats + today's classes + feed
    │   │   ├── mark-attendance.js      ← Attendance + class sharing
    │   │   ├── my-subjects.js
    │   │   ├── timetable.js
    │   │   ├── post-note.js
    │   │   ├── assignments.js
    │   │   ├── students.js             ← View department students
    │   │   └── profile.js              ← ID card + photo upload
    │   │
    │   └── student/                    ← Student screens
    │       ├── dashboard.js            ← Stats + feed + tab bar
    │       ├── attendance.js
    │       ├── timetable.js
    │       ├── notes.js
    │       ├── assignments.js
    │       ├── results.js
    │       └── profile.js              ← ID card + photo upload
    │
    ├── components/
    │   └── SafeImage.js                ← Safe image with initials fallback
    │
    ├── services/
    │   └── api.js                      ← Axios + auth interceptors + refresh
    │
    ├── app.json                        ← Expo config
    ├── eas.json                        ← EAS build profiles
    ├── package.json
    └── .gitignore
```

---

## 🗄 Database Schema

### User Model
```javascript
{
  name:          String (required),
  email:         String (unique, required),
  password:      String (hashed),
  role:          "super-admin" | "admin" | "teacher" | "student",

  // IDs
  studentId:     String (auto-generated for students),
  teacherId:     String (auto-generated for teachers),

  // Academic info
  college:       String,
  department:    String,
  semester:      Number,
  admissionYear: String,
  section:       String,    // A/B/C/D

  // Personal info
  phone:         String,
  gender:        String,
  dateOfBirth:   Date,

  // Auth
  otp:           String,
  otpExpire:     Date,
  refreshToken:  String,

  // Profile
  profileImage:  String,    // Cloudinary URL

  // Meta
  isVerified:    Boolean,
  isActive:      Boolean,
  createdAt:     Date,
}
```

### SubjectRequest Model
```javascript
{
  // Teacher info
  teacherId:     ObjectId (ref: User),
  teacherName:   String,

  // Subject info
  subjectName:   String (required),
  subjectCode:   String,
  subjectId:     ObjectId (ref: Subject),
  subjectType:   "Theory" | "Lab" | "Both",

  // Target class
  college:       String (required),
  department:    String (required),
  semester:      Number (required),
  admissionYear: String (required),
  section:       String,    // A/B/C/D/All

  // Timetable (admin assigned)
  timetable: [{
    day:       "Monday" | "Tuesday" | ... | "Saturday",
    startTime: String,  // "09:00"
    endTime:   String,  // "10:00"
    room:      String,  // "A-101"
  }],

  // Status
  status:    "pending" | "accepted" | "rejected",
  adminNote: String,

  // Class Sharing
  sharedWith: [{
    teacherId:   ObjectId (ref: User),
    teacherName: String,
    day:         String,
    startTime:   String,
    endTime:     String,
    expiresAt:   Date,      // auto-expire
    sharedAt:    Date,
  }],

  timestamps: true,
}
```

### Attendance Model
```javascript
{
  subjectId:     ObjectId (ref: SubjectRequest),
  subjectName:   String,
  teacherId:     ObjectId (ref: User),
  department:    String,
  semester:      Number,
  admissionYear: String,
  date:          String,    // "2024-01-15"
  type:          "theory" | "lab",
  records: [{
    studentId: ObjectId (ref: User),
    status:    "present" | "absent",
  }],
  timestamps: true,
}
```

### Subject Model
```javascript
{
  name:        String (required),
  code:        String,
  type:        "Theory" | "Lab" | "Both",
  college:     String,
  department:  String,
  semester:    Number,
  credits:     Number,
  description: String,
  timestamps: true,
}
```

### Post Model
```javascript
{
  authorId:     ObjectId (ref: User),
  authorName:   String,
  authorRole:   String,
  caption:      String,
  category:     "General" | "Academic" | "Event" | "Holiday" | "Exam" | "Alert",
  mediaType:    "image" | "video" | "audio" | "document",
  mediaUrl:     String,
  college:      String,
  likes:        [ObjectId],
  likeCount:    Number,
  commentCount: Number,
  timestamps:   true,
}
```

### Notification Model
```javascript
{
  userId:    ObjectId (ref: User),
  title:     String,
  message:   String,
  type:      "subject_request" | "class_share" | "assignment" | "result" | "general",
  isRead:    Boolean,
  timestamps: true,
}
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

```bash
node --version    # v18.0.0 or higher (v24 recommended)
npm --version     # v9.0.0 or higher
git --version     # any recent version
```

Also create accounts on:
- [MongoDB Atlas](https://www.mongodb.com/atlas) — free tier works
- [Cloudinary](https://cloudinary.com) — free tier works
- [Resend](https://resend.com) — free tier (3000 emails/month)

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/Ayush-T-iwar-i/UNIVERSITY-HUB-CODE.git

# 2. Navigate to backend folder
cd UNIVERSITY-HUB-CODE/backend

# 3. Install dependencies
npm install

# 4. Create environment file
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)

# 5. Start development server
node server.js

# OR with auto-restart on changes (install nodemon globally first)
npm install -g nodemon
nodemon server.js
```

**Verify the server is running:**
```bash
curl http://localhost:5000/health
# Expected: {"success":true,"message":"CollaHub API is running 🚀"}
```

### Mobile App Setup

```bash
# 1. Navigate to mobile app folder
cd UNIVERSITY-HUB-CODE/mobileApp

# 2. Install dependencies
npm install

# 3. Update API URL (if running locally)
# Edit mobileApp/services/api.js
# Change BASE_URL to your local IP or keep production URL

# 4. Start Expo development server
npx expo start

# Available options after starting:
# Press 'a' → Android emulator
# Press 'i' → iOS simulator (Mac only)
# Press 'w' → Web browser
# Scan QR code → Expo Go app on physical device
```

**For Android Emulator:**
```bash
npx expo start --android
```

**For Web:**
```bash
npx expo start --web
```

**For physical device:**
1. Install [Expo Go](https://expo.dev/client) on your phone
2. Scan the QR code shown in terminal
3. Make sure your phone and computer are on the same WiFi network

---

## 🔐 Environment Variables

Create `backend/.env` with the following:

```env
# ─────────────────────────────────────────────
# SERVER CONFIGURATION
# ─────────────────────────────────────────────
PORT=5000
NODE_ENV=development
# Set to "production" when deploying to Railway

# ─────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/collegeAttendance?retryWrites=true&w=majority
# Get this from: MongoDB Atlas → Connect → Drivers

# ─────────────────────────────────────────────
# JWT AUTHENTICATION SECRETS
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# ─────────────────────────────────────────────
JWT_SECRET=your_64_character_hex_string_here
ACCESS_TOKEN_SECRET=your_64_character_hex_string_here
REFRESH_TOKEN_SECRET=your_different_64_character_hex_string_here

# ─────────────────────────────────────────────
# EMAIL (OTP) — Resend API
# Get API key from: https://resend.com/api-keys
# ─────────────────────────────────────────────
EMAIL_USER=noreply@collahub.online
EMAIL_PASS=your_resend_api_key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# ─────────────────────────────────────────────
# CLOUDINARY (Profile Photo Storage)
# Get from: https://console.cloudinary.com/console
# ─────────────────────────────────────────────
CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

# ─────────────────────────────────────────────
# OTHER OPTIONS
# ─────────────────────────────────────────────
# NODE_OPTIONS=--max-old-space-size=512
```

> ⚠️ **IMPORTANT:** Never commit `.env` to Git. Add it to `.gitignore`.
> 
> The `.gitignore` file should contain:
> ```
> .env
> node_modules/
> uploads/
> ```

### Generating JWT Secrets

```bash
# Run in Node.js terminal — generates a secure 64-char secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Run twice — once for JWT_SECRET/ACCESS_TOKEN_SECRET, once for REFRESH_TOKEN_SECRET
```

---

## 📡 API Reference

**Base URL (Production):** `https://collahub.up.railway.app`  
**Base URL (Local):** `http://localhost:5000`

All protected routes require:
```
Authorization: Bearer <access_token>
```

---

### Authentication Routes

**Base path:** `/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/send-email-otp` | None | Send OTP to email for registration |
| `POST` | `/auth/verify-email-otp` | None | Verify OTP, get temp token |
| `POST` | `/auth/register` | None | Complete registration with user details |
| `POST` | `/auth/login` | None | Step 1: validate credentials, send OTP |
| `POST` | `/auth/login-verify-otp` | None | Step 2: verify OTP, receive JWT tokens |
| `POST` | `/auth/refresh-token` | None | Get new access token using refresh token |
| `POST` | `/auth/logout` | ✅ | Invalidate refresh token |
| `POST` | `/auth/forgot-password` | None | Send password reset OTP |
| `POST` | `/auth/reset-password` | None | Reset password using OTP |
| `PUT` | `/auth/change-password` | ✅ | Change password (logged in) |

**Example — Login Flow:**
```javascript
// Step 1: Send credentials
POST /auth/login
Body: { email: "teacher@college.edu", password: "pass123" }
Response: { success: true, message: "OTP sent to email" }

// Step 2: Verify OTP
POST /auth/login-verify-otp
Body: { email: "teacher@college.edu", otp: "123456" }
Response: {
  success: true,
  accessToken: "eyJhbGc...",
  refreshToken: "eyJhbGc...",
  user: { name, role, college, department, ... }
}
```

---

### Super Admin Routes

**Base path:** `/super-admin`  
**Auth required:** Super Admin role

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/super-admin/dashboard` | Platform-wide statistics |
| `GET` | `/super-admin/colleges` | List all colleges |
| `POST` | `/super-admin/colleges` | Create new college |
| `PUT` | `/super-admin/colleges/:id` | Update college details |
| `DELETE` | `/super-admin/colleges/:id` | Deactivate college |
| `GET` | `/super-admin/admins` | List all admin users |
| `POST` | `/super-admin/admins` | Create admin account |
| `PUT` | `/super-admin/admins/:id` | Update admin |
| `DELETE` | `/super-admin/admins/:id` | Delete admin account |
| `GET` | `/super-admin/stats` | Platform statistics |
| `GET` | `/super-admin/users` | All users across platform |

---

### Admin Routes

**Base path:** `/admin`  
**Auth required:** Admin or Super Admin role

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/students` | All students in admin's college |
| `POST` | `/admin/students` | Add new student |
| `PUT` | `/admin/students/:id` | Update student (semester, section, etc.) |
| `DELETE` | `/admin/students/:id` | Delete student account |
| `GET` | `/admin/teachers` | All teachers in admin's college |
| `POST` | `/admin/teachers` | Add new teacher |
| `PUT` | `/admin/teachers/:id` | Update teacher |
| `DELETE` | `/admin/teachers/:id` | Delete teacher account |
| `GET` | `/admin/attendance` | Attendance records (filterable) |
| `GET` | `/admin/teacher-attendance` | Teacher biometric records |
| `GET` | `/admin/stats` | College-wide stats |

---

### Teacher Routes

**Base path:** `/teacher`  
**Auth required:** Teacher role

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/teacher/me` | Get own profile with latest data |
| `GET` | `/teacher/students` | Students in same dept/sem (filterable) |
| `GET` | `/teacher/dashboard` | Dashboard stats and today's classes |
| `PUT` | `/teacher/profile` | Update profile information |

---

### Student Routes

**Base path:** `/student`  
**Auth required:** Student role

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/student/me` | Get own profile (fresh from server) |
| `GET` | `/student/attendance` | Own attendance records |
| `GET` | `/student/results` | Semester results |
| `GET` | `/student/assignments` | Assigned assignments |
| `POST` | `/student/upload-profile` | Upload profile photo |

---

### Subject Requests & Timetable Routes

**Base path:** `/subject-requests`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/subject-requests` | Admin | All requests (filter by status) |
| `POST` | `/subject-requests` | Teacher | Submit new request |
| `GET` | `/subject-requests/my` | Teacher | Own requests |
| `GET` | `/subject-requests/my-subjects` | Teacher | Accepted subjects + shared classes |
| `GET` | `/subject-requests/teacher-timetable` | Teacher | Weekly timetable grouped by day |
| `GET` | `/subject-requests/teachers-list` | Teacher | All teachers in same college (for sharing) |
| `GET` | `/subject-requests/student-timetable` | Student | Student's weekly timetable |
| `GET` | `/subject-requests/student-subjects` | Student | Student's subjects |
| `GET` | `/subject-requests/available-subjects` | Teacher | Subject catalog for their dept |
| `PUT` | `/subject-requests/:id/accept` | Admin | Accept + assign timetable |
| `PUT` | `/subject-requests/:id/reject` | Admin | Reject with note |
| `GET` | `/subject-requests/:id/students` | Teacher | Students for attendance |
| `POST` | `/subject-requests/:id/share` | Teacher | Share class with substitute |
| `DELETE` | `/subject-requests/:id/share/:shareId` | Teacher | Remove a share |
| `GET` | `/subject-requests/:id/shares` | Teacher | Active shares for subject |
| `DELETE` | `/subject-requests/:id` | Teacher | Delete pending request |

**Accept Request Body:**
```javascript
PUT /subject-requests/:id/accept
Body: {
  timetable: [
    { day: "Monday", startTime: "09:00", endTime: "10:00", room: "A-101" },
    { day: "Wednesday", startTime: "11:00", endTime: "12:00", room: "B-202" },
  ]
}
```

**Share Class Body:**
```javascript
POST /subject-requests/:id/share
Body: {
  teacherId:   "64abc...",
  teacherName: "Prof. Sharma",
  day:         "Monday",
  startTime:   "09:00",
  endTime:     "10:00",
  // expiresAt: optional ISO date string (defaults to class end time today)
}
```

---

### Attendance Routes

**Base path:** `/attendance`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/attendance/mark` | Teacher | Mark or update attendance |
| `GET` | `/attendance/check` | Teacher | Check if already marked for date |
| `GET` | `/attendance/subject/:id` | Teacher | All marked dates for a subject |
| `GET` | `/attendance/my` | Student | Own attendance summary |
| `GET` | `/attendance/records` | Admin | All records (filterable) |

**Mark Attendance Body:**
```javascript
POST /attendance/mark
Body: {
  subjectId:     "64abc...",
  subjectName:   "Data Structures",
  department:    "Computer Science (CSE)",
  semester:      3,
  admissionYear: "2022",
  date:          "2024-01-15",
  type:          "theory",   // or "lab"
  records: [
    { studentId: "64xyz...", status: "present" },
    { studentId: "64uvw...", status: "absent" },
    // ... all students
  ]
}
```

**Check Attendance Query:**
```
GET /attendance/check?subjectId=64abc...&date=2024-01-15&type=theory
Response: {
  success: true,
  marked: true,
  records: [{ studentId, status }, ...]
}
```

---

### Posts & Announcements Routes

**Base path:** `/api/posts`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/posts` | ✅ | Get all posts for user's college |
| `POST` | `/api/posts` | Admin/Teacher | Create new post |
| `POST` | `/api/posts/:id/like` | ✅ | Toggle like on post |
| `GET` | `/api/posts/:id/comments` | ✅ | Get comments for post |
| `POST` | `/api/posts/:id/comment` | ✅ | Add comment to post |
| `DELETE` | `/api/posts/:id` | Admin | Delete post |

---

### Assignments & Submissions Routes

**Base path:** `/assignments` and `/submissions`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/assignments` | ✅ | Get assignments (role-filtered) |
| `POST` | `/assignments` | Teacher | Create assignment |
| `PUT` | `/assignments/:id` | Teacher | Update assignment |
| `DELETE` | `/assignments/:id` | Teacher | Delete assignment |
| `GET` | `/submissions` | Teacher | View submissions for assignment |
| `POST` | `/submissions` | Student | Submit assignment |
| `PUT` | `/submissions/:id` | Student | Update submission |

---

### Results Routes

**Base path:** `/results`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/results` | Student | Own semester results |
| `POST` | `/results` | Admin | Add result for student |
| `PUT` | `/results/:id` | Admin | Update result |
| `GET` | `/results/student/:id` | Admin | Results for specific student |

---

### Notifications Routes

**Base path:** `/notifications`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/notifications` | ✅ | Get own notifications |
| `PUT` | `/notifications/:id/read` | ✅ | Mark notification as read |
| `PUT` | `/notifications/read-all` | ✅ | Mark all as read |
| `DELETE` | `/notifications/:id` | ✅ | Delete notification |

---

### Dashboard Routes

**Base path:** `/dashboard`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/dashboard/admin` | Admin | College stats |
| `GET` | `/dashboard/teacher` | Teacher | Teacher stats + today's classes |
| `GET` | `/dashboard/student` | Student | Academic performance stats |
| `GET` | `/dashboard/super-admin` | Super Admin | Platform-wide stats |

---

### User Routes

**Base path:** `/user`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/user/upload-profile-image` | ✅ | Upload profile photo to Cloudinary |

---

### Health Check Routes

```
GET /
→ { "success": true, "app": "CollaHub API", "version": "1.0.0", "env": "production" }

GET /health
→ {
    "success": true,
    "status": "healthy",
    "message": "CollaHub API is running 🚀",
    "env": "production",
    "uptime": "3600s"
  }
```

---

## 🔑 Authentication Flow

### Registration Flow
```
User → Enter Email
  → POST /auth/send-email-otp
  → Server sends OTP to email (via Resend)
  → User enters OTP
  → POST /auth/verify-email-otp
  → Server returns temp verification token
  → User fills registration form
  → POST /auth/register (with temp token)
  → Account created ✅
```

### Login Flow
```
User → Enter Email + Password
  → POST /auth/login
  → Server validates credentials
  → Server sends OTP to email
  → User enters OTP
  → POST /auth/login-verify-otp
  → Server returns:
      - accessToken (short-lived: 15 min)
      - refreshToken (long-lived: 7 days)
      - user profile data
  → Tokens stored in AsyncStorage
  → User enters app ✅
```

### Token Refresh Flow
```
API Request with expired accessToken
  → Server returns 401 Unauthorized
  → Axios interceptor catches 401
  → POST /auth/refresh-token (with refreshToken)
  → Server validates refresh token
  → Returns new accessToken
  → Original request retried with new token
  → User never notices ✅

If refresh token also expired:
  → All tokens cleared from AsyncStorage
  → User redirected to login ✅
```

### Request Queue During Refresh
```javascript
// When multiple requests fail at same time (token expired)
// All requests are queued
// Token is refreshed only ONCE
// All queued requests are retried with new token
// No duplicate refresh calls ✅
```

---

## 🔍 Key Feature Deep Dives

### Class Sharing / Substitute Teacher

This feature allows a teacher to temporarily delegate attendance marking to another teacher.

**How it works:**

```
Teacher A (unavailable for Monday 9AM class)
  │
  ├── Opens "Mark Attendance"
  ├── Taps share icon (🔄) on the subject card
  ├── Share Modal opens:
  │   ├── Shows all time slots for that subject
  │   ├── Teacher selects: Monday 09:00
  │   ├── Search box appears with ALL teachers in same college
  │   │   (sorted by department, shows dept + teacher ID)
  │   ├── Teacher selects: Prof. Sharma (CSE · TCH001)
  │   ├── Confirmation: "Prof. Sharma will have access until 10:00 AM"
  │   └── Tap "Share This Class" → Done ✅
  │
  └── Teacher B (Prof. Sharma) opens app:
      ├── Sees class in attendance list with purple SUBSTITUTE badge
      ├── Shows: "Originally: Teacher A"
      ├── Shows: "Until 10:00 AM" expiry badge
      ├── Can mark attendance normally
      └── After 10:00 AM → class automatically disappears ✅
```

**Backend implementation:**
- `sharedWith` array in SubjectRequest model
- Each share has: teacherId, day, startTime, endTime, expiresAt
- `/my-subjects` endpoint returns own subjects + active shares (filtered by expiry)
- `/:id/students` endpoint allows substitute teacher access
- Notification sent to substitute teacher via Notification model

**Auto-expiry:**
- `expiresAt` defaults to class end time (same day)
- If already past end time → expires at 23:59:59 same day
- Custom expiry can be set by owner teacher
- Filter: `expiresAt: { $gt: new Date() }` in MongoDB query

---

### Timetable Conflict Detection

When an admin assigns a timetable to an accepted subject request, **4 conflict checks** run:

```
CHECK 1: Teacher Conflict (🔴 RED)
  Query: Same teacherId + same day + same startTime in any accepted SubjectRequest
  Error: "Teacher already has [Subject] on Monday at 09:00"

CHECK 2: Timetable Model Conflict (🔴 RED)
  Query: Same teacherId + same day + same startTime in Timetable model
  Error: "Schedule conflict: Teacher already has a class at this time"

CHECK 3: Room Conflict (🔴 RED border on input)
  Query: Same room + same college + same day + same startTime
  Error: "Room A-101 is already booked on Monday at 09:00 for [Subject]"

CHECK 4: Batch Conflict (🔴 RED)
  Query: Same college + dept + semester + admissionYear + section + day + time
  Error: "Students of Sem 3 Batch 2022 already have [Subject] at this time"
```

**Frontend conflict indicators:**
```
Color priority in timetable grid:
  🔴 RED background   → Teacher is busy (cannot select)
  🟠 ORANGE background → Same subject for same batch (warning)
  🟡 YELLOW background → Selected slot
  🟢 LIGHT background  → Available slot

Day tab badges:
  🔴 Red number  → Blocked slots count
  🟠 Orange number → Same-subject conflict count
  🟡 Color number → Selected slots count
```

---

### Attendance System

**Theory + Lab support:**
```
Subject type = "Both" (Theory + Lab):
  ├── Two tabs: THEORY | LAB
  ├── Separate attendance records for each type
  ├── Stats shown per active tab
  └── Both submitted in one action

Subject type = "Theory" or "Lab":
  └── Single attendance list (no tabs)
```

**Date navigation:**
```
Previous Day ← [Wed, 15 Jan 2025] → Next Day (disabled if today)
                   ↑
              Tap to open date picker
                   │
              Last 30 days shown
              Green bar = already marked
              Red bar = not marked
              Sunday = disabled (grey)
```

**Already-marked attendance:**
- Existing attendance auto-loads when navigating to a date
- Button changes from "Submit Attendance" → "Update Attendance"
- Records pre-filled with existing status (present/absent)

---

### Safe Image Handling

The `SafeImage` component prevents app crashes caused by invalid image URIs (especially on web):

```javascript
// Problems it solves:
// 1. blob:// URIs crash on Expo Web
// 2. file:// URIs invalid in certain contexts
// 3. null/undefined URI causes crash
// 4. Network images that fail to load

// Usage:
<SafeImage
  uri={profileImage}      // URL or null
  size={44}               // width/height in px
  initials="AK"           // fallback initials
  color="#00c6ff"         // fallback background color
  style={extraStyles}     // additional styles
/>

// If URI is valid → shows Image
// If URI is invalid → shows colored circle with initials
```

---

## 🚀 Deployment Guide

### Railway Deployment

Railway automatically deploys your backend whenever you push to GitHub.

**Initial Setup:**

1. Go to [railway.app](https://railway.app) → Login with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select: `Ayush-T-iwar-i/UNIVERSITY-HUB-CODE`
4. Settings → **Root Directory** → type `backend` → Save
5. Variables tab → Add all environment variables

**Environment Variables for Railway:**
```
MONGODB_URI         = mongodb+srv://...
JWT_SECRET          = (64 char hex)
ACCESS_TOKEN_SECRET = (64 char hex)
REFRESH_TOKEN_SECRET= (64 char hex)
EMAIL_USER          = noreply@collahub.online
EMAIL_PASS          = (resend api key)
RESEND_API_KEY      = re_xxxxx
CLOUD_NAME          = (cloudinary)
CLOUD_API_KEY       = (cloudinary)
CLOUD_API_SECRET    = (cloudinary)
NODE_ENV            = production
PORT                = 5000
```

**railway.toml** (in `backend/` folder):
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node server.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

**Auto-deploy on push:**
```bash
git add .
git commit -m "your changes"
git push origin main
# Railway automatically detects push and redeploys ✅
```

**Verify deployment:**
```bash
curl https://collahub.up.railway.app/health
# → {"success":true,"message":"CollaHub API is running 🚀"}
```

---

### DNS Configuration

**Domain:** `collahub.online` (Hostinger)

Go to: **hpanel.hostinger.com** → Domains → collahub.online → DNS/Nameservers → Manage DNS Records

Add these records:

| Type | Name | Value | TTL | Priority |
|------|------|-------|-----|----------|
| `CNAME` | `api` | `collahub.up.railway.app` | 300 | — |
| `TXT` | `@` | `v=spf1 include:amazonses.com ~all` | 14400 | — |
| `TXT` | `resend._domainkey` | *(exact value from Resend dashboard)* | 14400 | — |
| `MX` | `send` | `feedback-smtp.us-east-1.amazonses.com` | 3600 | 10 |
| `TXT` | `_dmarc` | `v=DMARC1; p=none;` | 14400 | — |

**Resend Domain Verification Steps:**
1. Go to [resend.com/domains](https://resend.com/domains)
2. Add domain: `collahub.online`
3. Copy the exact DKIM value shown
4. Add to Hostinger DNS (delete old one first if exists)
5. Click "Verify Domain" in Resend
6. Wait 5–10 minutes for propagation

**After DNS setup:**
- Custom domain email: `noreply@collahub.online` ✅
- API accessible via: `api.collahub.online` ✅

---

### Expo EAS Build

Build the mobile app for Android (APK/AAB) or iOS (IPA).

**Setup:**
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Navigate to mobile app
cd UNIVERSITY-HUB-CODE/mobileApp

# Initialize EAS in project
eas build:configure
```

**`eas.json` configuration:**
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**`app.json` configuration:**
```json
{
  "expo": {
    "name": "COLLAहUB",
    "slug": "collahub",
    "version": "1.0.0",
    "orientation": "portrait",
    "android": {
      "package": "com.ayush.collahub",
      "versionCode": 1,
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-image-picker",
      [
        "expo-media-library",
        {
          "photosPermission": "Allow COLLAहUB to save ID cards to your gallery."
        }
      ]
    ]
  }
}
```

**Build commands:**
```bash
# Preview APK (for testing, install directly on Android)
eas build --platform android --profile preview

# Production AAB (for Google Play Store)
eas build --platform android --profile production

# iOS build (requires Apple Developer account)
eas build --platform ios --profile production

# Both platforms
eas build --platform all --profile production
```

**Submit to Play Store:**
```bash
eas submit --platform android
```

---

## 🔒 Security Implementation

### Authentication Security

```javascript
// JWT Configuration
ACCESS_TOKEN_EXPIRY   = "15m"    // Short-lived access token
REFRESH_TOKEN_EXPIRY  = "7d"     // Long-lived refresh token

// Password hashing (bcryptjs)
SALT_ROUNDS = 12                  // High security salt rounds

// OTP
OTP_LENGTH  = 6                   // 6-digit numeric OTP
OTP_EXPIRY  = 10 minutes          // OTP expires in 10 min
OTP_HASHED  = true                // OTP stored as bcrypt hash
```

### API Security

```javascript
// Trust proxy (required for Railway)
app.set("trust proxy", 1);

// Helmet.js headers
helmet({
  crossOriginResourcePolicy: false,  // Allow CDN images
  crossOriginOpenerPolicy:   false,  // Allow Expo web
  contentSecurityPolicy:     false,  // Allow Expo web scripts
})

// CORS (production)
const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.railway\.app$/,    // Railway domains
  "http://localhost:8081",           // Expo dev
  /^http:\/\/192\.168\.\d+\.\d+/,   // Local network
]

// Rate limiting
authLimiter:    10 requests / 15 min  // Login/OTP routes
adminLimiter:  500 requests / 15 min  // Admin routes
generalLimiter: 200 requests / 15 min  // All other routes
// Note: limiters skipped in development
```

### Database Security

```javascript
// MongoDB injection protection (manual)
// Removes keys starting with $ or containing .
// Compatible with Express 5 (req.query is read-only)

const sanitize = (obj) => {
  if (obj && typeof obj === "object") {
    Object.keys(obj).forEach(key => {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else {
        sanitize(obj[key]);
      }
    });
  }
};
```

### Role-Based Access Control

```javascript
// Middleware chain example
router.put("/:id/accept",
  verifyToken,   // Must be logged in
  isAdmin,       // Must be admin role
  async (req, res) => { ... }
);

// verifyToken — checks JWT validity
// isAdmin     — checks req.user.role === "admin" || "super-admin"
// isTeacher   — checks req.user.role === "teacher"
```

### Data Security Best Practices

- ✅ Passwords hashed with bcrypt (12 salt rounds)
- ✅ JWT secrets are 64-char random hex strings
- ✅ Refresh tokens stored in database (can be invalidated)
- ✅ `.env` excluded from Git repository
- ✅ MongoDB connection uses Atlas with IP whitelist
- ✅ Sensitive fields excluded from API responses (`-password -refreshToken -otp`)
- ✅ College-scoped data (admin sees only their college)
- ✅ Teacher sees only own subjects + shared classes

---

## 🖥 Frontend Architecture

### Navigation Structure (Expo Router)

```
app/
├── _layout.js           ← Root layout (no UI)
├── index.js             ← Landing page (role selection)
│
├── (auth)/              ← Auth group (no header)
│   ├── student-login.js
│   ├── teacher-login.js
│   └── admin-login.js
│
├── super-admin/         ← Super admin stack
├── admin/               ← Admin stack
├── teacher/             ← Teacher stack
└── student/             ← Student stack
```

### State Management

No external state management library (Redux/Zustand) is used. State is managed with:

- **React `useState`** — component-level state
- **React `useCallback` + `useFocusEffect`** — data fetching on screen focus
- **AsyncStorage** — persistent local data (tokens, user profile)
- **API interceptors** — automatic token refresh

### API Client (services/api.js)

```javascript
// Axios instance
const API = axios.create({
  baseURL: "https://collahub.up.railway.app",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor
// → Attaches accessToken to every request
// → Adds Cache-Control headers (prevent 304)

// Response interceptor
// → Catches 401 errors
// → Queues failed requests
// → Refreshes token ONCE
// → Retries all queued requests
// → On refresh failure → clears storage → redirects to login
```

### Component Patterns

```javascript
// Screen load pattern
useFocusEffect(useCallback(() => {
  loadData();
  return () => cleanup(); // optional
}, []));

// API call pattern
const loadData = async (isRefresh = false) => {
  try {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const res = await API.get("/endpoint");
    setData(res.data);
  } catch (e) {
    // silent fail or Alert
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};
```

---

## ⚙️ Backend Architecture

### Request Lifecycle

```
HTTP Request
  → Trust Proxy (Railway IP headers)
  → CORS check
  → Helmet headers
  → Rate limiter (route-specific)
  → Body parser (JSON, 10MB limit)
  → MongoDB sanitizer
  → Logger (method, path, status, time)
  → Cache-Control headers
  → Route handler
  → verifyToken middleware (if protected)
  → Role middleware (isAdmin / isTeacher)
  → Controller logic
  → MongoDB query
  → JSON response
  → Error handler (if uncaught)
```

### Route Organization

```javascript
// server.js — route mounting order
app.use("/auth",             authRoutes);           // Public
app.use("/admin",            adminRoutes);           // Admin only
app.use("/super-admin",      superAdminRoutes);      // Super Admin only
app.use("/students",         studentTeacherRoutes);  // Admin manages students
app.use("/teachers",         teacherManageRoutes);   // Admin manages teachers
app.use("/student",          studentRoutes);         // Student self-service
app.use("/teacher",          teacherRoutes);         // Teacher self-service
app.use("/user",             userRoutes);            // Any logged-in user
app.use("/subjects",         subjectRoutes);         // Subject catalog
app.use("/subject-requests", subjectRequestRoutes);  // Requests + timetable + sharing
app.use("/attendance",       attendanceRoutes);      // Attendance management
app.use("/timetable",        timetableRoutes);       // Timetable model
app.use("/assignments",      assignmentRoutes);      // Assignments
app.use("/submissions",      submissionRoutes);      // Submissions
app.use("/results",          resultRoutes);          // Results
app.use("/notices",          noticeRoutes);          // Notices
app.use("/api/posts",        postRoutes);            // Social feed
app.use("/notifications",    notificationRoutes);    // Notifications
app.use("/dashboard",        dashboardRoutes);       // Stats
app.use("/notes",            noteRoutes);            // Notes
app.use("/otp",              otpRoutes);             // OTP management
app.use("/biometric",        biometricRoutes);       // Gate biometric
app.use("/announcements",    announcementRoutes);    // Announcements
app.use("/leaves",           leaveRoutes);           // Leave requests
```

---

## ⚠️ Error Handling

### Backend Error Handler

```javascript
// middleware/errorHandler.js
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});
```

### Frontend Error Handling

```javascript
// API errors
try {
  const res = await API.post("/endpoint", data);
  // success
} catch (e) {
  Alert.alert("Error",
    e.response?.data?.message || // Server message
    e.message ||                  // Network error
    "Something went wrong"        // Fallback
  );
}
```

### Common Error Codes

| Status | Meaning | Common Cause |
|--------|---------|--------------|
| `400` | Bad Request | Missing required fields, validation error |
| `401` | Unauthorized | Invalid/expired token |
| `403` | Forbidden | Wrong role (student trying admin route) |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate entry (same subject request) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Server Error | Unexpected backend error |

---

## ⚡ Performance Optimizations

### Backend
- **MongoDB indexes** on frequently queried fields (teacherId, college, department, semester)
- **Selective field projection** — only fetch needed fields (`select("name email")`)
- **Pagination** on large lists (students, attendance records)
- **Cache-Control: no-store** — prevents stale 304 responses
- **Connection pooling** via Mongoose

### Frontend
- **`useFocusEffect`** — data fetches only when screen is focused
- **`RefreshControl`** — pull-to-refresh instead of polling
- **`FlatList`** — virtualized lists for large student/subject lists
- **`SafeImage`** — prevents crashes from invalid URIs
- **AsyncStorage caching** — user profile cached locally for instant load
- **30-second timeout** on API calls — prevents hanging requests

---

## 🗺 Known Issues & Roadmap

### Known Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| Email OTP via Gmail blocked on Railway | ⚠️ In Progress | OTP visible in Railway logs for dev |
| Resend DKIM validation pending | ⚠️ In Progress | Set DNS records in Hostinger |
| iOS build not tested | 📋 Planned | Android works fully |

### Roadmap

#### v1.1 (Next Release)
- [ ] Email OTP via Resend API (domain: collahub.online)
- [ ] Push notifications (Expo Notifications)
- [ ] Bulk student import (CSV upload)
- [ ] Attendance export to PDF/Excel
- [ ] Dark/Light theme toggle

#### v1.2
- [ ] iOS App Store release
- [ ] Parent portal (view child's attendance/results)
- [ ] Fee management module
- [ ] Library management integration
- [ ] Chat between teacher and student

#### v2.0
- [ ] AI-powered attendance insights
- [ ] Automated timetable generation
- [ ] Online exam module
- [ ] Video class integration

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
   ```bash
   # Click "Fork" on GitHub
   ```

2. **Clone** your fork
   ```bash
   git clone https://github.com/YOUR_USERNAME/UNIVERSITY-HUB-CODE.git
   cd UNIVERSITY-HUB-CODE
   ```

3. **Create** a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

4. **Make** your changes following the code style

5. **Test** your changes
   ```bash
   # Backend
   cd backend && node server.js
   
   # Frontend
   cd mobileApp && npx expo start
   ```

6. **Commit** with a descriptive message
   ```bash
   git commit -m "feat: add attendance export to PDF"
   # or
   git commit -m "fix: resolve token refresh race condition"
   ```

   **Commit message prefixes:**
   - `feat:` — new feature
   - `fix:` — bug fix
   - `docs:` — documentation update
   - `style:` — formatting, no logic change
   - `refactor:` — code restructure
   - `perf:` — performance improvement
   - `chore:` — build/config changes

7. **Push** to your fork
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Open** a Pull Request on GitHub

### Code Style Guidelines

- Use `const`/`let` (no `var`)
- Arrow functions for callbacks
- `async/await` over `.then()`
- Always handle errors with `try/catch`
- Use meaningful variable names
- Comment complex logic
- Keep components under 300 lines (split if larger)
- Extract reusable logic to separate files

---

## 📄 License

```
MIT License

Copyright (c) 2025 Ayush Tiwari

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👨‍💻 Developer

<div align="center">

**Ayush Tiwari**

[![GitHub](https://img.shields.io/badge/GitHub-Ayush--T--iwar--i-181717?style=for-the-badge&logo=github)](https://github.com/Ayush-T-iwar-i)

*Built with ❤️ for Indian colleges*

</div>

---

<div align="center">

### 🌟 If this project helped you, please give it a star!

[![Star on GitHub](https://img.shields.io/github/stars/Ayush-T-iwar-i/UNIVERSITY-HUB-CODE?style=social)](https://github.com/Ayush-T-iwar-i/UNIVERSITY-HUB-CODE)

**COLLAहUB — Connecting Colleges, Empowering Education**

</div>