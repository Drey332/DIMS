// attached_assets/Firebase.ts

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Paste your Firebase config here!
const firebaseConfig = {
  apiKey: "AIzaSyCO3AhGO9e7r83Eq-E6GPJrzqhSOAvkE2k",
  authDomain: "hydrosafe-5d245.firebaseapp.com",
  projectId: "hydrosafe-5d245",
  storageBucket: "hydrosafe-5d245.appspot.com",
  messagingSenderId: "298390526987",
  appId: "1:298390526987:web:b57befe713f2cf47577b0e",
  measurementId: "G-GPXHPG1PZK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and export
export const db = getFirestore(app);