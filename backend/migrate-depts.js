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

(async () => {
  console.log('Scanning existing courses for legacy departments...');
  const snap = await db.collection('courses').get();
  const depts = new Set();
  snap.docs.forEach(doc => {
    if (doc.data().department) depts.add(doc.data().department);
  });
  
  const existingSnap = await db.collection('departments').get();
  const existingDepts = new Set();
  existingSnap.docs.forEach(doc => {
    if (doc.data().name) existingDepts.add(doc.data().name);
  });

  const batch = db.batch();
  let count = 0;
  for (const dept of depts) {
    if (!existingDepts.has(dept)) {
      const ref = db.collection('departments').doc();
      batch.set(ref, { name: dept, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      count++;
    }
  }
  
  if (count > 0) {
    await batch.commit();
    console.log(`✅ Successfully migrated ${count} unique legacy departments into the departments collection!`);
  } else {
    console.log('✅ All legacy departments are already in the database.');
  }
  process.exit(0);
})();
