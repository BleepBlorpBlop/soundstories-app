import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // ADD THIS LINE

const firebaseConfig = {
  apiKey: "AIzaSyC_FUUDRrfSkAcd3oVPu61Mn4i4IeNlZpg",
  authDomain: "soundstories-app.firebaseapp.com",
  projectId: "soundstories-app",
  storageBucket: "soundstories-app.firebasestorage.app",
  messagingSenderId: "147319926825",
  appId: "1:147319926825:web:1d95f6afa5513ddb7dac38"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // ADD THIS LINE