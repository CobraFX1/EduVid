const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const os = require("os");
const dotenv = require("dotenv");
const multer = require("multer");

// Load backend/.env
dotenv.config();

// Setup Multer for parsing multipart/form-data directly to temp disk
const upload = multer({ dest: os.tmpdir() });

// 1. Initialize Firebase Admin SDK
// You must provide these in your .env file
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

// 2. Initialize YouTube API Client
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "https://developers.google.com/oauthplayground" // Redirect URI
);

if (REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN,
  });
} else {
  console.warn("Missing GOOGLE_REFRESH_TOKEN in .env. YouTube uploads will fail.");
}

const youtube = google.youtube({
  version: "v3",
  auth: oauth2Client,
});


// 3. Setup Express Server
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Basic health check endpoint
app.get("/", (req, res) => {
  res.send("EduVid Video Processing Server is running.");
});

// Middleware to verify Firebase Auth Token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token." });
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Unauthorized: Invalid token." });
  }
};

// 4. API Endpoint for Video Uploads
app.post("/api/upload", verifyToken, upload.single("video"), async (req, res) => {
  const file = req.file; // The uploaded temp file on disk
  const { title, description, userId, userEmail, courseCode, level, topic } = req.body;

  if (!file) {
    return res.status(400).json({ error: "No video file provided." });
  }

  // A. Create Initial Firestore Document
  // User ID from Token must match User ID from Form Data for security
  if (req.user.uid !== userId) {
    fs.unlinkSync(file.path);
    return res.status(403).json({ error: "Forbidden: UID mismatch." });
  }

  // try to infer department from the course code (helps with filtering)
  let departmentValue = ""
  if (courseCode) {
    try {
      const courseSnap = await db.collection('courses')
        .where('code', '==', courseCode)
        .limit(1)
        .get();
      if (!courseSnap.empty) {
        departmentValue = courseSnap.docs[0].data().department || ""
      }
    } catch (e) {
      console.warn(`Could not lookup course for ${courseCode}:`, e.message)
    }
  }

  let docRef;
  try {
    docRef = await db.collection("videos").add({
      title: title || "EduVid Upload",
      description: description || "",
      courseCode: courseCode || "",
      department: departmentValue,
      level: level || "",
      topic: topic || "",
      status: "processing",
      userId: userId,
      userEmail: userEmail || req.user.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      views: 0,
      isFlagged: false,
      avgRating: 0
    });
    console.log(`[${docRef.id}] Video document created, starting YouTube upload from disk...`);

    // increment the associated course's videoCount (if courseCode provided)
    if (courseCode) {
      try {
        const courseSnap = await db.collection('courses')
          .where('code', '==', courseCode)
          .limit(1)
          .get();
        if (!courseSnap.empty) {
          const courseRef = courseSnap.docs[0].ref;
          await courseRef.update({ videoCount: admin.firestore.FieldValue.increment(1) });
        }
      } catch (countErr) {
        console.warn(`Could not update videoCount for course ${courseCode}:`, countErr.message);
      }
    }
  } catch (dbError) {
    console.error("Firestore creation error:", dbError);
    fs.unlinkSync(file.path);
    return res.status(500).json({ error: "Failed to initialize video entry in database." });
  }

  // Respond immediately so frontend can show "Processing"
  res.status(202).json({
    message: "Upload received. Processing in background.",
    videoId: docRef.id
  });

  // B. Process Video (Upload to YouTube -> Update Database -> Clean Disk)
  try {
    await docRef.update({ stage: "uploading_to_youtube", statusMessage: "Uploading video to YouTube..." });

    const youtubeRes = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: title || "EduVid Upload",
          description: description || "Uploaded via EduVid",
        },
        status: {
          privacyStatus: "unlisted",
        },
      },
      media: {
        body: fs.createReadStream(file.path),
      },
    });

    const ytVideoId = youtubeRes.data.id;
    console.log(`[${docRef.id}] YouTube upload successful. Video ID: ${ytVideoId}`);

    await docRef.update({ stage: "finalizing", statusMessage: "Finalizing metadata..." });

    // C. Update Firestore with YouTube Data
    await docRef.update({
      videoId: ytVideoId,
      videoUrl: `https://www.youtube.com/watch?v=${ytVideoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytVideoId}/maxresdefault.jpg`,
      type: "youtube",
      status: "ready",
      stage: "complete",
      statusMessage: "Published to YouTube successfully.",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`[${docRef.id}] Processing complete.`);

  } catch (error) {
    console.error(`[${docRef.id}] Error uploading to YouTube:`, error);
    await docRef.update({
      status: "error",
      stage: "error",
      statusMessage: `Upload failed: ${error.message}`,
      error: error.message
    });
  } finally {
    // D. Cleanup local temp file from the server's hard drive
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
      console.log(`[${docRef.id}] Temp file ${file.path} removed from local disk.`);
    }
  }
});
/**
 * STEP 1: Identity Check
 * Checks if a Matric Number is unique and follows the required pattern.
 */
app.post('/api/auth/check-matric', async (req, res) => {
  let { matricNumber } = req.body;

  if (!matricNumber) {
    return res.status(400).json({ error: 'Matric number is required.' });
  }

  // Normalize: Trim and force Uppercase
  matricNumber = matricNumber.trim().toUpperCase();

  // Regex: Must be 'DU' followed by exactly 4 digits
  const matricRegex = /^DU\d{4}$/;

  if (!matricRegex.test(matricNumber)) {
    return res.status(400).json({ 
      error: 'Invalid format. Use DU followed by 4 digits (e.g., DU1234).' 
    });
  }

  try {
    const usersRef = db.collection('users');
    const query = usersRef.where('matricNumber', '==', matricNumber).limit(1);
    const snapshot = await query.get();

    // Send back true/false
    res.json({ exists: !snapshot.empty });
  } catch (error) {
    console.error('Database check error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});
// 5. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
