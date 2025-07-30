import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export type OnlineStatus = 'ONLINE' | 'IDLE' | 'OFFLINE';

interface UserActivity {
  userId: string;
  status: OnlineStatus;
  lastSeen: Date;
  lastActivity: Date;
  isActive: boolean;
}

interface OnlineTrackingOptions {
  idleThreshold?: number; // milliseconds before considered idle (default: 5 minutes)
  offlineThreshold?: number; // milliseconds before considered offline (default: 10 minutes)
  updateInterval?: number; // how often to update status (default: 30 seconds)
}

class OnlineTracker {
  private userId: string | null = null;
  private status: OnlineStatus = 'OFFLINE';
  private lastActivity: Date = new Date();
  private updateInterval: number;
  private idleThreshold: number;
  private offlineThreshold: number;
  private intervalId: NodeJS.Timeout | null = null;
  private activityTimeout: NodeJS.Timeout | null = null;
  private isTracking = false;

  constructor(options: OnlineTrackingOptions = {}) {
    this.updateInterval = options.updateInterval || 30000; // 30 seconds
    this.idleThreshold = options.idleThreshold || 300000; // 5 minutes
    this.offlineThreshold = options.offlineThreshold || 600000; // 10 minutes
    
    this.setupActivityListeners();
    this.setupAuthListener();
  }

  private setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.userId = user.uid;
        this.startTracking();
      } else {
        this.userId = null;
        this.stopTracking();
      }
    });
  }

  private setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      this.lastActivity = new Date();
      if (this.status !== 'ONLINE') {
        this.updateStatus('ONLINE');
      }
      
      // Reset idle timer
      if (this.activityTimeout) {
        clearTimeout(this.activityTimeout);
      }
      
      this.activityTimeout = setTimeout(() => {
        this.updateStatus('IDLE');
      }, this.idleThreshold);
    };

    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updateStatus('IDLE');
      } else {
        updateActivity();
      }
    });

    // Handle window focus/blur
    window.addEventListener('focus', updateActivity);
    window.addEventListener('blur', () => {
      this.updateStatus('IDLE');
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.updateStatus('OFFLINE');
    });
  }

  private async updateStatus(newStatus: OnlineStatus) {
    if (!this.userId || this.status === newStatus) return;
    
    this.status = newStatus;
    
    try {
      const userRef = doc(db, 'users', this.userId);
      await updateDoc(userRef, {
        status: newStatus,
        lastSeen: serverTimestamp(),
        lastActivity: this.lastActivity,
        isOnline: newStatus === 'ONLINE'
      });
    } catch (error) {
      console.error('Failed to update online status:', error);
    }
  }

  private startTracking() {
    if (this.isTracking || !this.userId) return;
    
    this.isTracking = true;
    this.updateStatus('ONLINE');
    
    // Set up periodic status updates
    this.intervalId = setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivity.getTime();
      
      if (timeSinceActivity > this.offlineThreshold) {
        this.updateStatus('OFFLINE');
      } else if (timeSinceActivity > this.idleThreshold && this.status === 'ONLINE') {
        this.updateStatus('IDLE');
      }
    }, this.updateInterval);
  }

  private stopTracking() {
    this.isTracking = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
      this.activityTimeout = null;
    }
    
    if (this.userId) {
      this.updateStatus('OFFLINE');
    }
  }

  public getCurrentStatus(): OnlineStatus {
    return this.status;
  }

  public getLastActivity(): Date {
    return this.lastActivity;
  }

  public destroy() {
    this.stopTracking();
  }
}

// Global tracker instance
let globalTracker: OnlineTracker | null = null;

export function initializeOnlineTracking(options?: OnlineTrackingOptions): OnlineTracker {
  if (globalTracker) {
    globalTracker.destroy();
  }
  
  globalTracker = new OnlineTracker(options);
  return globalTracker;
}

export function getOnlineTracker(): OnlineTracker | null {
  return globalTracker;
}

// React hook for using online tracking
export function useOnlineTracking(options?: OnlineTrackingOptions) {
  const [status, setStatus] = useState<OnlineStatus>('OFFLINE');
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  useEffect(() => {
    const tracker = initializeOnlineTracking(options);
    
    // Update local state
    const updateLocalState = () => {
      setStatus(tracker.getCurrentStatus());
      setLastActivity(tracker.getLastActivity());
    };
    
    // Initial update
    updateLocalState();
    
    // Set up periodic updates
    const interval = setInterval(updateLocalState, 1000);
    
    return () => {
      clearInterval(interval);
      tracker.destroy();
    };
  }, []);

  return { status, lastActivity };
}

// React hook for tracking other users' online status
export function useUserOnlineStatus(userId: string) {
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', userId);
    
    const unsubscribe = onSnapshot(
      userRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setUserActivity({
            userId: doc.id,
            status: data.status || 'OFFLINE',
            lastSeen: data.lastSeen?.toDate() || new Date(),
            lastActivity: data.lastActivity?.toDate() || new Date(),
            isActive: data.isOnline || false
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to user status:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { userActivity, loading };
}

// React hook for tracking multiple users' online status
export function useTeamOnlineStatus(userIds: string[]) {
  const [teamActivity, setTeamActivity] = useState<Record<string, UserActivity>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userIds.length) {
      setLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const activityData: Record<string, UserActivity> = {};

    userIds.forEach(userId => {
      const userRef = doc(db, 'users', userId);
      
      const unsubscribe = onSnapshot(
        userRef,
        (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            activityData[userId] = {
              userId: doc.id,
              status: data.status || 'OFFLINE',
              lastSeen: data.lastSeen?.toDate() || new Date(),
              lastActivity: data.lastActivity?.toDate() || new Date(),
              isActive: data.isOnline || false
            };
          }
          
          setTeamActivity({ ...activityData });
          setLoading(false);
        },
        (error) => {
          console.error(`Error listening to user ${userId} status:`, error);
        }
      );
      
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [userIds]);

  return { teamActivity, loading };
}

// Utility functions
export function getStatusColor(status: OnlineStatus): string {
  switch (status) {
    case 'ONLINE':
      return 'text-green-500';
    case 'IDLE':
      return 'text-yellow-500';
    case 'OFFLINE':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

export function getStatusBadge(status: OnlineStatus): string {
  switch (status) {
    case 'ONLINE':
      return 'bg-green-500';
    case 'IDLE':
      return 'bg-yellow-500';
    case 'OFFLINE':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
}

export function formatLastSeen(lastSeen: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

export function isUserActive(lastActivity: Date, thresholdMs: number = 300000): boolean {
  return Date.now() - lastActivity.getTime() < thresholdMs;
}