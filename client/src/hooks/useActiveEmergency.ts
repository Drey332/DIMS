import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, limit, FirestoreError } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Emergency: Firestore schema for emergencies
 */
export interface Emergency {
  /** Firestore doc ID */
  id: string;
  /** Emergency type (fire, gas-leak, etc) */
  type: string;
  /** Human-readable title */
  title: string;
  /** Description/details of the incident */
  description: string;
  /** Severity priority */
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** Emergency status */
  status: "ACTIVE" | "RESOLVED" | "CANCELLED";
  /** ISO start time (from Firestore) */
  startTime: string;
  /** Steps/protocol (plain text or markdown) */
  protocol?: string;
  /** GPS muster point (if any) */
  musterPoint?: { lat: number; lng: number };
  /** Contacted team */
  notifiedContacts?: Array<{
    roleKey: string;
    name: string;
    phone: string;
    title: string;
  }>;
  /** Creation date/time (from Firestore) */
  createdAt: string;
}

/**
 * Result of the useActiveEmergency hook.
 */
export interface UseActiveEmergencyResult {
  /** The most recent active emergency, or null */
  emergency: Emergency | null;
  /** Loading state (initially true) */
  loading: boolean;
  /** Firestore or network error (if any) */
  error: FirestoreError | null;
}

/**
 * Real-time Firestore hook for the most recent ACTIVE emergency.
 * Returns { emergency, loading, error }.
 *
 * Usage:
 *   const { emergency, loading, error } = useActiveEmergency();
 */
export function useActiveEmergency(): UseActiveEmergencyResult {
  const [emergency, setEmergency] = useState<Emergency | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    // Query for active emergencies, newest first
    const emergenciesRef = collection(db, "emergencies");
    const q = query(
      emergenciesRef,
      where("status", "==", "ACTIVE"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setLoading(false);
        if (snapshot.empty) {
          setEmergency(null);
        } else {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();

          // Fallbacks/defaults for missing fields
          setEmergency({
            id: docSnap.id,
            type: data.type || "Unknown",
            title: data.title || "Untitled Emergency",
            description: data.description || "",
            priority: data.priority || "LOW",
            status: data.status || "ACTIVE",
            startTime: data.startTime || new Date().toISOString(),
            protocol: data.protocol,
            musterPoint: data.musterPoint,
            notifiedContacts: data.notifiedContacts,
            createdAt: data.createdAt || new Date().toISOString(),
          });
        }
        setError(null);
      },
      (err: FirestoreError) => {
        setLoading(false);
        setError(err);
        setEmergency(null);
        console.error("Error listening for active emergencies:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  return { emergency, loading, error };
}