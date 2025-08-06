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
  title?: string;
  location?: string;
  type?: string;
  notifiedContacts?: any[];
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

    // Listen for ALL active emergencies across all projects for global coverage
    const q = query(
      collection(db, "emergencies"),
      where("status", "==", "ACTIVE")
    );

    let unsub: Unsubscribe | null = null;

    unsub = onSnapshot(q, async (snap) => {
      const user = auth.currentUser;
      if (!user) {
        setActiveEmergency(null);
        setIsModalOpen(false);
        return;
      }

      // Check each emergency to find the first unacknowledged one
      let found = false;
      const emergencyDocs = snap.docs.sort((a, b) => {
        // Prioritize by timestamp - newest first
        const aTime = a.data().startTime ? new Date(a.data().startTime).getTime() : 0;
        const bTime = b.data().startTime ? new Date(b.data().startTime).getTime() : 0;
        return bTime - aTime;
      });

      for (const docSnap of emergencyDocs) {
        const emergencyId = docSnap.id;
        const emergencyData = docSnap.data();
        
        // CRITICAL: Check acknowledgment strictly for THIS incident and THIS user
        const ackRef = doc(db, "emergencies", emergencyId, "acks", user.uid);
        const ackSnap = await getDoc(ackRef);
        
        if (!ackSnap.exists()) {
          // Not acknowledged - this is a new emergency for this user
          const emergency = {
            id: emergencyId,
            description: emergencyData.description || "EMERGENCY! Muster required.",
            status: emergencyData.status,
            priority: emergencyData.priority || "HIGH",
            startTime: emergencyData.startTime,
            acknowledged: false,
            title: emergencyData.title || emergencyData.description,
            location: emergencyData.location,
            type: emergencyData.type,
            notifiedContacts: emergencyData.notifiedContacts || [],
          };

          setActiveEmergency(emergency);
          setIsModalOpen(true);
          
          // Only trigger alarm once per emergency
          if (!alarmedEmergencies.current.has(emergencyId)) {
            alarmedEmergencies.current.add(emergencyId);
            console.log(`🚨 NEW EMERGENCY DETECTED: ${emergencyId} for user ${user.uid}`);
            
            if (onAlarm) {
              onAlarm(emergency);
            }
          }
          
          found = true;
          break;
        }
      }
      
      if (!found) {
        setActiveEmergency(null);
        setIsModalOpen(false);
      }
    });

    return () => { 
      if (unsub) unsub(); 
    };
  }, [projectId, auth.currentUser, onAlarm]);

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

  // --- INCIDENT-SPECIFIC ACKNOWLEDGE FUNCTION ---
  const acknowledge = useCallback(async () => {
    if (!activeEmergency) {
      console.warn("No active emergency to acknowledge");
      return;
    }
    
    setAckInProgress(true);
    const user = auth.currentUser;
    
    if (!user) {
      setAckInProgress(false);
      throw new Error("You must be signed in to acknowledge emergency.");
    }

    try {
      // Get GPS location with timeout
      let lat: number | null = null, lng: number | null = null;
      let gotLocation = false;
      
      if ("geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error("Location timeout")), 8000);
            navigator.geolocation.getCurrentPosition(
              (position) => {
                clearTimeout(timeoutId);
                resolve(position);
              },
              (error) => {
                clearTimeout(timeoutId);
                reject(error);
              },
              { 
                enableHighAccuracy: true, 
                timeout: 8000, 
                maximumAge: 30000 
              }
            );
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          gotLocation = true;
        } catch (locError) {
          console.warn("Failed to get location:", locError);
        }
      }

      // CRITICAL: Store acknowledgment strictly for THIS emergency and THIS user
      const ackData = {
        userId: user.uid,
        name: user.displayName || user.email || "Unknown User",
        email: user.email || "",
        avatarUrl: user.photoURL || "",
        lat,
        lng,
        hasLocation: gotLocation,
        acknowledgedAt: new Date().toISOString(),
        time: Date.now(),
        incidentId: activeEmergency.id, // Double-check incident linkage
        role: "USER" // Could be enhanced to pull from user profile
      };

      console.log(`✅ Acknowledging emergency ${activeEmergency.id} for user ${user.uid}`);
      
      // Write to Firestore with incident-specific path
      await setDoc(
        doc(db, "emergencies", activeEmergency.id, "acks", user.uid),
        ackData,
        { merge: true }
      );

      // Close modal and clear state for this user
      setAckInProgress(false);
      setIsModalOpen(false);
      setActiveEmergency(null);
      
      console.log(`✅ Emergency ${activeEmergency.id} acknowledged successfully by ${user.uid}`);
      
    } catch (error) {
      console.error("Failed to acknowledge emergency:", error);
      setAckInProgress(false);
      throw error;
    }
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
    showERPAfterAck: false, // Will be enhanced to show ERP modal after acknowledgment
  };
}