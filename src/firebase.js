import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDE09V-5kfzx1-zhKLYUxJNOUzzHQtfAfA",
  authDomain: "eduvid-7258e.firebaseapp.com",
  projectId: "eduvid-7258e",
  storageBucket: "eduvid-7258e.firebasestorage.app",
  messagingSenderId: "244718642997",
  appId: "1:244718642997:web:853fcf7064276831310e7c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
