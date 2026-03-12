# EduVid

**EduVid** is a peer‑to‑peer educational video platform built for Dominion University. It lets students upload curriculum‑aligned lecture recordings, browse by course, rate clarity, comment on content, and explore a community‑driven video catalog. Behind the scenes an Express backend handles uploads to YouTube and Firestore stores metadata and user profiles.

---

## 🚀 Features

- Vue 3 frontend powered by Vite
- Firebase authentication with email/password and Google OAuth
- Extended registration with matric number, department, and level
- Firestore collections for users, videos, courses, comments, ratings, and flags
- Video upload studio that processes files, publishes to YouTube, and tracks status
- Course catalog with search, filters, and individual course pages
- Home feed with trending (by views) and recent sorting, plus department/level filters
- Video playback page with YouTube embed, related content, comments, clarity ratings, flagging, and view tracking
- User dashboard (`My Contributions`) showing personal uploads, flags, and ratings
- Profile settings and role‑based admin dashboard
- Express backend that verifies Firebase tokens and interacts with YouTube Data API
- Seeder script for populating initial course list

## 📁 Project Structure

```
eduvid/
├─ backend/                # Express server, upload logic, Firestore seeder
├─ public/                 # Static assets
├─ src/                    # Vue application
│  ├─ components/          # Reusable UI components
│  ├─ router/              # Vue Router configuration
│  ├─ stores/              # Pinia stores (auth)
│  ├─ views/               # Page-level Vue components
│  ├─ utils/               # Helper modules
│  ├─ firebase.js          # Firebase initialization
│  └─ main.js              # App entrypoint
└─ eduvid_roadmap.md       # Development roadmap
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm/yarn
- Firebase project with Firestore and Authentication enabled
- YouTube Data API credentials for upload

### Backend

1. `cd backend`
2. Create a `.env` file with your Firebase and Google credentials:
   ```ini
   FIREBASE_PROJECT_ID=...
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY="..."
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REFRESH_TOKEN=...
   ```
3. Install dependencies and start server:
   ```bash
   npm install
   npm run start          # listens on port 3000
   ```
4. (Optional) Seed courses:
   ```bash
   node seed-courses.js
   ```

### Frontend

1. At the root of the repo, install dependencies:
   ```bash
   npm install
   ```
2. Copy `src/firebase.js` and update with your Firebase config.
3. Run development server:
   ```bash
   npm run dev
   ```
4. The app will be available at `http://localhost:5173` by default.

### Deployment

- Frontend can be built with `npm run build` and hosted on any static host
- Backend should run on a Node environment (Heroku, Vercel serverless, EC2, etc.)
- Make sure to set environment variables and secure the Google refresh token

## 🧭 Roadmap

The project roadmap lives in `eduvid_roadmap.md`. Highlights:

1. **Authentication & Onboarding** – complete
2. **Course Catalog & Discovery** – mostly complete
3. **Video Playback & Peer Interaction** – implemented
4. **Upload Studio & Contributions** – implemented
5. **Admin Governance** – partial (needs moderation queue, user management)

## 🤝 Contributing

Feel free to fork, open issues, or submit pull requests. The code uses ESLint with default config and Prettier for formatting.

## 📄 License

This project is open‑source and available under the MIT License.

---

_EduVid — Dominion University Peer‑to‑Peer Learning Platform_
alri
