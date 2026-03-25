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
      sender: { name: "EduVid Support", email: "YOUR_VERIFIED_BREVO_EMAIL@gmail.com" }, // Keep your verified email here
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

    if (!otpDoc.exists) return res.status(400).json({ error: "No OTP found. Please request a new one." });

    const data = otpDoc.data();
    if (Date.now() > data.expiresAt) return res.status(400).json({ error: "OTP expired." });
    if (data.otp !== otp) return res.status(400).json({ error: "Invalid verification code." });

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
// 6. PROTECTED FEATURE ROUTES
// ==========================================

// STEP 8: Secure Video Upload
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
    // 🛡️ SECURITY: Verify user is verified and IDs match
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists || !userDoc.data().isVerified) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).json({ error: "Please verify your email before uploading videos." });
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

    const youtubeRes = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: title,
          description: description || `Educational content for ${courseCode} via EduVid`
        },
        status: { privacyStatus: "unlisted" },
      },
      media: { body: fs.createReadStream(file.path) },
    });

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

// ==========================================
// 7. NODE-CRON YOUTUBE SYNCHRONIZATION
// ==========================================
const cron = require("node-cron");

// Run every hour to continuously verify if live videos were deleted off YouTube manually
cron.schedule("0 * * * *", async () => {
  console.log("[CRON] Running YouTube Broken Link Synchronization...");
  try {
    const vidsRef = db.collection("videos");
    const snapshot = await vidsRef.where("status", "==", "ready").get();

    if (snapshot.empty) return console.log("[CRON] No active videos to sync.");

    // Map out Document references mapped by videoId
    const ytIdMap = new Map();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.videoId) ytIdMap.set(data.videoId, doc.ref);
    });

    const videoIds = Array.from(ytIdMap.keys());

    // Chunk array into batches of 50 (YouTube API Hard Limit)
    const chunkSize = 50;
    for (let i = 0; i < videoIds.length; i += chunkSize) {
      const chunk = videoIds.slice(i, i + chunkSize);

      const res = await youtube.videos.list({
        part: "status",
        id: chunk.join(","),
      });

      // YouTube API gently omits data for deleted/ghost videos!
      const activeIds = res.data.items.map((item) => item.id);

      for (const reqId of chunk) {
        if (!activeIds.includes(reqId)) {
          console.log(`[CRON] De-Platformed ghost link detected: ${reqId}`);

          await ytIdMap.get(reqId).update({
            brokenLink: true,
            isFlagged: true,
            status: "error",
            statusMessage: "Video removed from YouTube",
          });
        }
      }
    }
    console.log("[CRON] Sync Complete.");
  } catch (error) {
    console.error("[CRON] Sync Failed:", error.message);
  }
});

// ==========================================
// 8. START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});