import { useState, useEffect } from 'react';
import { doc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { UserRole } from '../hooks/useRole';

const validRoles: UserRole[] = ['BRONZE', 'SILVER', 'GOLD'];

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as any).toDate === 'function') {
    try {
      return (value as any).toDate();
    } catch {
      return null;
    }
  }
  return null;
};

const toRoleOrNull = (value: unknown): UserRole => {
  if (typeof value !== 'string') return null;
  return validRoles.includes(value as UserRole) ? (value as UserRole) : null;
};

// --- Types ---
export type OnlineStatus = 'ONLINE' | 'IDLE' | 'OFFLINE';

export interface UserPresence {
  userId: string;
  status: OnlineStatus;
  lastSeen: Date;
  lastActivity: Date;
  isOnline: boolean;
  sessionRole?: UserRole;
  roleGrantedAt?: Date | null;
  lastRoleAttempt?: Date | null;
  lastRoleAttemptRole?: UserRole;
  lastRoleAttemptSuccess?: boolean | null;
}

// --- Configurable options for the tracker ---
export interface OnlineTrackingOptions {
  idleThreshold?: number;       // ms idle before "IDLE" (default: 5 min)
  offlineThreshold?: number;    // ms idle before "OFFLINE" (default: 10 min)
  updateInterval?: number;      // ms between periodic checks (default: 30 sec)
}

// --- Main tracking logic: always keep a single instance ---
let globalTracker: ReturnType<typeof createOnlineTracker> | null = null;

function createOnlineTracker(options: OnlineTrackingOptions = {}) {
  // Default values
  const idleThreshold = options.idleThreshold ?? 5 * 60 * 1000;      // 5min
  const offlineThreshold = options.offlineThreshold ?? 10 * 60 * 1000; // 10min
  const updateInterval = options.updateInterval ?? 30 * 1000;         // 30sec

  let userId: string | null = null;
  let status: OnlineStatus = 'OFFLINE';
  let lastActivity: Date = new Date();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let idleTimeout: ReturnType<typeof setTimeout> | null = null;

  function cleanup() {
    if (intervalId) clearInterval(intervalId);
    if (idleTimeout) clearTimeout(idleTimeout);
    // On logout, mark as offline
    if (userId) updateStatus('OFFLINE');
  }

  function updateStatus(newStatus: OnlineStatus) {
    if (!userId || status === newStatus) return;
    status = newStatus;
    // Firestore: Update /users/{userId} with current status and timestamps
    updateDoc(doc(db, 'users', userId), {
      status: newStatus,
      lastSeen: serverTimestamp(),
      lastActivity: lastActivity,
      isOnline: newStatus === 'ONLINE'
    }).catch((err) => {
      // First-time user (document doesn't exist): create it
      if (err.code === "not-found") {
        setDoc(doc(db, 'users', userId!), {
          status: newStatus,
          lastSeen: serverTimestamp(),
          lastActivity: lastActivity,
          isOnline: newStatus === 'ONLINE'
        });
      }
    });
  }

  // --- Listen for activity on page (mouse, key, scroll, focus, etc.) ---
  function activityDetected() {
    lastActivity = new Date();
    if (status !== 'ONLINE') updateStatus('ONLINE');
    // Reset idle timeout
    if (idleTimeout) clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => updateStatus('IDLE'), idleThreshold);
  }

  // --- Setup activity listeners ---
  function addActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => document.addEventListener(event, activityDetected, true));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) updateStatus('IDLE');
      else activityDetected();
    });
    window.addEventListener('focus', activityDetected);
    window.addEventListener('blur', () => updateStatus('IDLE'));
    window.addEventListener('beforeunload', () => updateStatus('OFFLINE'));
  }

  // --- Auth and tracker main ---
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      userId = user.uid;
      status = 'ONLINE';
      lastActivity = new Date();
      addActivityListeners();
      updateStatus('ONLINE');
      // Start periodic check for idle/offline
      intervalId = setInterval(() => {
        const idleMs = Date.now() - lastActivity.getTime();
        if (idleMs > offlineThreshold) updateStatus('OFFLINE');
        else if (idleMs > idleThreshold && status === 'ONLINE') updateStatus('IDLE');
      }, updateInterval);
    } else {
      userId = null;
      cleanup();
    }
  });

  return {
    destroy: cleanup,
    getCurrentStatus: () => status,
    getLastActivity: () => lastActivity,
    unsubscribe
  };
}

// --- React hook for your own status (use this in App.tsx to always track) ---
export function useOnlineTracking(options?: OnlineTrackingOptions) {
  const [status, setStatus] = useState<OnlineStatus>('OFFLINE');
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  useEffect(() => {
    if (globalTracker) globalTracker.destroy();
    globalTracker = createOnlineTracker(options ?? {});
    // Poll for updates every second for Jarvis-level UI
    const interval = setInterval(() => {
      if (!globalTracker) return;
      setStatus(globalTracker.getCurrentStatus());
      setLastActivity(globalTracker.getLastActivity());
    }, 1000);
    return () => {
      clearInterval(interval);
      globalTracker?.destroy();
    };
  }, []);

  return { status, lastActivity };
}

// --- For getting any user's current status in real-time (for team list) ---
export function useUserOnlineStatus(userId: string) {
  const [user, setUser] = useState<UserPresence | null>(null);
  useEffect(() => {
    if (!userId) return;
    const ref = doc(db, 'users', userId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setUser({
          userId,
          status: d.status ?? 'OFFLINE',
          lastSeen: toDateOrNull(d.lastSeen) ?? new Date(),
          lastActivity: toDateOrNull(d.lastActivity) ?? new Date(),
          isOnline: d.isOnline ?? false,
          sessionRole: toRoleOrNull(d.sessionRole),
          roleGrantedAt: toDateOrNull(d.roleGrantedAt),
          lastRoleAttempt: toDateOrNull(d.lastRoleAttempt) ?? toDateOrNull(d.lastRoleAttemptRecordedAt),
          lastRoleAttemptRole: toRoleOrNull(d.lastRoleAttemptRole),
          lastRoleAttemptSuccess: typeof d.lastRoleAttemptSuccess === 'boolean' ? d.lastRoleAttemptSuccess : null,
        });
      }
    });
    return unsub;
  }, [userId]);
  return user;
}

// --- For a whole team list: pass userIds array ---
export function useTeamOnlineStatus(userIds: string[]) {
  const [users, setUsers] = useState<Record<string, UserPresence>>({});
  useEffect(() => {
    if (!userIds.length) return;
    const unsubs = userIds.map(userId =>
      onSnapshot(doc(db, 'users', userId), snap => {
        if (!snap.exists()) return;
        const d = snap.data();
        setUsers(u => ({
          ...u,
          [userId]: {
            userId,
            status: d.status ?? 'OFFLINE',
            lastSeen: toDateOrNull(d.lastSeen) ?? new Date(),
            lastActivity: toDateOrNull(d.lastActivity) ?? new Date(),
            isOnline: d.isOnline ?? false,
            sessionRole: toRoleOrNull(d.sessionRole),
            roleGrantedAt: toDateOrNull(d.roleGrantedAt),
            lastRoleAttempt: toDateOrNull(d.lastRoleAttempt) ?? toDateOrNull(d.lastRoleAttemptRecordedAt),
            lastRoleAttemptRole: toRoleOrNull(d.lastRoleAttemptRole),
            lastRoleAttemptSuccess: typeof d.lastRoleAttemptSuccess === 'boolean' ? d.lastRoleAttemptSuccess : null,
          }
        }));
      })
    );
    return () => { unsubs.forEach(u => u()); };
  }, [userIds]);
  return users;
}

// --- UI utils for your "Jarvis-level" badges ---
export function getStatusBadge(status: OnlineStatus) {
  switch (status) {
    case 'ONLINE': return 'bg-green-500 text-white';
    case 'IDLE': return 'bg-yellow-500 text-black';
    case 'OFFLINE': return 'bg-gray-400 text-white';
    default: return 'bg-gray-300';
  }
}
export function getStatusText(status: OnlineStatus) {
  switch (status) {
    case 'ONLINE': return 'Online';
    case 'IDLE': return 'Idle';
    case 'OFFLINE': return 'Offline';
    default: return 'Unknown';
  }
}
export function formatLastSeen(date: Date) {
  const now = Date.now(), ms = now - date.getTime();
  if (ms < 60_000) return "Just now";
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 24 * 60 * 60_000) return `${Math.floor(ms / (60 * 60_000))}h ago`;
  return `${Math.floor(ms / (24 * 60 * 60_000))}d ago`;
}