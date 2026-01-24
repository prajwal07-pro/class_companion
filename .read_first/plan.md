
# CampusHub - Complete College Management Application

## Overview

Building a comprehensive campus management app called **CampusHub** with Firebase backend, dual authentication (Email/Password + Face Recognition), and all requested modules for students.

---

## Architecture

```text
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|   React Frontend +---->+  Firebase Auth    +---->+   Firestore DB   |
|   (Vite + TS)    |     |  (Email + Face)   |     |   (All Data)     |
|                  |     |                   |     |                  |
+--------+---------+     +-------------------+     +------------------+
         |
         |  Face Recognition
         v
+------------------+
|  face-api.js     |
|  (TensorFlow.js) |
|  Browser-based   |
+------------------+
```

---

## Dependencies to Install

| Package | Purpose |
|---------|---------|
| firebase | Auth, Firestore, Storage |
| face-api.js | Face detection and recognition |
| @tensorflow/tfjs | Required by face-api.js |
| leaflet + react-leaflet | Bus tracking map |

---

## Firebase Setup Requirements

You will need to provide the following Firebase config (from Firebase Console > Project Settings):

- apiKey
- authDomain
- projectId
- storageBucket
- messagingSenderId
- appId

These will be stored as public config since Firebase keys are meant to be public (security is handled by Firebase rules).

---

## Database Structure (Firestore)

### Collections

**users** - Student profiles
```
{
  id: string (Firebase UID)
  email: string
  name: string
  studentId: string
  department: string
  semester: number
  faceDescriptor: number[] (128-dim vector)
  profilePhoto: string (base64 or URL)
  createdAt: timestamp
}
```

**classes** - Live class status
```
{
  id: string
  subject: string
  teacher: string
  room: string
  status: "ON" | "OFF" | "SUBSTITUTE"
  substituteTeacher?: string
  timeSlot: string
  dayOfWeek: string
}
```

**attendance** - Attendance records
```
{
  id: string
  userId: string
  subjectId: string
  date: timestamp
  status: "present" | "absent"
}
```

**assignments** - Homework and submissions
```
{
  id: string
  title: string
  subject: string
  description: string
  dueDate: timestamp
  attachments: string[]
  submissions: [{userId, fileUrl, submittedAt}]
}
```

**buses** - Bus tracking
```
{
  id: string
  busNumber: string
  route: string
  currentLocation: {lat, lng}
  status: "MOVING" | "STOPPED"
  eta: string
}
```

**gatePasses** - Digital permission system
```
{
  id: string
  userId: string
  reason: string
  outTime: timestamp
  expectedReturn: timestamp
  status: "PENDING" | "APPROVED" | "REJECTED"
  approvedBy?: string
}
```

**events** - Career hub and events
```
{
  id: string
  title: string
  type: "hackathon" | "workshop" | "techfest" | "placement"
  date: timestamp
  venue: string
  description: string
  eligibility?: string
  registrationUrl?: string
}
```

**announcements** - News feed
```
{
  id: string
  title: string
  content: string
  priority: "normal" | "urgent"
  createdAt: timestamp
}
```

**complaints** - Digital complaint box
```
{
  id: string
  userId: string
  category: "infrastructure" | "academic" | "ragging" | "other"
  description: string
  status: "submitted" | "in-review" | "resolved"
  createdAt: timestamp
}
```

---

## Application Structure

### Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/auth` | AuthPage | Login + Signup with Face |
| `/auth/register-face` | FaceRegistration | First-time face capture |
| `/` | Dashboard | Main hub with quick stats |
| `/classes` | ClassStatus | Live class tracker |
| `/attendance` | AttendanceMonitor | Subject-wise attendance |
| `/timetable` | Timetable | Dynamic daily schedule |
| `/assignments` | AssignmentHub | Homework and submissions |
| `/bus-tracking` | BusTracking | Live GPS map |
| `/gate-pass` | GatePass | Request permissions |
| `/events` | EventsHub | Hackathons, placements |
| `/announcements` | NewsFeed | Campus news |
| `/complaints` | ComplaintBox | Private grievance system |
| `/chat` | AIChat | AI assistant |
| `/profile` | Profile | User settings |

### Component Hierarchy

```text
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── FaceCapture.tsx
│   │   └── FaceLogin.tsx
│   ├── dashboard/
│   │   ├── QuickStats.tsx
│   │   ├── TodaySchedule.tsx
│   │   └── RecentAnnouncements.tsx
│   ├── academic/
│   │   ├── ClassCard.tsx
│   │   ├── AttendanceChart.tsx
│   │   ├── SubjectProgress.tsx
│   │   └── AssignmentCard.tsx
│   ├── logistics/
│   │   ├── BusMap.tsx
│   │   ├── BusCard.tsx
│   │   └── GatePassForm.tsx
│   ├── career/
│   │   ├── EventCard.tsx
│   │   └── PlacementCard.tsx
│   ├── communication/
│   │   ├── ChatInterface.tsx
│   │   ├── AnnouncementCard.tsx
│   │   └── ComplaintForm.tsx
│   └── layout/
│       ├── AppSidebar.tsx
│       ├── TopNav.tsx
│       └── MobileNav.tsx
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useFaceDetection.ts
│   ├── useClasses.ts
│   ├── useAttendance.ts
│   └── useBuses.ts
├── lib/
│   ├── firebase.ts
│   └── faceApi.ts
└── pages/
    └── [All pages listed above]
```

---

## Authentication Flow

### Two-Step Authentication Process

**Step 1: Email/Password Verification**
```text
User enters email + password
        │
        v
Firebase Auth validates credentials
        │
        v
If valid → Proceed to Step 2
If invalid → Show error
```

**Step 2: Face Verification**
```text
Activate webcam
        │
        v
Capture face with face-api.js
        │
        v
Extract 128-dimension descriptor
        │
        v
Compare with stored descriptor (Euclidean distance)
        │
        v
If match (< 0.6 threshold) → Login success
If no match → Deny access
```

### First-Time Registration Flow
```text
Sign up with email/password
        │
        v
Firebase creates account
        │
        v
Redirect to /auth/register-face
        │
        v
Capture face photo
        │
        v
Extract face descriptor
        │
        v
Store descriptor + photo in Firestore
        │
        v
Redirect to dashboard
```

---

## Feature Implementation Details

### 1. Live Class Status Tracker

- Real-time Firestore listener on `classes` collection
- Color-coded status badges (Green=ON, Red=OFF, Yellow=Substitute)
- Filter by current day and time
- Push notification option for status changes

### 2. Smart Attendance Monitor

- Calculate percentage: `(present / total) * 100`
- Zone System:
  - Green Zone: 85%+ (Safe)
  - Yellow Zone: 75-85% (Warning)
  - Red Zone: Below 75% (Danger)
- Visual progress bars with Recharts
- Subject-wise breakdown cards

### 3. Dynamic Daily Timetable

- Auto-filter based on `new Date().getDay()`
- Highlight current time slot
- 15-minute reminder before next class
- Swipe between days on mobile

### 4. Assignment Hub

- List view with due date countdown
- Upload submissions to Firebase Storage
- Download attached resources
- Filter: Pending, Submitted, Overdue

### 5. Bus Tracking

- Leaflet map with custom bus markers
- Real-time location updates from Firestore
- ETA calculation based on route
- Status indicators (Moving/Stopped)

### 6. Gate Pass System

- Form: Reason + Out time + Expected return
- Real-time status updates
- History of past requests
- QR code generation for approved passes

### 7. Career & Events Hub

- Tabbed interface: Hackathons | Workshops | Placements
- Event cards with registration links
- Eligibility criteria display
- Calendar integration option

### 8. AI Chat Assistant

- Lovable AI integration for 24/7 support
- Context-aware responses about:
  - Schedules and timetables
  - Exam dates
  - Campus rules
  - General queries

### 9. News Feed

- Priority-based sorting (urgent first)
- Push notifications for urgent items
- Read/unread status tracking
- Category filters

### 10. Complaint Box

- Anonymous option available
- Category selection
- Status tracking
- Admin response display

---

## UI/UX Design

### Color Palette

- Primary: Deep Blue (#1e40af)
- Secondary: Teal (#0d9488)
- Success/Safe: Green (#22c55e)
- Warning: Amber (#f59e0b)
- Danger: Red (#ef4444)
- Background: Slate (#f8fafc)

### Mobile-First Responsive Design

- Bottom navigation bar on mobile
- Collapsible sidebar on desktop
- Touch-friendly cards and buttons
- PWA-ready structure

---

## Implementation Phases

### Phase 1: Foundation
1. Firebase configuration and initialization
2. Authentication context and hooks
3. Face-api.js setup with models
4. Basic layout and navigation

### Phase 2: Authentication
5. Login form with email/password
6. Signup form with validation
7. Face capture component
8. Face login verification
9. Auth state management

### Phase 3: Academic Features
10. Dashboard with stats
11. Class status tracker
12. Attendance monitor with charts
13. Dynamic timetable
14. Assignment hub with uploads

### Phase 4: Logistics
15. Bus tracking map
16. Gate pass request system

### Phase 5: Communication
17. AI chat assistant
18. Announcements feed
19. Complaint box

### Phase 6: Career & Polish
20. Events and placements hub
21. Profile management
22. Final UI polish and testing

---

## Technical Notes

### Face Recognition Implementation

- Using face-api.js (TensorFlow.js based)
- Models loaded from CDN or local `/public/models`
- Browser-based processing (no server needed)
- Face descriptor stored as 128-dimension float array
- Matching uses Euclidean distance with 0.6 threshold

### Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /classes/{classId} {
      allow read: if request.auth != null;
    }
    // Similar rules for other collections
  }
}
```

### Required Face-API Models

- ssd_mobilenetv1 (face detection)
- face_landmark_68 (facial landmarks)
- face_recognition (descriptor extraction)

These will be downloaded to `/public/models/` folder.

---

## Next Steps After Approval

1. You will need to provide your Firebase configuration
2. I will set up the entire project structure
3. All features will be implemented as described
4. Seed data will be added for testing

---

## Summary

This plan creates a complete campus management application with:
- Secure dual authentication (Password + Face)
- All 10 requested feature modules
- Real-time updates via Firestore
- Mobile-responsive design
- AI-powered chat assistant
- Clean, intuitive user interface

The application will be fully functional with Firebase as the backend, storing all user data including face recognition descriptors.
