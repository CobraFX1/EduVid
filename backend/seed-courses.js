/**
 * One-time course seeder for EduVid Firestore.
 * Run once: node seed-courses.js
 * This populates the `courses` collection with initial curriculum data.
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const courses = [
  // Software Engineering
  { code: 'SEN 101', title: 'Introduction to Computing', department: 'Software Engineering', level: 100 },
  { code: 'SEN 201', title: 'Data Structures & Algorithms', department: 'Software Engineering', level: 200 },
  { code: 'SEN 301', title: 'Software Engineering Principles', department: 'Software Engineering', level: 300 },
  { code: 'SEN 401', title: 'Operating Systems', department: 'Software Engineering', level: 400 },
  { code: 'SEN 402', title: 'Software Project Management', department: 'Software Engineering', level: 400 },
  { code: 'SEN 501', title: 'Advanced Software Architecture', department: 'Software Engineering', level: 500 },
  // Computer Science
  { code: 'CSC 101', title: 'Introduction to Programming', department: 'Computer Science', level: 100 },
  { code: 'CSC 201', title: 'Discrete Mathematics', department: 'Computer Science', level: 200 },
  { code: 'CSC 301', title: 'Database Management Systems', department: 'Computer Science', level: 300 },
  { code: 'CSC 401', title: 'Artificial Intelligence', department: 'Computer Science', level: 400 },
  { code: 'CSC 501', title: 'Machine Learning', department: 'Computer Science', level: 500 },
  // Information Technology
  { code: 'IFT 101', title: 'IT Fundamentals', department: 'Information Technology', level: 100 },
  { code: 'IFT 201', title: 'Networking Essentials', department: 'Information Technology', level: 200 },
  { code: 'IFT 301', title: 'Cybersecurity Fundamentals', department: 'Information Technology', level: 300 },
  { code: 'IFT 401', title: 'Cloud Computing', department: 'Information Technology', level: 400 },
];

(async () => {
  const batch = db.batch();
  for (const course of courses) {
    const ref = db.collection('courses').doc();
    batch.set(ref, { ...course, videoCount: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  await batch.commit();
  console.log(`✅  Seeded ${courses.length} courses into Firestore.`);
  process.exit(0);
})();
