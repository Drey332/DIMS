import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  DocumentReference
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged, User } from "firebase/auth";

const PROJECT_ID = "hydrosafe-5d245";

export type OnlineStatus = "ONLINE" | "IDLE" | "OFFLINE";

export interface UserActivity {
  id: string;
  email: string;
  name: string;
  role: "GOLD" | "SILVER" | "BRONZE";
  activityStatus: OnlineStatus;
  lastSeen: Date | null;
}

interface OnlineTrackingOptions {
  idleThreshold?: number;
  offlineThreshold?: number;
  updateInterval?: number;
}

let globalCleanup: (() => void) | null = null;

export function useOnlineTracking(options?: OnlineTrackingOptions) {
  const [status, setStatus] = useState<OnlineStatus>("OFFLINE");
  const [userDocId, setUserDocId] = useState<string | null>(null);

  useEffect(() => {
    let unsubAuth: (() => void) | undefined;
    let activityTimeout: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let lastActivity = Date.now();

    const findOrCreateUserDoc = async (user: User) => {
      if (!user.email) return null;
      const q = query(
        collection(db, "projects", PROJECT_ID, "teamMembers"),
        where("email", "==", user.email)
      );
      const snap = await getDocs(q);
      let docId: string;
      if (!snap.empty) {
        // Already assigned, fetch role set by Gold/admin, and update latest name
        const teamDoc = snap.docs[0];
        docId = teamDoc.id;
        const prevData = teamDoc.data();
        await updateDoc(doc(db, "projects", PROJECT_ID, "teamMembers", docId), {
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
          activityStatus: "ONLINE",
          isActive: true,
          lastSeen: serverTimestamp(),
        });
        return { docId, role: prevData.role as "GOLD" | "SILVER" | "BRONZE" };
      } else {
        // New login, create as BRONZE
        const ref: DocumentReference = doc(collection(db, "projects", PROJECT_ID, "teamMembers"));
        await setDoc(ref, {
          email: user.email,
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
          role: "BRONZE",
          activityStatus: "ONLINE",
          isActive: true,
          lastSeen: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        return { docId: ref.id, role: "BRONZE" as "BRONZE" };
      }
    };

    const updateStatusInFirestore = async (docId: string, newStatus: OnlineStatus) => {
      try {
        const ref = doc(db, "projects", PROJECT_ID, "teamMembers", docId);
        await updateDoc(ref, {
          activityStatus: newStatus,
          lastSeen: serverTimestamp(),
        });
      } catch (e) {
        // No fatal, don't throw error in hooks
      }
    };

    unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("OFFLINE");
        setUserDocId(null);
        if (globalCleanup) globalCleanup();
        return;
      }

      const userInfo = await findOrCreateUserDoc(user);
      if (!userInfo) return;
      setUserDocId(userInfo.docId);

      if (userInfo.docId) await updateStatusInFirestore(userInfo.docId, "ONLINE");
      setStatus("ONLINE");

      const handleActivity = () => {
        lastActivity = Date.now();
        if (status !== "ONLINE") {
          setStatus("ONLINE");
          if (userInfo.docId) updateStatusInFirestore(userInfo.docId, "ONLINE");
        }
        if (activityTimeout) clearTimeout(activityTimeout);
        activityTimeout = setTimeout(() => {
          setStatus("IDLE");
          if (userInfo.docId) updateStatusInFirestore(userInfo.docId, "IDLE");
        }, options?.idleThreshold || 300000);
      };

      const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
      events.forEach((evt) => window.addEventListener(evt, handleActivity, true));
      window.addEventListener("focus", handleActivity);
      window.addEventListener("blur", () => {
        setStatus("IDLE");
        if (userInfo.docId) updateStatusInFirestore(userInfo.docId, "IDLE");
      });
      window.addEventListener("beforeunload", () => {
        setStatus("OFFLINE");
        if (userInfo.docId) updateStatusInFirestore(userInfo.docId, "OFFLINE");
      });

      intervalId = setInterval(() => {
        const now = Date.now();
        if (now - lastActivity > (options?.offlineThreshold || 600000)) {
          setStatus("OFFLINE");
          if (userInfo.docId) updateStatusInFirestore(userInfo.docId, "OFFLINE");
        } else if (
          now - lastActivity > (options?.idleThreshold || 300000) &&
          status === "ONLINE"
        ) {
          setStatus("IDLE");
          if (userInfo.docId) updateStatusInFirestore(userInfo.docId, "IDLE");
        }
      }, options?.updateInterval || 30000);

      globalCleanup = () => {
        events.forEach((evt) => window.removeEventListener(evt, handleActivity, true));
        window.removeEventListener("focus", handleActivity);
        window.removeEventListener("blur", () => {});
        window.removeEventListener("beforeunload", () => {});
        if (intervalId) clearInterval(intervalId);
        if (activityTimeout) clearTimeout(activityTimeout);
        setStatus("OFFLINE");
        if (userInfo.docId) updateStatusInFirestore(userInfo.docId, "OFFLINE");
      };
    });

    return () => {
      if (globalCleanup) globalCleanup();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  return { status, userDocId };
}

export function useTeamMembersWithStatus() {
  const [members, setMembers] = useState<UserActivity[]>([]);
  useEffect(() => {
    const q = collection(db, "projects", PROJECT_ID, "teamMembers");
    const unsub = onSnapshot(q, (snap) => {
      setMembers(
        snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            email: d.email,
            name: `${d.firstName || ""} ${d.lastName || ""}`.trim(),
            role: (d.role as "GOLD" | "SILVER" | "BRONZE") || "BRONZE",
            activityStatus: (d.activityStatus as OnlineStatus) || "OFFLINE",
            lastSeen: d.lastSeen?.toDate ? d.lastSeen.toDate() : d.lastSeen ? new Date(d.lastSeen) : null,
          };
        })
      );
    });
    return unsub;
  }, []);
  return members;
}

export function getStatusColor(status: OnlineStatus): string {
  switch (status) {
    case "ONLINE":
      return "text-green-500";
    case "IDLE":
      return "text-yellow-500";
    case "OFFLINE":
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
}

export function getStatusBadge(status: OnlineStatus): string {
  switch (status) {
    case "ONLINE":
      return "bg-green-500";
    case "IDLE":
      return "bg-yellow-500";
    case "OFFLINE":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
}