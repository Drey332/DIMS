import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

export function useActivityTracker() {
  const { sendMessage } = useWebSocket();
  const lastActivityRef = useRef(Date.now());
  const sessionIdRef = useRef(crypto.randomUUID());

  const updateActivity = () => {
    lastActivityRef.current = Date.now();
    
    // Send activity update to server
    sendMessage({
      type: 'ACTIVITY_UPDATE',
      sessionId: sessionIdRef.current,
      timestamp: Date.now(),
      status: 'ONLINE'
    });
  };

  const handleUserActivity = () => {
    updateActivity();
  };

  useEffect(() => {
    // Initial activity update on mount
    updateActivity();

    // Activity event listeners
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    // Add throttling to prevent excessive updates
    let throttleTimer: NodeJS.Timeout | null = null;
    const throttledHandler = () => {
      if (throttleTimer) return;
      
      throttleTimer = setTimeout(() => {
        handleUserActivity();
        throttleTimer = null;
      }, 30000); // Update every 30 seconds max
    };

    events.forEach(event => {
      document.addEventListener(event, throttledHandler, true);
    });

    // Send periodic heartbeat every 2 minutes
    const heartbeatInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      // Only send heartbeat if user was recently active (within 3 minutes)
      if (timeSinceLastActivity < 3 * 60 * 1000) {
        sendMessage({
          type: 'HEARTBEAT',
          sessionId: sessionIdRef.current,
          timestamp: Date.now(),
          lastActivity: lastActivityRef.current
        });
      }
    }, 2 * 60 * 1000);

    // Send offline status when user leaves
    const handleBeforeUnload = () => {
      sendMessage({
        type: 'USER_OFFLINE',
        sessionId: sessionIdRef.current,
        timestamp: Date.now()
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Send offline status when page becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendMessage({
          type: 'USER_AWAY',
          sessionId: sessionIdRef.current,
          timestamp: Date.now()
        });
      } else {
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledHandler, true);
      });
      
      clearInterval(heartbeatInterval);
      
      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Send final offline message
      sendMessage({
        type: 'USER_OFFLINE',
        sessionId: sessionIdRef.current,
        timestamp: Date.now()
      });
    };
  }, [sendMessage]);

  return {
    sessionId: sessionIdRef.current,
    updateActivity
  };
}