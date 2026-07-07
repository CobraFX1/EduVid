const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const fs = require("fs");
const os = require("os");
const dotenv = require("dotenv");
const multer = require("multer");

// Load backend/.env
dotenv.config();

// Setup Multer for parsing multipart/form-data directly to temp disk
const upload = multer({ dest: os.tmpdir() });

// ==========================================
// 1. INITIALIZE FIREBASE ADMIN SDK
// ==========================================
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Handle newlines in the private key correctly
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin initialized.");
} catch (err) {
  console.error("Firebase Admin initialization error. Check your .env credentials.", err);
}

const db = admin.firestore();

// ==========================================
// 2. INITIALIZE YOUTUBE API CLIENT
// ==========================================
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "https://developers.google.com/oauthplayground" // Redirect URI
);

if (REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
} else {
  console.warn("Missing GOOGLE_REFRESH_TOKEN in .env. YouTube uploads will fail.");
}

const youtube = google.youtube({ version: "v3", auth: oauth2Client });

// ==========================================
// 3. RETRY HELPER (Exponential Backoff)
// ==========================================
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = error.code === 429 || error.code === 503 || error.code === 'ECONNRESET' || error.message?.includes('timeout');
      if (!isRetryable || attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
      console.log(`[Retry] Attempt ${attempt} failed. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ==========================================
// 3.5 API QUOTA MANAGEMENT & CACHING
// ==========================================

// In-memory cache with TTL-based expiration for YouTube API responses
class YouTubeCache {
  constructor(defaultTtlMs = 60 * 60 * 1000) {
    this._store = new Map();
    this._defaultTtlMs = defaultTtlMs;
  }

  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    const ttl = ttlMs || this._defaultTtlMs;
    this._store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  clear() {
    this._store.clear();
  }

  get size() {
    // Purge expired entries before reporting size
    const now = Date.now();
    for (const [k, v] of this._store) {
      if (now > v.expiresAt) this._store.delete(k);
    }
    return this._store.size;
  }
}

// Tracks daily YouTube API quota consumption with midnight-UTC auto-reset
class QuotaTracker {
  constructor(dailyLimit = 10000) {
    this.dailyLimit = dailyLimit;
    this.used = 0;
    this._resetDate = this._todayUTC();
  }

  _todayUTC() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
  }

  _autoReset() {
    const today = this._todayUTC();
    if (today !== this._resetDate) {
      this.used = 0;
      this._resetDate = today;
      console.log("[Quota] Daily quota counter reset.");
    }
  }

  consume(units) {
    this._autoReset();
    this.used += units;
    return this.used <= this.dailyLimit;
  }

  canAfford(units) {
    this._autoReset();
    return (this.used + units) <= this.dailyLimit;
  }

  getRemaining() {
    this._autoReset();
    return Math.max(0, this.dailyLimit - this.used);
  }

  getResetsAt() {
    const now = new Date();
    const resetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return resetDate.toISOString();
  }
}

const apiCache = new YouTubeCache();
const quotaTracker = new QuotaTracker(10000);

// ==========================================
// 4. SETUP EXPRESS SERVER & MIDDLEWARE
// ==========================================
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("EduVid Video Processing Server is running.");
});

// Middleware 1: Verify Firebase Auth Token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token." });
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Attach user info to request
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Unauthorized: Invalid token." });
  }
};

// Middleware 2: Verify Admin Role (Step 7)
const verifyAdmin = async (req, res, next) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    const userData = userDoc.data();

    if (!userDoc.exists || userData.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Admin access required." });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Error verifying admin status." });
  }
};
// ==========================================
// 5. AUTHENTICATION ROUTES (Brevo V5 SDK)
// ==========================================
const { BrevoClient } = require('@getbrevo/brevo');

// 1. Initialize the new unified client
const brevo = new BrevoClient({ 
  apiKey: process.env.EMAIL_PASS
});

app.post("/api/auth/send-otp", verifyToken, async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // 2. The new V5 syntax passes a simple JSON object directly!
    await brevo.transactionalEmails.sendTransacEmail({
      subject: "Verify your EduVid Account",
      to: [{ email: email }],
      sender: { name: "EduVid Support", email: "jacobstephen045@gmail.com" }, // Keep your verified email here
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
          
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            
            <tr>
              <td align="center" style="background-color: #4F46E5; padding: 30px 20px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">EduVid</h1>
              </td>
            </tr>

            <tr>
              <td style="padding: 40px 30px; color: #374151;">
                <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Verify your email address</h2>
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                  Hello,<br><br>
                  Thank you for registering for EduVid! To complete your setup and access the platform, please enter the verification code below:
                </p>

                <div style="text-align: center; margin: 30px 0;">
                  <span style="display: inline-block; background-color: #EEF2FF; color: #4F46E5; font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 15px 30px; border-radius: 6px; border: 1px dashed #4F46E5;">
                    ${otp}
                  </span>
                </div>

                <p style="font-size: 14px; color: #6B7280; line-height: 1.5;">
                  This code will expire in <strong>10 minutes</strong>. If you did not request this code, please ignore this email or contact support.
                </p>
              </td>
            </tr>

            <tr>
              <td style="background-color: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
                <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                  &copy; ${new Date().getFullYear()} EduVid. All rights reserved.
                </p>
              </td>
            </tr>
            
          </table>
          
        </body>
        </html>
      `
    });
    // 3. Save OTP to Firestore
    await db.collection("otp_verifications").doc(req.user.uid).set({
      otp: otp,
      expiresAt: Date.now() + 600000, // 10 minutes
    });

    res.json({ message: "OTP sent successfully!" });
  } catch (error) {
    // V5 error handling
    console.error("Brevo API Error:", error.body || error.message);
    res.status(500).json({ error: "Failed to send OTP." });
  }
});
// STEP 6: Verify OTP
app.post("/api/auth/verify-otp", verifyToken, async (req, res) => {
  const { otp } = req.body;

  try {
    const otpDoc = await db.collection("otp_verifications").doc(req.user.uid).get();

    if (!otpDoc.exists) {
      console.log(`[OTP Verification] Failed for ${req.user.email}: No OTP document found.`);
      return res.status(400).json({ error: "No OTP found. Please request a new one." });
    }

    const data = otpDoc.data();
    if (Date.now() > data.expiresAt) {
      console.log(`[OTP Verification] Failed for ${req.user.email}: OTP expired.`);
      return res.status(400).json({ error: "OTP expired." });
    }
    if (data.otp !== otp) {
      console.log(`[OTP Verification] Failed for ${req.user.email}: Code mismatch (Expected ${data.otp}, got ${otp}).`);
      return res.status(400).json({ error: "Invalid verification code." });
    }

    // Success
    await db.collection("users").doc(req.user.uid).update({ isVerified: true });
    await otpDoc.ref.delete();

    res.json({ success: true, message: "Account verified successfully!" });

  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ error: "Verification failed." });
  }
});

// ==========================================
// 5.5 MATRIC CHECK ROUTE
// ==========================================
app.post("/api/auth/check-matric", async (req, res) => {
  const { matricNumber, email } = req.body;
  if (!matricNumber || !email) {
    return res.status(400).json({ error: "Matric number and email are required." });
  }

  try {
    // 1. Check if the matric is valid at the university level
    const validSnap = await db.collection("valid_matric_numbers").doc(matricNumber).get();
    if (!validSnap.exists) {
      return res.status(404).json({ exists: false, valid: false, error: "Invalid Matric Number. Not recognized by University." });
    }

    const validData = validSnap.data();

    // 2. Strict Identity Verification (Matric + Email only)
    const providedEmail = email.trim().toLowerCase();
    const validEmail = validData.email ? validData.email.trim().toLowerCase() : undefined;

    console.log(`[Matric Check] Verifying ${matricNumber}`);
    console.log(`[Matric Check] Provided Email: '${providedEmail}'`);
    console.log(`[Matric Check] Whitelisted Email: '${validEmail}'`);

    if (providedEmail !== validEmail) {
      console.log(`[Matric Check] REJECTED. Emails do not match.`);
      return res.status(403).json({ 
        exists: false, 
        valid: false, 
        error: "Identity mismatch. The provided email does not match University records for this Matric Number." 
      });
    }
    console.log(`[Matric Check] ACCEPTED. Emails match perfectly.`);

    // 3. Check if a user has already registered with this matric
    const userSnap = await db.collection("users").where("matricNumber", "==", matricNumber).get();
    if (!userSnap.empty) {
      return res.status(409).json({ exists: true, valid: true, error: "This Matric Number is already registered." });
    }

    // 4. Valid and unused
    res.json({ exists: false, valid: true });
  } catch (error) {
    console.error("Matric check error:", error);
    res.status(500).json({ error: "Failed to check matric number." });
  }
});

// ==========================================
// 6. PROTECTED FEATURE ROUTES
// ==========================================

// STEP 8: Secure Video Upload (Finalized with Metadata Framework)
app.post("/api/upload", verifyToken, upload.single("video"), async (req, res) => {
  const file = req.file;
  // 🛡️ STEP 4: Extract all mandatory tags from req.body
  const { title, description, userId, userEmail, courseCode, level, department, topic } = req.body;

  if (!file) return res.status(400).json({ error: "No video file provided." });

  // 🛡️ THE BOUNCER: Check if mandatory tags exist before consuming any more resources
  if (!title || !courseCode || !department || !level) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); // Cleanup disk immediately
    return res.status(400).json({ error: "Mandatory Tagging Violation: Title, Course, Level, and Department are required." });
  }

  try {
    // 🛡️ SECURITY: Verify user is verified, not banned, and IDs match
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists || !userDoc.data().isVerified) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).json({ error: "Please verify your email before uploading videos." });
    }

    // 🛡️ BAN CHECK: Prevent banned users from uploading
    if (userDoc.data().isBanned === true) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).json({ error: "Your account has been restricted from uploading videos. Contact an administrator." });
    }

    if (req.user.uid !== userId) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).json({ error: "Forbidden: UID mismatch." });
    }

    // 1. Create Initial Firestore Document
    const docRef = await db.collection("videos").add({
      title: title.trim(),
      description: description || "",
      courseCode: courseCode, // Normalized (e.g., SEN401)
      department: department,
      level: parseInt(level), // Ensure stored as Number
      topic: topic || "",
      status: "processing",
      userId: userId,
      userEmail: userEmail || req.user.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      views: 0,
      isFlagged: false,
      avgRating: 0
    });

    // Respond immediately so frontend shows "Processing" UI
    res.status(202).json({ message: "Upload received. Processing in background.", videoId: docRef.id });

    // 2. Upload to YouTube (Background Task)
    await docRef.update({ stage: "uploading_to_youtube", statusMessage: "Uploading video to YouTube..." });

    const youtubeRes = await retryWithBackoff(() => youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: title,
          description: description || `Educational content for ${courseCode} via EduVid`
        },
        status: { privacyStatus: "unlisted" },
      },
      media: { body: fs.createReadStream(file.path) },
    }), 3, 2000);

    const ytVideoId = youtubeRes.data.id;

    // 3. Finalize Document & Meta Updates
    await docRef.update({
      videoId: ytVideoId,
      videoUrl: `https://www.youtube.com/watch?v=${ytVideoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytVideoId}/maxresdefault.jpg`,
      status: "ready",
      stage: "complete",
      statusMessage: "Published successfully.",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 📈 STEP 5: Automated Course Count Aggregation
    try {
      // Assumes your Course Document ID is the Course Code (e.g., SEN401)
      const courseRef = db.collection('courses').doc(courseCode);
      await courseRef.update({
        videoCount: admin.firestore.FieldValue.increment(1)
      });
      console.log(`[Framework] videoCount incremented for ${courseCode}`);
    } catch (countErr) {
      console.warn(`[Framework] Could not update count for ${courseCode}:`, countErr.message);
    }

  } catch (error) {
    console.error("Critical Upload Error:", error);
    // Optional: await docRef.update({ status: 'error', error: error.message });
  } finally {
    // 4. Cleanup local temp file from server disk
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
      console.log(`[Cleanup] Temp file removed for ${title}`);
    }
  }
});
// STEP 7: Admin-Only Route Example
app.get("/api/admin/flagged-videos", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection("videos").where("isFlagged", "==", true).get();
    const flagged = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(flagged);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch flagged videos." });
  }
});

// Admin route: Current YouTube API quota status
app.get("/api/admin/quota-status", verifyToken, verifyAdmin, (req, res) => {
  res.json({
    dailyLimit: quotaTracker.dailyLimit,
    used: quotaTracker.used,
    remaining: quotaTracker.getRemaining(),
    cacheSize: apiCache.size,
    resetsAt: quotaTracker.getResetsAt(),
  });
});

// Admin route: Recent Firestore backup records
app.get("/api/admin/backups", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection("backups")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();
    const backups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(backups);
  } catch (error) {
    console.error("[Admin] Failed to fetch backups:", error.message);
    res.status(500).json({ error: "Failed to fetch backup records." });
  }
});

// ==========================================
// 7. NODE-CRON YOUTUBE SYNCHRONIZATION
// ==========================================
const cron = require("node-cron");

// Helper: Persist sync log to Firestore for admin review
async function logSyncEvent(type, message, details = {}) {
  try {
    await db.collection("sync_logs").add({
      type,       // 'info', 'warning', 'error'
      message,
      details,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("[CRON] Failed to persist log:", e.message);
  }
}

// Run every hour to verify YouTube links and sync metadata
cron.schedule("0 * * * *", async () => {
  console.log("[CRON] Running YouTube Synchronization...");
  try {
    const vidsRef = db.collection("videos");
    const snapshot = await vidsRef.where("status", "==", "ready").get();

    if (snapshot.empty) {
      console.log("[CRON] No active videos to sync.");
      await logSyncEvent("info", "No active videos to sync.");
      return;
    }

    // Map Document refs and stored data by YouTube videoId
    const ytIdMap = new Map();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.videoId) ytIdMap.set(data.videoId, { ref: doc.ref, data });
    });

    const videoIds = Array.from(ytIdMap.keys());
    let brokenCount = 0;
    let updatedCount = 0;

    // Chunk into batches of 50 (YouTube API limit)
    const chunkSize = 50;
    const costPerChunk = 3; // ~3 quota units per videos.list call
    let quotaExhausted = false;

    for (let i = 0; i < videoIds.length; i += chunkSize) {
      const chunk = videoIds.slice(i, i + chunkSize);
      const cacheKey = `sync:${chunk.join(",")}`;

      // Check quota before making an API call
      if (!quotaTracker.canAfford(costPerChunk)) {
        console.log(`[CRON] Quota exhausted (${quotaTracker.getRemaining()} remaining). Stopping sync early.`);
        await logSyncEvent("warning", "Sync stopped early: YouTube API quota exhausted.", { remaining: quotaTracker.getRemaining() });
        quotaExhausted = true;
        break;
      }

      // Use cached response if available
      let res = apiCache.get(cacheKey);
      if (res) {
        console.log(`[CRON] Cache hit for chunk starting at index ${i}`);
      } else {
        // Fetch snippet + status so we can sync titles/descriptions too
        res = await retryWithBackoff(() => youtube.videos.list({
          part: "snippet,status",
          id: chunk.join(","),
        }));
        apiCache.set(cacheKey, res);
        quotaTracker.consume(costPerChunk);
      }

      const activeMap = new Map();
      res.data.items.forEach((item) => activeMap.set(item.id, item));

      for (const reqId of chunk) {
        const entry = ytIdMap.get(reqId);

        if (!activeMap.has(reqId)) {
          // Video deleted from YouTube
          console.log(`[CRON] Broken link detected: ${reqId}`);
          await entry.ref.update({
            brokenLink: true,
            isFlagged: true,
            status: "error",
            statusMessage: "Video removed from YouTube",
          });
          brokenCount++;
          await logSyncEvent("warning", `Broken link detected: ${entry.data.title}`, { videoId: reqId, courseCode: entry.data.courseCode });
        } else {
          // Sync title and description if YouTube version differs
          const ytSnippet = activeMap.get(reqId).snippet;
          const updates = {};
          if (ytSnippet.title && ytSnippet.title !== entry.data.title) {
            updates.title = ytSnippet.title;
          }
          if (ytSnippet.description !== undefined && ytSnippet.description !== entry.data.description) {
            updates.description = ytSnippet.description;
          }
          if (Object.keys(updates).length > 0) {
            await entry.ref.update(updates);
            updatedCount++;
            console.log(`[CRON] Synced metadata for: ${reqId}`);
            await logSyncEvent("info", `Metadata synced for: ${entry.data.title}`, { videoId: reqId, updates });
          }
        }
      }
    }

    const summary = `Sync complete. Checked: ${quotaExhausted ? 'partial' : videoIds.length}, Broken: ${brokenCount}, Updated: ${updatedCount}, Quota remaining: ${quotaTracker.getRemaining()}`;
    console.log(`[CRON] ${summary}`);
    await logSyncEvent("info", summary);

  } catch (error) {
    console.error("[CRON] Sync Failed:", error.message);
    await logSyncEvent("error", `Sync failed: ${error.message}`);
  }
});

// ==========================================
// 7.5 AUTOMATED FIRESTORE BACKUP
// ==========================================
// Note: Automated database backups are configured via Google Cloud Console
// rather than custom backend scripts.


// ==========================================
// 8. START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});