# EduVid — Full Platform Roadmap

_Dominion University Peer-to-Peer Learning Platform_

---

## Current State

- Vue 3 frontend with Home, Login, Register, Upload, Admin pages
- Express backend: YouTube Data API upload, Firebase Auth token verification
- Firestore: `videos` collection with title, status, userId, videoId, views

---

## Phase 1 — Authentication & Onboarding

### What to build

- **Google OAuth 2.0** login button on Login/Register pages (Firebase `signInWithPopup`)
- **Extended registration form**: Matric Number, Department (dropdown), Level (100–500)
- **Firestore `users` collection**: stores `uid`, `email`, `name`, `matricNumber`, `department`, `level`, `role: "student" | "admin"`, `isVerified`
- **Landing page**: Hero section with Dominion University branding, feature highlights, CTA

### Backend changes

- `/api/users/:uid` GET endpoint (fetch user profile)
- `/api/users/:uid` PATCH endpoint (update profile)

---

## Phase 2 — Course Catalog & Discovery

### What to build

- ✅ **Firestore `courses` collection**: `code` (e.g. SEN 401), `title`, `department`, `level`, `description`
- ✅ **Seed data**: initial course list
- ✅ **Course Catalog page** (`/courses`): grouped by Department, then Level
- ✅ **Individual Course Page** (`/courses/:code`): lists all videos tagged to that course
- ✅ **Home Feed**: show trending (by views) and recent videos (toggle added)
- ✅ **Search**: filter by `courseCode`, `topic`, `department` (expanded from title/description)
- ✅ Maintain `videoCount` on course documents when videos are added/deleted

### Firestore `videos` schema additions

```
courseCode: "SEN 401"
department: "Software Engineering"
level: 400
topic: "Operating Systems"
```

---

## Phase 3 — Video Playback & Peer Interaction

### What to build

- **Video Playback page** (`/watch/:id`): full YouTube IFrame embed + metadata
- **Comments** — `videos/{id}/comments` subcollection: `text`, `userId`, `userEmail`, `createdAt`
- **Clarity Rating** — per-video `ratings` subcollection or aggregated `avgRating` field (1–5 stars)
- **Flagging Tool** — `flag` button writes to `videos/{id}/flags` subcollection with `reason`, `userId`, `createdAt`. Sets `isFlagged: true` on the video doc.

---

## Phase 4 — Upload Studio & Contributions

### What to build

- **Upload Studio** (`/upload`): add mandatory metadata fields — Course Code (dropdown), Level, Topic
- **My Contributions** (`/my-videos`): lists videos where `userId === currentUser.uid`, shows status, flags, ratings
- **Profile Settings** (`/profile`): edit Name, Matric Number, Department

### Backend changes

- Accept `courseCode`, `level`, `department`, `topic` in `/api/upload` body
- Save them to Firestore on the video document

---

## Phase 5 — Admin Governance

### What to build

- **Moderation Queue** in Admin dashboard: all videos where `isFlagged === true`; display reasons; "Retain" or "Delete" actions
- **Course Management**: admin UI to add/edit courses in the `courses` collection
- **User Management**: table of all users, ability to set `role: "admin"`, verify matric numbers (`isVerified: true`)
- **Admin-only route guard**: check `role === "admin"` from Firestore, not just authentication

---

## Execution Order

| Priority | Phase                                                                | Effort |
| -------- | -------------------------------------------------------------------- | ------ |
| 1        | **Auth** — Google OAuth + Matric/Dept registration                   | Medium |
| 2        | **Courses** — Firestore schema + Catalog + Course pages              | Medium |
| 3        | **Playback** — Watch page + Comments + Ratings + Flag                | High   |
| 4        | **Upload Studio** — curriculum metadata + My Contributions + Profile | Medium |
| 5        | **Admin** — Moderation queue + Course/User management                | Medium |

---

## Firestore Collections Summary

| Collection             | Key Fields                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `users`                | uid, email, name, matricNumber, department, level, role, isVerified                               |
| `videos`               | title, courseCode, department, level, topic, status, videoId, userId, views, isFlagged, avgRating |
| `courses`              | code, title, department, level, description                                                       |
| `videos/{id}/comments` | text, userId, userEmail, createdAt                                                                |
| `videos/{id}/flags`    | reason, userId, createdAt                                                                         |
| `videos/{id}/ratings`  | userId, rating (1–5)                                                                              |
