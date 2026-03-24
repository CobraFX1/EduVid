# EduVid: University Instructional Video Platform

**EduVid** is a high-performance, responsive Vue 3 application tailored for academic environments. It provides a centralized hub for instructional video sharing, featuring real-time data synchronization via Firebase and an automated Node.js microservice architecture for content integrity.

---

## 🏗️ Architecture & Tech Stack

EduVid is built with a focus on modularity and "Zero-Jank" performance.

* **Frontend**: [Vue 3](https://vuejs.org/) (Composition API) powered by [Vite](https://vitejs.dev/) for lightning-fast HMR.
* **State Management**: [Pinia](https://pinia.vuejs.org/) for modular, type-safe reactive stores.
* **Backend-as-a-Service**: [Firebase](https://firebase.google.com/) (Firestore, Authentication, and Cloud Storage).
* **Microservices**: [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) hosting a custom CRON engine for YouTube link validation.
* **UI/UX**: Custom **Glassmorphism Design System** authored in pure CSS3, utilizing Vue Teleports and Skeleton Loaders for seamless transitions.

---

## 🌟 Key Features

### 🔐 Secure Governance
* **Role-Based Access Control (RBAC)**: Granular permissions system distinguishing between Student and Administrator roles to secure sensitive routes and actions.
* **Firebase Authentication**: Robust OAuth and email/password integration for campus-wide security.

### 📺 Content Moderation & Automation
* **Automated Sync Engine**: A Node.js backend that runs recurring validation checks to identify and flag dead YouTube links or private videos.
* **Advanced Flagging**: Community-driven moderation tools with manual Administrator override capabilities.

### 📊 Engagement Analytics
* **Live Metrics**: Real-time watch tracking and rating matrices.
* **Native Integration**: Seamless YouTube iFrame API implementation for high-fidelity playback control.

---

## 🛠️ Installation & Setup

Follow these steps to configure your local development environment.

### 1. Repository Initialization
Clone the repository and install the frontend dependencies:
```bash
git clone [https://github.com/your-username/eduvid.git](https://github.com/your-username/eduvid.git)
cd eduvid
npm install
```

### 2. Microservice Configuration
Navigate to the backend directory to initialize the CRON engine:
```bash
cd backend
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the `src/` directory. Populate it with your Firebase configuration keys:
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 🚀 Running the Application

To fully utilize the platform's features, both the frontend and the backend sync engine must be active.

### Frontend Development Server
From the root directory:
```bash
npm run dev
```

### Background Verification Engine
Open a separate terminal and navigate to the backend folder:
```bash
cd backend
node index.js
```

---

## 📈 Deployment
This project is optimized for deployment on **Vercel** or **Netlify** (Frontend) and **Heroku** or **Google Cloud Functions** (Backend). Ensure all environment variables are mirrored in your production dashboard.
