# EduVid — Complete Function Reference

A comprehensive list of every function in both the **backend** and **frontend** of the EduVid application, grouped by file, with a description of what each function does.

---

## BACKEND

---

### `backend/index.js` — Main Express Server

| # | Function / Route | Type | Description |
|---|---|---|---|
| 1 | `verifyToken(req, res, next)` | Middleware | Extracts the Firebase ID token from the `Authorization: Bearer <token>` header, verifies it using Firebase Admin SDK, and attaches the decoded user info to `req.user`. Returns `401 Unauthorized` if the token is missing or invalid. |
| 2 | `verifyAdmin(req, res, next)` | Middleware | Runs after `verifyToken`. Looks up the user's document in the `users` Firestore collection and checks if their `role` field is `'admin'`. Returns `403 Forbidden` if not. |
| 3 | `GET /` | Route | Health-check endpoint. Returns a plain text message confirming the server is running. |
| 4 | `POST /api/auth/send-otp` | Route (Protected) | Generates a random 6-digit OTP, sends it to the user's email via the **Brevo** (formerly Sendinblue) transactional email API inside a styled HTML template, then stores the OTP and a 10-minute expiry timestamp in the `otp_verifications` Firestore collection keyed by the user's UID. |
| 5 | `POST /api/auth/verify-otp` | Route (Protected) | Accepts an `otp` in the request body, retrieves the stored OTP from `otp_verifications` for the authenticated user, validates it hasn't expired and matches, then marks the user as verified (`isVerified: true`) in the `users` collection and deletes the OTP record. |
| 6 | `POST /api/upload` | Route (Protected) | The core video upload pipeline. Accepts a multipart form with a video file and metadata fields (`title`, `description`, `courseCode`, `department`, `level`, `topic`). It: (1) validates mandatory tags exist, (2) checks the user is email-verified and UID matches, (3) creates an initial Firestore document in `videos` with status `"processing"`, (4) responds immediately with `202 Accepted` so the frontend shows a "Processing" state, (5) uploads the video file to YouTube as an unlisted video using the YouTube Data API, (6) updates the Firestore document with the YouTube video ID, URL, thumbnail URL, and status `"ready"`, (7) increments the `videoCount` on the matching course document, and (8) cleans up the temp file from disk in a `finally` block. |
| 7 | `GET /api/admin/flagged-videos` | Route (Admin) | Protected by both `verifyToken` and `verifyAdmin`. Queries the `videos` collection for all documents where `isFlagged == true` and returns them as a JSON array. |
| 8 | `cron.schedule("0 * * * *", ...)` | Cron Job | Runs every hour via `node-cron`. Fetches all Firestore video documents with status `"ready"`, batches their YouTube video IDs into groups of 50 (YouTube API limit), calls the YouTube Videos API to check which IDs are still live, and for any that YouTube no longer returns (deleted/private), marks the Firestore document as `brokenLink: true`, `isFlagged: true`, and `status: "error"`. This is the **Broken Link Synchronization** system. |

---

### `backend/get-token.js` — One-Time OAuth Token Generator

| # | Function | Description |
|---|---|---|
| 1 | `oauth2Client.generateAuthUrl(...)` | Generates a Google OAuth2 consent URL requesting the `youtube.upload` scope with offline access and forced consent prompt. |
| 2 | `exec(...)` | Opens the generated auth URL in the user's default browser on Windows. |
| 3 | `http.createServer(...)` | Spins up a temporary local HTTP server on port 3001 to capture the OAuth redirect callback. When it receives the authorization `code`, it exchanges it for tokens using `oauth2Client.getToken(code)`, extracts the `refresh_token`, and writes `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN` into the `.env` file. Then shuts the server down. |

---

### `backend/seed-courses.js` — One-Time Course Seeder

| # | Function | Description |
|---|---|---|
| 1 | `(async () => { ... })()` (IIFE) | Immediately-invoked async function that initializes Firebase Admin, defines an array of 15 hardcoded course objects (across Software Engineering, Computer Science, and Information Technology departments), extracts unique department names, then uses a Firestore `writeBatch` to seed both the `departments` and `courses` collections in a single atomic operation. Each course gets an initial `videoCount: 0`. |

---

### `backend/migrate-depts.js` — Legacy Department Migration

| # | Function | Description |
|---|---|---|
| 1 | `(async () => { ... })()` (IIFE) | Scans the existing `courses` collection for any `department` values, checks the `departments` collection for which ones already exist, and batch-inserts any missing departments. This is a one-time migration script to backfill the `departments` collection from legacy course data. |

---

## FRONTEND

---

### `src/firebase.js` — Firebase Client Configuration

| # | Export | Description |
|---|---|---|
| 1 | `auth` | Firebase Auth instance initialized with the project's config. Used across the app for authentication operations. |
| 2 | `db` | Firestore instance used for all database reads/writes on the client side. |
| 3 | `googleProvider` | A `GoogleAuthProvider` instance used for Google sign-in popup flows. |

---

### `src/main.js` — App Entry Point

| # | Function | Description |
|---|---|---|
| 1 | `authStore.initializeAuth().then(...)` | Waits for the Pinia auth store to finish detecting the current Firebase user session before mounting the Vue app and installing the router. This prevents route guards from running before the auth state is known. |

---

### `src/stores/auth.js` — Pinia Auth Store

| # | Function | Type | Description |
|---|---|---|---|
| 1 | `isAdmin` | Getter | Returns `true` if the loaded user profile has `role === 'admin'`. |
| 2 | `isStudent` | Getter | Returns `true` if the user profile has `role === 'student'` or no role set. |
| 3 | `register(email, password, profileData)` | Action | Registers a new user. Validates the matric number format (`DU` + 4 digits), checks for uniqueness via a backend endpoint, creates the Firebase Auth account, then saves the full student profile to Firestore via `_createUserProfile`. |
| 4 | `loginWithGoogle()` | Action | Triggers Google sign-in popup. If the user's Firestore profile already exists, loads it and returns `{ isNewUser: false }`. If not (first-time Google user), returns `{ isNewUser: true }` so the router can redirect to the profile completion page. |
| 5 | `login(email, password)` | Action | Signs in with email/password via Firebase Auth and loads the user's Firestore profile. |
| 6 | `logout()` | Action | Signs out from Firebase Auth and clears both `user` and `userProfile` from the Pinia state. |
| 7 | `resetPassword(email)` | Action | Sends a Firebase password reset email to the given address. |
| 8 | `_createUserProfile(user, extra)` | Action (Private) | Creates a new document in the `users` collection with the user's UID as the document ID, including fields like `name`, `matricNumber`, `programme`, `level`, `role: 'student'`, and `isVerified: false`. |
| 9 | `_loadProfile(uid)` | Action (Private) | Fetches the user profile document from `users/{uid}` and stores it in `userProfile`. |
| 10 | `initializeAuth()` | Action | Sets up a Firebase `onIdTokenChanged` listener that automatically detects login state on page load and silently refreshes the token every hour. Resolves a promise once the initial auth state is determined. |

---

### `src/router/index.js` — Vue Router Configuration

| # | Function | Description |
|---|---|---|
| 1 | `router.beforeEach(...)` | Global navigation guard that enforces: (1) admin-only routes redirect non-admins to home, (2) Google users without a profile are forced to `/complete-profile`, (3) unverified users are locked to `/verify-email`, (4) unauthenticated users are redirected to `/login` for protected routes, (5) already-verified users can't revisit `/verify-email`, `/login`, or `/register`. |

---

### `src/utils/youtube.js` — YouTube Utility Functions

| # | Function | Description |
|---|---|---|
| 1 | `getYouTubeVideoId(url)` | Parses a YouTube URL (supports various formats like `watch?v=`, `youtu.be/`, `/embed/`) and extracts the 11-character video ID. Returns `null` if the URL is invalid. |
| 2 | `getYouTubeThumbnail(videoId)` | Takes a YouTube video ID and returns the URL of the maximum-resolution thumbnail. |

---

### `src/utils/course.js` — Course Count Utility Functions

| # | Function | Description |
|---|---|---|
| 1 | `adjustCourseCount(code, delta)` | Queries the `courses` collection for a document matching the given course `code`, then atomically increments (or decrements) its `videoCount` field by the given `delta` value. |
| 2 | `incrementCourseCount(code)` | Convenience wrapper that calls `adjustCourseCount(code, 1)`. Used after a successful video upload. |
| 3 | `decrementCourseCount(code)` | Convenience wrapper that calls `adjustCourseCount(code, -1)`. Used after a video deletion. |

---

### `src/App.vue` — Root Application Component

| # | Function | Description |
|---|---|---|
| 1 | `onMounted(...)` | On page load, reads the saved theme from `localStorage` and applies it. Also pings the backend root URL (`/`) to wake up the server (for cold-start on free hosting) and dismisses the "Waking up server" toast when it responds. |
| 2 | `toggleTheme()` | Toggles between dark and light mode by setting the `data-theme` attribute on `<html>` and saving the preference to `localStorage`. |
| 3 | `handleLogout()` | Calls `authStore.logout()` and redirects to the login page. |

---

### `src/views/Home.vue` — Home / Video Feed Page

| # | Function | Description |
|---|---|---|
| 1 | `startVideoListener()` | Sets up a real-time Firestore `onSnapshot` listener on the `videos` collection ordered by `createdAt desc`. Populates the `videos` array reactively whenever any video is added, modified, or deleted. |
| 2 | `startDeptListener()` | Sets up a real-time Firestore `onSnapshot` listener on the `departments` collection to dynamically populate the department filter dropdown. |
| 3 | `availableCourseCodes` | Computed property that derives unique course codes from the video data filtered by the currently selected department. Drives the dependent "Course Code" dropdown. |
| 4 | `hasActiveFilters` | Computed property that returns `true` if any search/filter is active (search query, department, course, or level). |
| 5 | `resetFilters()` | Clears all search and filter fields and resets the sort to `'recent'`. |
| 6 | `filteredVideos` | Computed property implementing a **chained filtering engine**: filters by `status === 'ready'`, then applies search query (title/topic/course code), department, course code, and level filters, then sorts either by views (trending) or date (recent). |
| 7 | `watch([searchQuery, filterDept, ...])` | Watcher that syncs all filter state into the browser URL query parameters using `router.replace()`, enabling shareable/bookmarkable filtered URLs. |

---

### `src/views/Login.vue` — Login Page

| # | Function | Description |
|---|---|---|
| 1 | `handleLogin()` | Calls `authStore.login(email, password)` and redirects to home on success, or displays the error message. |
| 2 | `handleGoogle()` | Calls `authStore.loginWithGoogle()`. If the user is new (no Firestore profile), redirects to `/complete-profile`. Otherwise redirects to home. |

---

### `src/views/Register.vue` — Registration Page

| # | Function | Description |
|---|---|---|
| 1 | `handleRegister()` | Validates password match, matric number format (`DU` + 4 digits), and password complexity (8+ chars, uppercase, number), then calls `authStore.register()` with the profile data. On success, redirects to `/verify-email`. |
| 2 | `handleGoogle()` | Same as Login — triggers Google sign-in, redirects new users to `/complete-profile`. |

---

### `src/views/VerifyEmail.vue` — Email OTP Verification Page

| # | Function | Description |
|---|---|---|
| 1 | `startCooldown(seconds)` | Starts or resumes a countdown timer for the "Resend Code" button. Saves the send timestamp to `localStorage` so the cooldown persists across page refreshes. |
| 2 | `onMounted(...)` | Checks if the user is authenticated and not already verified. If a recent OTP send timestamp exists in `localStorage`, resumes the cooldown. Otherwise, automatically sends the first OTP by calling `resendOtp()`. |
| 3 | `handleVerify()` | Sends the entered 6-digit OTP to the backend `POST /api/auth/verify-otp` endpoint with the user's auth token. On success, reloads the user profile in Pinia and redirects to home after 2 seconds. |
| 4 | `resendOtp()` | Calls the backend `POST /api/auth/send-otp` endpoint to send a new OTP email, then starts a 60-second cooldown. |

---

### `src/views/CompleteProfile.vue` — Google User Profile Completion

| # | Function | Description |
|---|---|---|
| 1 | `saveProfile()` | Validates matric number format, then calls `authStore._createUserProfile()` to save the Google user's university details (matric number, programme, level) to Firestore, completing their account setup. Redirects to home on success. |

---

### `src/views/ForgotPassword.vue` — Password Reset Page

| # | Function | Description |
|---|---|---|
| 1 | `handleReset()` | Calls `authStore.resetPassword(email)` to send a Firebase password reset email. Displays success or a user-friendly error message (e.g., "No account found with this email"). |

---

### `src/views/Upload.vue` — Video Upload Page

| # | Function | Description |
|---|---|---|
| 1 | `departments` | Computed property that returns a sorted list of department names from the `departments` Firestore collection (loaded via real-time listener). |
| 2 | `filteredCourses` | Computed property that returns course codes for the currently selected department from the `courses` Firestore collection. Drives the dependent "Course Code" dropdown. |
| 3 | `onMounted(...)` | Sets up two real-time Firestore listeners: one on `courses` (to build the department→course code mapping) and one on `departments` (to populate the department dropdown). |
| 4 | `handleFileSelect(event)` | Handles the file input `change` event. Validates that the selected file is a video type. |
| 5 | `handleDrop(event)` | Handles drag-and-drop file events on the drop zone. Validates the dropped file is a video type. |
| 6 | `uploadVideo()` | The main upload function. Validates all required fields and user auth, gets a fresh Firebase ID token, builds a `FormData` with normalized metadata (course code uppercased, spaces removed; level as integer), then sends it to the backend `POST /api/upload` via `XMLHttpRequest` (not `fetch`) so that upload progress can be tracked. On success, shows a completion state and auto-redirects to home after 3 seconds. |
| 7 | `ringOffset` | Computed property that calculates the SVG `stroke-dashoffset` for the circular progress ring based on the current upload percentage. |

---

### `src/views/Watch.vue` — Video Playback Page

| # | Function | Description |
|---|---|---|
| 1 | `loadComments()` | Sets up a real-time `onSnapshot` listener on the `videos/{id}/comments` subcollection, ordered by `createdAt desc`. |
| 2 | `loadRecommendations(currentVideo)` | Builds a "related videos" sidebar using a 3-tier recommendation strategy: (1) videos from the same course code, (2) same department, (3) generic recent videos. Deduplicates and caps at 6 results. |
| 3 | `updateMetadata()` | Allows the video owner to edit the topic, course code, and description directly from the watch page. Normalizes the course code (uppercase, no spaces) and updates both Firestore and the local reactive state. |
| 4 | `submitComment()` | Adds a new comment document to the `videos/{id}/comments` subcollection with the user's name, email, text, and a server timestamp. |
| 5 | `submitRating(stars)` | Implements a 1-5 star "Clarity" rating system. Checks if the user has already rated (updates existing) or creates a new rating document in `videos/{id}/ratings`. Then recalculates the average rating across all ratings and updates the parent video document's `avgRating` field. |
| 6 | `submitFlag()` | Allows any user to flag a video for content issues. Creates a flag document in `videos/{id}/flags` with the selected reason, then sets `isFlagged: true` and appends the reason to the `flaggedReasons` array on the video document. |
| 7 | `onMounted(...)` | Fetches the video document by ID, increments its `views` field by 1, loads recommendations, and starts the comments listener. |
| 8 | `formatDate(ts)` | Utility that converts a Firestore Timestamp or plain date into a formatted date string (e.g., "May 27, 2026"). |

---

### `src/views/Courses.vue` — Course Catalog Page

| # | Function | Description |
|---|---|---|
| 1 | `departments` | Computed property that extracts unique department names from all loaded courses. |
| 2 | `filtered` | Computed property that filters courses by search query (code or title), department, and level. |
| 3 | `groupedCourses` | Computed property that groups filtered courses by department and sorts each group by level then code. Used to render courses under department headings. |
| 4 | `onMounted(...)` | Sets up a real-time Firestore listener on the `courses` collection. |

---

### `src/views/CourseDetail.vue` — Individual Course Page

| # | Function | Description |
|---|---|---|
| 1 | `fetchVideos()` | Queries the `videos` collection for all documents where `courseCode` matches the route param and `status === 'ready'`, sorted by creation date descending. |
| 2 | `onMounted(...)` | Loads the course metadata from the `courses` collection by code, then calls `fetchVideos()`. |

---

### `src/views/MyVideos.vue` — User's Uploaded Videos Page

| # | Function | Description |
|---|---|---|
| 1 | `fetchVideos()` | Queries the `videos` collection for documents where `userId` matches the current user's UID. Sorts results locally by `createdAt` descending (to avoid needing a composite Firestore index). |
| 2 | `deleteVideo(video)` | After confirmation, deletes the video document from Firestore and decrements the course's `videoCount`. Removes the video from the local reactive array. |
| 3 | `pillClass(status)` | Returns the appropriate CSS class for a video status badge (`pill-ready`, `pill-processing`, `pill-error`). |
| 4 | `formatDate(ts)` | Converts a Firestore Timestamp into a formatted date string. |

---

### `src/views/Profile.vue` — User Profile Settings Page

| # | Function | Description |
|---|---|---|
| 1 | `triggerFileInput()` | Programmatically clicks the hidden file input to open the file picker for avatar uploads. |
| 2 | `handleImageUpload(event)` | Uploads the selected image file to **ImgBB** (a free image hosting API), then saves the returned URL to the user's Firestore document (`photoURL`) and updates the local Pinia store. |
| 3 | `initials` | Computed property that generates 1-2 character initials from the user's name or email for the avatar fallback display. |
| 4 | `onMounted(...)` | Pre-fills the profile edit form with the current user profile data from the Pinia store. |
| 5 | `saveProfile()` | Updates the user's Firestore document with the form values (name, matric number, department, level) and syncs the Pinia store. Shows a success message for 3 seconds. |
| 6 | `handleLogout()` | Calls `authStore.logout()` and redirects to the login page. |

---

### `src/views/Admin.vue` — Admin Dashboard Page

| # | Function | Description |
|---|---|---|
| 1 | `filteredVideos` | Computed property that filters the video list by the selected status filter tab (`all`, `processing`, `ready`, `error`). |
| 2 | `countByStatus(key)` | Returns the count of videos matching a given status. Used for the filter tab badge numbers. |
| 3 | `stats` | Computed property that generates an array of stats cards (Total Uploads, Published, Processing, Errors) with values and colors. |
| 4 | `stageLabel(video)` | Maps a video's `stage` or `status` to a human-readable label (e.g., `"uploading_to_youtube"` → `"Uploading to YouTube..."`). |
| 5 | `stageIcon(video)` | Maps a video's stage/status to a Bootstrap icon class. |
| 6 | `stageClass(video)` | Maps a video's stage/status to a CSS class for color-coding (`stage-ready`, `stage-error`, `stage-active`). |
| 7 | `pillClass(status)` | Returns the CSS class for a status pill badge. |
| 8 | `fetchVideos()` | Queries all videos from Firestore ordered by `createdAt desc`. Used on mount and by the refresh button. |
| 9 | `deleteVideo(video)` | After confirmation, deletes a video document from Firestore and decrements the course's `videoCount`. |
| 10 | `formatDate(ts)` | Converts a Firestore Timestamp into a formatted date string with time. |

---

### `src/components/VideoCard.vue` — Reusable Video Card Component

| # | Function | Description |
|---|---|---|
| 1 | `handlePlay()` | Navigates to the `/watch/{id}` page when a "ready" video's thumbnail is clicked. Does nothing for non-ready videos. |
| 2 | `confirmDelete()` | Opens the delete confirmation modal overlay. |
| 3 | `deleteVideo()` | Deletes the video document from Firestore, decrements the course video count, and emits a `'deleted'` event to the parent component. |
| 4 | `formatDate(ts)` | Converts a Firestore Timestamp into a formatted date string. |

---

### `src/components/CourseManager.vue` — Admin Curriculum Manager

| # | Function | Description |
|---|---|---|
| 1 | `onMounted(...)` | Sets up two real-time Firestore listeners: one for the `courses` collection (sorted by department → level → code) and one for the `departments` collection (sorted alphabetically). |
| 2 | `addDepartment()` | Adds a new department document to the `departments` collection with a name and timestamp. |
| 3 | `deleteDepartment(id)` | After confirmation, **cascade-deletes** the department and ALL courses associated with it using a Firestore `writeBatch`. |
| 4 | `addCourse()` | Adds a new course document to the `courses` collection with the department, level, normalized course code (uppercase, no spaces), title, and `videoCount: 0`. |
| 5 | `deleteCourse(id)` | Deletes a single course document from Firestore. |

---

### `src/components/UserManager.vue` — Admin User Directory

| # | Function | Description |
|---|---|---|
| 1 | `onMounted(...)` | Sets up a real-time Firestore listener on the `users` collection ordered by `createdAt desc`. |
| 2 | `filteredUsers` | Computed property that filters the user list by a search query matching name, email, or matric number. |
| 3 | `toggleRole(user, newRole)` | After confirmation, updates a user's `role` field in Firestore to either `'admin'` or `'student'`. |
| 4 | `blockUser(user)` | Sets `isBanned: true` on the user's Firestore document. (Feature is visually stubbed for a future milestone.) |
| 5 | `formatDate(ts)` | Converts a Firestore Timestamp into a formatted date string. |

---

### `src/components/ModerationQueue.vue` — Admin Moderation Queue

| # | Function | Description |
|---|---|---|
| 1 | `onMounted(...)` | Sets up a real-time Firestore listener querying `videos` where `isFlagged == true`. |
| 2 | `dismissFlags(id)` | Clears all flags from a video by setting `isFlagged: false` and `flaggedReasons: []`, restoring it to good standing. |
| 3 | `deleteVideo(id)` | Permanently deletes a flagged video's Firestore document. |
| 4 | `banUploader(uid, email)` | Sets `isBanned: true` on the uploader's user document, globally banning them from uploading. |

---

### `src/components/BrokenLinks.vue` — Admin Broken Links Panel

| # | Function | Description |
|---|---|---|
| 1 | `fetchDeadLinks()` | Queries the `videos` collection for documents where `brokenLink == true` (set by the hourly backend cron job). |
| 2 | `deleteGhostRecord(id)` | Permanently deletes a broken/ghost video record from Firestore after confirmation. |

---

### `src/components/SkeletonVideo.vue` — Loading Skeleton

| # | Description |
|---|---|
| Presentational component only — no logic functions. Renders a pulsing placeholder card that mimics the shape of a `VideoCard` while data is loading. |
