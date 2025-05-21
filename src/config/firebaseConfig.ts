// src/config/firebaseConfig.ts
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth'; // Removed connectAuthEmulator
import { getFirestore, Firestore } from 'firebase/firestore'; // Removed connectFirestoreEmulator
import { getFunctions, Functions } from 'firebase/functions'; // Removed connectFunctionsEmulator

// Your actual Firebase project configuration - this remains the same
const firebaseConfig = {
  apiKey: "AIzaSyC0GGjBffIp6u0lGQwcd1bkmQQXtlMMxmU",
  authDomain: "quotecraftv6.firebaseapp.com",
  projectId: "quotecraftv6",
  storageBucket: "quotecraftv6.appspot.com",
  messagingSenderId: "129563458138",
  appId: "1:129563458138:web:1377eb99fadab4250ff663",
  measurementId: "G-H51XSBDHW3"
};

const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const functionsInstance: Functions = getFunctions(app, 'australia-southeast1'); // Your specified region

// --- Emulator Configuration REMOVED/COMMENTED OUT ---

// const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
// const isIDXEnvironment = currentHostname.includes("cloudworkstations.dev") || currentHostname.includes("idx.dev");
// const isTrueLocalhost = currentHostname === "localhost" || currentHostname === "127.0.0.1";
// const IS_DEVELOPMENT_MODE = import.meta.env.DEV;

// if (IS_DEVELOPMENT_MODE) {
//     if (isIDXEnvironment) {
//         console.warn(`Firebase Config: IDX Environment Detected (${currentHostname}). Emulator connections are now DISABLED for live development.`);
//         // Emulator connection logic has been removed/commented out.
//     } else if (isTrueLocalhost) {
//         console.warn("Firebase Config: True Localhost Environment Detected. Emulator connections are now DISABLED for live development.");
//         // Emulator connection logic has been removed/commented out.
//     } else {
//         console.log(`Firebase Config: Development mode on an unrecognized host (${currentHostname}). Using LIVE services.`);
//     }
// } else {
//     console.log(`Firebase Config: PRODUCTION MODE. Using LIVE Firebase services (Hostname: ${currentHostname}).`);
// }

// Always log that we are connecting to live services when emulators are not explicitly configured.
console.log("Firebase Config: Connecting to LIVE Firebase services. Emulator connections are disabled.");

export { app, auth, db, functionsInstance as functions };
