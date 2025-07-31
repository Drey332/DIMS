import { useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, DocumentData } from "firebase/firestore";

/**
 * Listens for new ACTIVE emergencies and triggers callback with incident ID and message.
 * Cleans up listener on unmount.
 */
export function useGlobalEmergencyListener(
  onAlarm: (incidentId: string, message?: string) => void
) {
  useEffect(() => {
    const q = query(
      collection(db, "emergencies"),
      where("status", "==", "ACTIVE")
    );

    const unsub = onSnapshot(q, (snap) => {
      // Only trigger on first doc (most recent/first active), or all if you want
      snap.docs.forEach((doc) => {
        const data = doc.data() as DocumentData;
        onAlarm(doc.id, data.description || "EMERGENCY! Muster required.");
      });
    });

    return () => unsub();
  }, [onAlarm]);
}