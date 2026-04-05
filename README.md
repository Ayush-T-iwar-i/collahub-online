<div align="center">

# 🎓 COLLAहUB
### Smart College Management Platform

**One Nims One World**

[![React Native](https://img.shields.io/badge/React_Native-Expo_SDK_52-0ea5e9?style=for-the-badge&logo=react)](https://expo.dev)
[![Node.js](https://img.shields.io/badge/Node.js-v22-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com)
[![Express](https://img.shields.io/badge/Express.js-MVC-000000?style=for-the-badge&logo=express)](https://expressjs.com)

*A full-stack mobile + web application for managing college operations — built for NIMS University, Jaipur*

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Screenshots & UI](#-screenshots--ui-showcase)
- [Features by Role](#-features-by-role)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Authentication Flow](#-authentication-flow)
- [Timetable System](#-timetable--subject-request-system)
- [Security](#-security)
- [Roadmap](#-known-issues--roadmap)

---

## 🌟 Overview

**CollaHub** is a production-grade college management system built with React Native (Expo) and Node.js. It supports **4 user roles** across **20+ NIMS colleges** and handles everything from student enrollment to timetable management, attendance tracking, assignment submission, and real-time announcements.

The app runs natively on **Android, iOS, and Web** from a single codebase.

| | |
|---|---|
| **University** | NIMS University, Jaipur, Rajasthan |
| **Developer** | Ayush Tiwari |
| **Version** | 1.0.0 — April 2026 |
| **Platform** | Android · iOS · Web (Expo) |
| **Database** | MongoDB Atlas (`collegeAttendance`) |

---

## 📱 Screenshots & UI Showcase

> Dark-themed UI with electric blue and teal accents throughout. All screens use `#080d17` base with glassmorphism-style cards.

---

### 🚀 Splash / Welcome Screen

The app opens with a branded splash on a dark navy gradient:
- **COLLAहUB** logo in electric blue with graduation cap icon
- Tagline: *"Smart College Management Platform"*
- Role selection hint
- "Secure · Fast · Reliable" footer

---

### 🔐 Login & OTP Screens

**Login screen** features:
- Email + password inputs with animated focus borders (purple highlight)
- Eye toggle for password visibility
- "Forgot Password?" link
- Role chips (Student · Teacher · Admin · Super Admin)
- Gradient "Continue" button

**OTP Verification** — after login:
- 6 animated input boxes for the OTP code
- 10-minute countdown timer
- "Resend OTP" option
- OTP delivered to registered email

---

### 🎓 Student Portal

#### My Subjects Screen
```
URL: /student/my-subjects
```
Two-tab layout:
| Tab | Content |
|---|---|
| **Subjects** | All admin-assigned subjects with code badge, type pill (Theory/Lab/Both), semester, credits |
| **Timetable** | Admin-assigned schedule with day, time, and room number |

Subject cards show:
- Color-coded subject code badge (department color)
- **THEORY** (blue) / **LAB** (green) / **BOTH** (purple) type pill
- Semester badge and credit count
- "Active — timetable assigned by admin" status

#### Student Profile & Digital ID Card
```
URL: /student/profile
```
- Circular avatar with camera upload button
- Student name · ID number · Role badge
- Stats bar: **Semester 2 · CSE 2026 · Year 2026**
- Academic progress card
- Department and college chips
- **Digital Student ID Card** showing:
  - College name + logo
  - Student photo
  - Full name, ID (`#2026-CSE-001`), department, email, section, batch

#### Attendance Screen
- Per-subject percentage bars
- Present / Absent / Total class counts
- Monthly calendar view

#### Notes Screen
- Files shared by teacher (PDF, image, doc)
- File type icon + download button
- Upload timestamp

#### Assignments Screen
- Active assignments with deadline countdown
- Submit button with file attachment
- Grade display after teacher marks

---

### 👨‍🏫 Teacher Portal

#### My Timetable
```
URL: /teacher/timetable
```
- Stats strip: **Total Classes · Today · Active Days**
- Day tabs (Mon–Sat) with class count badge
- Timeline-style class cards showing:
  - Subject name + code tag
  - Time range (9:15 AM – 10:00 AM)
  - Department · Sem · Section · Batch
  - **Room badge** (LT-1, Lab-3)
- "Admin Assigned" shield badge
- Empty state with explanation

#### Mark Attendance
```
URL: /teacher/mark-attendance
```
- Subject cards with Theory/Lab/Both type badge
- For **Both** type: two tabs (📚 Theory · 🧪 Lab) with separate attendance
- Student list with toggle buttons (Present / Absent)
- Section and batch context chips
- Submit with loading state

#### Students Screen
- Department-filtered automatically
- Semester filter chips
- Search by name, ID, email
- Tap for full profile modal
- Direct email and phone call buttons

#### Assignments Screen
- Create assignment: subject selector, description, file attachment, deadline
- View submissions count per assignment
- Grade individual students

---

### 🛡️ Admin Portal

#### Dashboard
```
URL: /admin/dashboard
```
Stats cards (college-scoped):
- Total Students · Total Teachers · Total Subjects
- Pending Subject Requests badge
- Quick navigation cards

#### Manage Students
```
URL: /admin/manage-students
```
The entire screen scrolls as one unit (header + filters + list):

**Filters** (step-by-step):
1. Admission Year chips (2021–2026)
2. Course/Department chips (college-specific)
3. Semester chips (1–8)

**Features:**
- Search by name, email, student ID
- Active filter pills with Reset button
- **Update Semester** (batch) button
- **Assign Section** (batch) button
- **Excel Import** — preview with valid/invalid count, import 25/batch with progress ring
- **Add Student** modal with year → department → form flow
- Delete with confirmation dialog

Student cards show: Name · Student ID · Sem · Section · Batch · Department

#### Manage Teachers
```
URL: /admin/manage-teachers
```
- Department filter chips (college-specific)
- Search bar
- Add teacher with:
  - Auto-generated Teacher ID (e.g., `2026-TEC-483`) with regenerate button
  - Name · Email · Password · Phone
  - Department selector from college-specific list
- Teacher cards: Name · Department · Teacher ID · Email

#### Manage Subjects
```
URL: /admin/manage-subjects
```
**Wizard-based creation (4 steps):**
1. Select Department
2. Select Semester
3. How many subjects? (quick chips 1–8 or type)
4. Enter details for each: Name · Code · Type (Theory/Lab/Both) · Credits

**Excel bulk import** also supported with column preview.

Subject list filterable by department and semester.

#### Subject Requests — 4-Step Modal
```
URL: /admin/subject-requests
```
When admin clicks "Accept & Set Timetable" on a teacher's request:

**Step 1 — Subject Type**

Three large cards:
| Type | Room | Duration |
|---|---|---|
| 📚 Theory | Lecture Theater (LT) | 45 min per class |
| 🧪 Lab | Lab Room | 90 min per session |
| 📋 Theory + Lab | LT + Lab | Both assigned |

**Step 2 — Select Free Time Slots**

Color-coded time grid with day tabs (Mon–Sat):
- 🟢 **Green** = Teacher AND students free → selectable
- 🔴 **Red + dimmed** = Teacher busy → hard blocked (shows subject name)
- 🟠 **Orange + dimmed** = Students of this batch have class → hard blocked
- Day tab badges show selected count and busy count
- "X truly free slots on [Day]" counter
- Lunch break indicator (12:50–1:50 PM)
- Duration badge on each slot (45m / 90m)

**Step 3 — Assign Rooms (Day-wise)**

Per-day, per-slot room chips:
- Theory → only Lecture Theater rooms shown
- Lab → only Lab rooms shown
- Both → LT section + Lab section side by side
- Booked rooms: RED with "Booked" label, disabled
- Free rooms: selectable with colored highlight on selection

**Step 4 — Review & Confirm**

Full schedule summary:
- Subject type badge
- Teacher name
- Per-day schedule with time + room badges
- "Accept & Assign to Teacher" green gradient button

#### Room Timetable
```
URL: /admin/room-timetable
```
- Room cards with type icons (Lecture / Lab / Theater / Seminar / Other)
- Capacity and building info
- Classes/week counter
- Tap room → view full day-by-day timetable
- Conflict detection tab showing double-bookings
- Add/Edit room modal

---

### 👑 Super Admin Portal

#### All Students
```
URL: /super-admin/students
```
System-wide list (1571+ students shown):
- College filter chips (All Colleges · per college)
- Search by name, ID, department
- Infinite scroll (20 per page)
- Color-coded avatar initials
- Student ID · Department · Section · Semester badges
- Delete any student from any college

#### All Teachers
Same pattern — cross-college teacher management.

#### All Subjects
```
URL: /super-admin/subjects
```
- **Theory / Lab / All** type filter buttons with icons
- College filter chips
- Subject code box, type pill, department + semester tags
- 300+ subjects visible at once

#### Analytics
System-wide statistics dashboard.

#### Announcements
Broadcast announcements across all colleges.

---

## ✨ Features by Role

### 👑 Super Admin
- View all students, teachers, subjects across all 20+ NIMS colleges
- Delete any user system-wide
- Broadcast announcements
- System analytics (users, subjects, attendance)
- Manage all admin accounts
- System maintenance mode (only super admin can access during shutdown)

### 🛡️ Admin *(College-scoped)*
- Student management: individual add + bulk Excel import (25/batch with progress)
- Teacher management with department assignment
- Subject management: wizard creation + Excel import
- **4-step subject request approval** with 3-layer conflict detection
- Room management: LT and Lab rooms, occupancy view
- Batch operations: semester update, section assignment
- View attendance records

### 👨‍🏫 Teacher *(Department-scoped)*
- Send subject requests specifying batch, section, semester
- View admin-assigned timetable with room numbers
- Mark attendance — Theory and Lab separately for "Both" type subjects
- Create assignments, grade student submissions
- Upload notes and documents
- View department-filtered student list
- Post announcements

### 🎓 Student
- Register with email OTP verification
- View admin-assigned timetable with room numbers
- Track attendance percentage per subject
- Submit assignments, view grades
- Download teacher-shared notes
- Edit profile with photo upload (Cloudinary)
- Digital Student ID Card
- View college announcement feed

---

## 🛠️ Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React Native + Expo | SDK 52, file-based routing |
| **Navigation** | Expo Router v4 | Drawer + tabs + stack |
| **Backend** | Node.js + Express | v22, full MVC architecture |
| **Database** | MongoDB Atlas | Mongoose ODM, cloud-hosted |
| **Auth** | JWT + bcrypt | Access 15min · Refresh 7d |
| **2FA** | Email OTP | 6-digit · 10min · DB-persisted |
| **Email** | Nodemailer + Gmail | App Password SMTP |
| **Storage** | Cloudinary | Profile photos, attachments |
| **Security** | Helmet.js | Full HTTP security headers |
| **Rate Limit** | express-rate-limit | Brute-force protection |
| **HTTP Client** | Axios | Auto refresh token interceptor |
| **Excel** | xlsx (SheetJS) | Bulk import for students + subjects |
| **Icons** | Expo Vector Icons | Ionicons throughout |
| **Safe Area** | react-native-safe-area-context | Status bar on all phones |

---

## 📁 Project Structure

```
collageAtt/
├── backend/
│   ├── config/db.js                     # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js            # Login, OTP, register, refresh
│   │   ├── adminController.js           # Student/teacher CRUD, bulk import
│   │   ├── dashboardController.js       # Role-aware stats
│   │   ├── subjectRequestController.js  # Timetable + conflict detection
│   │   └── superAdminController.js
│   ├── middleware/
│   │   ├── authMiddleware.js            # JWT verify + role guards
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js                      # All roles in one model
│   │   ├── SubjectRequest.js            # Requests + timetable data
│   │   ├── Room.js                      # LT / Lab rooms
│   │   ├── Attendance.js
│   │   └── Assignment.js
│   ├── routes/                          # One router per domain
│   ├── .env                             # ⚠️ Never commit
│   ├── .env.example                     # Safe template
│   └── server.js
│
└── mobileApp/
    ├── app/
    │   ├── (auth)/                      # Login, register, OTP
    │   ├── admin/
    │   │   ├── subject-requests.js      # 4-step timetable modal
    │   │   ├── manage-students.js       # Excel import + filters
    │   │   ├── manage-teachers.js
    │   │   ├── manage-subjects.js       # Wizard creation
    │   │   └── room-timetable.js
    │   ├── teacher/
    │   │   ├── mark-attendance.js       # Theory/Lab dual tabs
    │   │   └── timetable.js
    │   ├── student/
    │   │   ├── my-subjects.js
    │   │   ├── profile.js               # Digital ID card
    │   │   └── attendance.js
    │   └── super-admin/
    │       ├── students.js
    │       ├── teachers.js
    │       └── subjects.js
    └── services/
        └── api.js                       # Axios + auto token refresh
```

---

## 🚀 Getting Started

### Prerequisites

```
Node.js v18+          (v22 recommended)
npm v9+
Expo CLI              npm install -g expo-cli
MongoDB Atlas         free tier works
Gmail App Password    Google Account → Security → 2FA → App Passwords
Cloudinary account    free tier works
```

### 1. Clone

```bash
git clone https://github.com/yourusername/collahub.git
cd collahub
```

### 2. Backend

```bash
cd backend
npm install
# Create .env (see section below)
nodemon server.js
# → Server running on port 5000
# → Database Connected
```

### 3. Mobile App

```bash
cd mobileApp
npm install
npx expo start --clear
# w → web browser
# a → Android emulator
# Scan QR → Expo Go on phone
```

### 4. Running on Real Phone

```bash
# Windows — find your IP:
ipconfig
# Look for "IPv4 Address" under Wi-Fi
```

Update `mobileApp/services/api.js`:
```javascript
const REAL_DEVICE_IP = "192.168.x.x";  // your PC's actual IP
```

> Phone and PC must be on the **same Wi-Fi**. Update this IP whenever you change networks.

---

## 🔐 Environment Variables

`backend/.env` — never commit this file:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/collegeAttendance

# JWT (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=60_plus_chars_random_string
JWT_REFRESH_SECRET=different_60_plus_chars_string

# Gmail App Password
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

PORT=5000
NODE_ENV=development
```

---

## 📡 API Reference

### Auth (`/auth`)

| Method | Endpoint | Auth |
|---|---|---|
| POST | `/auth/login` | None |
| POST | `/auth/login-verify-otp` | None |
| POST | `/auth/refresh-token` | Refresh token in body |
| POST | `/auth/logout` | Bearer token |
| POST | `/auth/register` | None |
| POST | `/auth/forgot-password` | None |
| POST | `/auth/reset-password` | None |

### Admin (`/admin`) — Admin token required

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/students` | List (filter: year, dept, sem) |
| POST | `/admin/add-student` | Add one student |
| POST | `/admin/bulk-add-students` | Bulk import array |
| DELETE | `/admin/students/:id` | Remove student |
| GET | `/admin/teachers` | List teachers |
| POST | `/admin/add-teacher` | Add teacher |
| PUT | `/admin/update-batch-semester` | Batch update |
| PUT | `/admin/assign-section` | Batch assign |

### Subject Requests (`/subject-requests`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/subject-requests` | All (filter: status) |
| POST | `/subject-requests` | Teacher creates |
| PUT | `/:id/accept` | Admin accepts + timetable |
| PUT | `/:id/reject` | Admin rejects |
| GET | `/teacher-timetable` | Teacher's schedule |
| GET | `/student-timetable` | Student's schedule |

---

## 🔑 Authentication Flow

```
User enters email + password
         ↓
Backend verifies credentials
         ↓
Generates 6-digit OTP → saves to MongoDB (expires 10 min)
         ↓
Sends OTP email via Gmail
         ↓
User enters OTP
         ↓
Backend verifies, clears OTP from DB
         ↓
Issues Access Token (15 min) + Refresh Token (7 days)
         ↓
Tokens stored in AsyncStorage on device
```

**Auto-refresh:** When any request returns 401, the Axios interceptor automatically calls `/auth/refresh-token`, saves the new access token, and retries the original request. If the refresh token is also expired, all local storage is cleared and the user is redirected to login.

---

## 📅 Timetable & Subject Request System

### Class Schedule

| Period | Start | End | Duration |
|---|---|---|---|
| Period 1 | 9:15 AM | 10:00 AM | 45 min |
| Period 2 | 10:10 AM | 10:55 AM | 45 min |
| Period 3 | 11:05 AM | 11:50 AM | 45 min |
| Period 4 | 12:00 PM | 12:45 PM | 45 min |
| 🍽️ Lunch | 12:50 PM | 1:50 PM | 60 min |
| Period 5 | 1:50 PM | 2:35 PM | 45 min |
| Period 6 | 2:45 PM | 3:30 PM | 45 min |
| Period 7 | 3:40 PM | 4:25 PM | 45 min |

Lab sessions (90 min): 9:15–10:45 · 10:55–12:25 · 1:50–3:20 · 3:30–5:00

### Conflict Detection (3 Layers)

```
1. Teacher Conflict
   → Same teacher assigned elsewhere at same time
   → Slot turns RED, cannot be selected
   → Backend also validates and returns 400

2. Batch/Student Conflict
   → Same semester + year + section has another class
   → Slot turns ORANGE, cannot be selected
   → Backend also validates and returns 400

3. Room Conflict
   → Same room double-booked (college-scoped)
   → Room chip turns RED with "Booked" label
   → Backend also validates and returns 400
```

All three conflicts are checked on both frontend (prevents selection) and backend (final safety net).

---

## 🔒 Security

### Protections in Place

| Threat | Defence | Implementation |
|---|---|---|
| Brute force login | Rate limiting | 10 req/15min on `/auth` and `/otp` |
| Password theft | bcrypt hashing | Salt rounds: 10, never stored plain |
| Token forgery | Strong JWT secrets | 60+ char random hex, stored in `.env` |
| Long session exposure | Short access token | Expires in 15 minutes |
| XSS / Header injection | Helmet.js | Full security header set |
| Cross-origin requests | CORS whitelist | Dev: localhost + LAN IPs only |
| Cross-college data access | College scoping | Admin's college fetched from DB, not body |
| Unauthorized route access | Role guards | `isAdmin`, `isTeacher`, `isStudent`, `isSuperAdmin` |
| Account takeover | Email OTP 2FA | Required on every single login |
| Token reuse after logout | DB refresh token | Cleared from MongoDB on logout |
| OTP loss on restart | DB-persisted OTP | OTP stored in MongoDB, not memory |

### Rate Limiting

```javascript
Auth routes:    10 requests per 15 minutes  (login, OTP)
Admin routes:  500 requests per 15 minutes
All others:    200 requests per 15 minutes
```

### Role Guards

```javascript
// Every protected route has explicit role check:
router.get("/students",  verifyToken, isAdmin,   getStudents);
router.post("/attend",   verifyToken, isTeacher, markAttendance);
router.get("/dashboard", verifyToken, isStudent, studentDashboard);
router.get("/all",       verifyToken, isSuperAdmin, getAllUsers);
```

### ⚠️ Before Going to Production

```
[ ] Replace CORS origin: "*" with your actual domain
[ ] Install express-mongo-sanitize (NoSQL injection protection)
[ ] Remove or protect /admin/login-direct (OTP bypass route)
[ ] Enforce HTTPS on server — tokens travel in plaintext over HTTP in dev
[ ] Authenticate /uploads file access (currently publicly accessible by URL)
[ ] Sanitize all user input fields for XSS strings
[ ] Rotate all secrets: MongoDB password, Gmail App Password, Cloudinary key, JWT secrets
```

---

## 🛣️ Known Issues & Roadmap

### Security Fixes Needed (Production)
- CORS wildcard `origin: "*"` in `server.js`
- No `express-mongo-sanitize` installed
- `/uploads` folder served publicly without auth

### Pending Features
- Push notifications (Expo Notifications API)
- Fee management module
- Library management module
- Online exam / quiz system
- Parent portal
- Biometric attendance integration
- Production deployment (Railway backend + EAS mobile build)

### Development Fixes Needed
- Add `npm install streamifier` in backend
- Set `NODE_ENV=production` before deploying

---

## 💻 Quick Commands

```bash
# Run backend
cd backend && nodemon server.js

# Run mobile app
cd mobileApp && npx expo start --clear

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Kill stuck port (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Troubleshooting

| Problem | Solution |
|---|---|
| CORS error on web | Add `localhost:8082` to CORS list in `server.js` |
| API fails on phone | Update `REAL_DEVICE_IP` in `api.js` to your PC's IP |
| OTP not arriving | Check `EMAIL_PASS` in `.env` — must be Gmail App Password |
| Metro bundler stuck | `npx expo start --clear` |
| useSafeAreaInsets error | Wrap app in `<SafeAreaProvider>` |
| Port already in use | `netstat -ano \| findstr :5000` → `taskkill /PID X /F` |

---

<div align="center">

**Built with ❤️ by Ayush Tiwari**

*NIMS University, Jaipur, Rajasthan, India — 2026*

</div>