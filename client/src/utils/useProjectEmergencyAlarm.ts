import { useEffect, useRef, useState, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  Unsubscribe,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export interface EmergencyInfo {
  id: string;
  description: string;
  status: string;
  priority: string;
  startTime: string;
  acknowledged: boolean;
}

export interface AckInfo {
  userId: string;
  name: string;
  lat: number | null;
  lng: number | null;
  acknowledgedAt: string;
  email?: string;
  avatarUrl?: string;
}

interface UseProjectEmergencyAlarmOptions {
  projectId: string;
  onAlarm?: (emergency: EmergencyInfo) => void; // optional callback when alarm triggers
}

/**
 * Jarvis-level hook for real-time project emergency mustering:
 * - Only rings for active, unacknowledged emergencies.
 * - Tracks/returns the current emergency state.
 * - Handles acknowledgment and geo-location saving.
 */
export function useProjectEmergencyAlarm(options: UseProjectEmergencyAlarmOptions) {
  const { projectId, onAlarm } = options;
  const auth = getAuth();
  const [activeEmergency, setActiveEmergency] = useState<EmergencyInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ackInProgress, setAckInProgress] = useState(false);
  const [ackList, setAckList] = useState<AckInfo[]>([]);
  const alarmedEmergencies = useRef<Set<string>>(new Set());

  // Listen for ACTIVE emergencies under project
  useEffect(() => {
    if (!projectId) return;

    // Assume "emergencies" are top-level, but filter by projectId if needed.
    const q = query(
      collection(db, "emergencies"),
      where("status", "==", "ACTIVE"),
      where("projectId", "==", projectId)
    );

    let unsub: Unsubscribe | null = null;

    unsub = onSnapshot(q, async (snap) => {
      const user = auth.currentUser;
      if (!user) {
        setActiveEmergency(null);
        setIsModalOpen(false);
        return;
      }

      // Show the first active emergency the user has not acknowledged yet
      let found = false;
      for (const docSnap of snap.docs) {
        const emergencyId = docSnap.id;
        // Check if this user has already acknowledged this emergency
        const ackRef = doc(db, "emergencies", emergencyId, "acks", user.uid);
        const ackSnap = await getDoc(ackRef);
        if (!ackSnap.exists()) {
          // Not acknowledged, alarm!
          setActiveEmergency({
            id: emergencyId,
            description: docSnap.data().description || "EMERGENCY! Muster required.",
            status: docSnap.data().status,
            priority: docSnap.data().priority,
            startTime: docSnap.data().startTime,
            acknowledged: false,
          });
          setIsModalOpen(true);
          alarmedEmergencies.current.add(emergencyId);
          if (onAlarm) onAlarm({
            id: emergencyId,
            description: docSnap.data().description,
            status: docSnap.data().status,
            priority: docSnap.data().priority,
            startTime: docSnap.data().startTime,
            acknowledged: false,
          });
          found = true;
          break;
        }
      }
      if (!found) {
        setActiveEmergency(null);
        setIsModalOpen(false);
      }
    });

    return () => { unsub && unsub(); };
    // eslint-disable-next-line
  }, [projectId, auth.currentUser]);

  // Listen for ack updates (for live dashboard/headcount)
  useEffect(() => {
    if (!activeEmergency) return;
    const acksRef = collection(db, "emergencies", activeEmergency.id, "acks");
    const unsub = onSnapshot(acksRef, (snap) => {
      const list: AckInfo[] = [];
      snap.docs.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          userId: d.userId,
          name: d.name,
          lat: d.lat ?? null,
          lng: d.lng ?? null,
          acknowledgedAt: d.acknowledgedAt,
          email: d.email,
          avatarUrl: d.avatarUrl,
        });
      });
      setAckList(list);
    });
    return () => unsub();
  }, [activeEmergency?.id]);

  // --- Acknowledge function ---
  const acknowledge = useCallback(async () => {
    if (!activeEmergency) return;
    setAckInProgress(true);

    const user = auth.currentUser;
    if (!user) {
      setAckInProgress(false);
      throw new Error("You must be signed in.");
    }

    let lat: number | null = null, lng: number | null = null;
    let gotLocation = false;
    if ("geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        gotLocation = true;
      } catch {}
    }

    await setDoc(
      doc(db, "emergencies", activeEmergency.id, "acks", user.uid),
      {
        userId: user.uid,
        name: user.displayName || user.email || "Unknown",
        email: user.email || "",
        avatarUrl: user.photoURL || "",
        lat,
        lng,
        hasLocation: !!(lat !== null && lng !== null && gotLocation),
        acknowledgedAt: new Date().toISOString(),
        time: Date.now(),
      },
      { merge: true }
    );

    setAckInProgress(false);
    setIsModalOpen(false);
    setActiveEmergency(null);
  }, [activeEmergency, auth.currentUser]);

  // --- Expose API ---
  return {
    emergency: activeEmergency,
    isModalOpen,
    openModal: () => setIsModalOpen(true),
    closeModal: () => setIsModalOpen(false),
    ackList,
    acknowledge,
    ackInProgress,
  };
}