# CollaHub

Production-oriented college management platform with:

- Mobile app (`Expo` / `React Native`) for Android, iOS, and Web
- Backend API (`Node.js` / `Express`) with MongoDB
- Role-based access for Student, Teacher, Admin, and Super Admin
- OTP-based login, attendance, timetable, assignments, announcements, and profile management

---

## Tech Stack

- **Mobile:** Expo SDK 54, React Native, Expo Router, Axios
- **Backend:** Node.js, Express, Mongoose, JWT, bcrypt
- **Database:** MongoDB Atlas
- **Storage:** Cloudinary (media uploads)
- **Email:** Resend (OTP and transactional email)
- **Security:** Helmet, CORS policy, rate limiting, role guards

---

## Project Structure

```text
collageAtt/
├── mobileApp/         # Expo app
│   ├── app/           # Route-based screens by role
│   ├── services/      # API client and utilities
│   └── app.json       # Expo app config
└── backend/           # Express API
    ├── config/        # DB and third-party config
    ├── controllers/   # Route handlers
    ├── middleware/    # Auth, errors, validation, logging
    ├── models/        # Mongoose schemas
    ├── routes/        # API route modules
    └── server.js      # API entrypoint
```

---

## Core Features

### Student
- Login with OTP verification
- Dashboard, profile, digital ID card
- Attendance view and detailed history
- Notes and assignments workflow
- Timetable and notifications

### Teacher
- OTP login and profile
- Timetable viewing
- Attendance marking
- Notes and assignment publishing
- Student list and communication workflows

### Admin
- Manage students, teachers, subjects
- Timetable and room scheduling
- Attendance monitoring
- Notices and administrative operations

### Super Admin
- Cross-college monitoring and control
- Announcements and governance tools
- System-wide user and data management

---

## Backend Security Controls

- JWT access + refresh token flow
- Role-based middleware (`student`, `teacher`, `admin`, `super-admin`)
- OTP verification before login completion
- Request rate limiting
- Helmet security headers
- CORS allow-list rules
- Input sanitization against Mongo-style operator injection

---

## Prerequisites

- Node.js 18+ (Node 22 recommended)
- npm 9+
- MongoDB Atlas database
- Resend API key
- Cloudinary credentials
- Expo CLI / EAS CLI

---

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_long_access_secret
JWT_REFRESH_SECRET=your_long_refresh_secret

RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=CollaHub <onboarding@resend.dev>

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

> Keep `.env` private. Never commit secrets.

---

## Local Development

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Expected health endpoints:

- `GET /`
- `GET /health`

### 2) Mobile App

```bash
cd mobileApp
npm install
npx expo start --clear
```

Then run:

- `a` for Android emulator
- `w` for web
- QR scan for Expo Go

---

## API Base URL (Mobile)

Update `mobileApp/services/api.js` as needed:

- Keep Railway URL for production/staging
- Use local/dev network host for device testing

The API client includes:

- Bearer token attachment interceptor
- Automatic refresh token retry on 401
- Temporary interruption retry for transient traffic/server errors

---

## Build and Release

### Android Export (local bundle sanity check)

```bash
cd mobileApp
npx expo export --platform android
```

### EAS Build Profiles

`mobileApp/eas.json` supports:

- `development` (internal APK)
- `preview` (internal APK)
- `production` (AAB)
- `production-apk` (internal APK for direct install testing)

### Build Production APK

```bash
cd mobileApp
npx eas build --platform android --profile production-apk
```

### Build Production AAB (Play Store)

```bash
cd mobileApp
npx eas build --platform android --profile production
```

---

## Deployment Checklist

- [ ] All backend env vars set in hosting platform
- [ ] MongoDB network access and credentials validated
- [ ] Resend sender/domain configured
- [ ] Cloudinary credentials validated
- [ ] CORS origins restricted to production domains
- [ ] OTP and auth flows tested on real devices
- [ ] Critical role routes tested with real accounts
- [ ] Android release build installs and launches successfully

---

## Troubleshooting

### `expo` / bundler spawn permissions on Windows
- Re-run with elevated permission or outside restricted sandbox
- Clear Metro cache: `npx expo start --clear`

### EAS build blocked by VCS checks
- Ensure Git is installed and available in PATH
- If required for CI-only contexts, set `EAS_NO_VCS=1`

### OTP not delivered
- Verify `RESEND_API_KEY`
- Verify sender/domain setup in Resend
- Check backend logs for send failures

### API connectivity failures on device
- Confirm backend is reachable on same network
- Verify base URL in `mobileApp/services/api.js`

---

## Notes

- This repository contains both application layers and is intended for coordinated full-stack development.
- For production, prioritize strict secrets handling, domain-restricted CORS, and release signing hygiene.

