import { useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, DocumentData } from "firebase/firestore";

/**
 * Listens for new ACTIVE emergencies and triggers callback with incident ID and message.
 * Triggers ONLY on the first active emergency to avoid multiple modals at once.
 * Cleans up listener on unmount.
 */
export function useGlobalEmergencyListener(
  onAlarm: (incidentId: string, message?: string) => void
) {
  // To prevent duplicate triggers for same incident
  const lastIncidentId = useRef<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "emergencies"),
      where("status", "==", "ACTIVE")
    );

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        lastIncidentId.current = null;
        return;
      }
      // Only take the FIRST active emergency for simplicity (can loop if you want all)
      const doc = snap.docs[0];
      const data = doc.data() as DocumentData;

      if (doc.id !== lastIncidentId.current) {
        lastIncidentId.current = doc.id;
        onAlarm(doc.id, data.description || "EMERGENCY! Muster required.");
      }
    });

    return () => unsub();
  }, [onAlarm]);
}