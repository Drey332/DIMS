// Firebase configuration for HydroSafe OAuth authentication
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider for enhanced user info
googleProvider.addScope('email');
googleProvider.addScope('profile');