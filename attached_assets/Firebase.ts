// attached_assets/Firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCO3AhGO9e7r83Eq-E6GPJrzqhSOAvkE2k",
  authDomain: "hydrosafe-5d245.firebaseapp.com",
  projectId: "hydrosafe-5d245",
  storageBucket: "hydrosafe-5d245.appspot.com",
  messagingSenderId: "298390526987",
  appId: "1:298390526987:web:b57befe713f2cf47577b0e",
  measurementId: "G-GPXHPG1PZK"
};

// Initialize Firebase only if no apps exist
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  // This will fail silently if multiple tabs open, private mode, etc.
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time.
    console.warn("Firestore offline persistence failed: Multiple tabs open.");
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn("Firestore offline persistence is not supported by this browser.");
  } else {
    console.warn("Firestore offline persistence error:", err);
  }
});

export { db };