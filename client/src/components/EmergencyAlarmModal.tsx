// client/src/components/EmergencyAlarmModal.tsx

import React, { useEffect, useRef, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

// Accept ackList and ackInProgress from the hook!
interface EmergencyAlarmModalProps {
  open: boolean;
  onAcknowledge: () => void;
  message?: string;
  incidentId: string | null;
  ackList?: Array<{
    userId: string;
    name: string;
    acknowledgedAt?: string | null;
    avatarUrl?: string | null;
    email?: string | null;
    lat?: number | null;
    lng?: number | null;
  }>;
  ackInProgress?: boolean;
}

const SIREN_SRC = "/siren.mp3";

// --- Visual alarm spinner ---
const FlashIcon = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" style={{
    animation: "spin 1.8s linear infinite"
  }}>
    <circle cx="40" cy="40" r="35" stroke="#ff2222" strokeWidth="7" fill="none" />
    <polygon points="40,12 50,45 35,45 45,68" fill="#ff2222" style={{
      filter: "drop-shadow(0 0 18px #ff2222cc)"
    }} />
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg);}
        100% { transform: rotate(360deg);}
      }
    `}</style>
  </svg>
);

// --- Emergency Alarm Modal (super user-centric, global muster logic) ---
const EmergencyAlarmModal: React.FC<EmergencyAlarmModalProps> = ({
  open,
  onAcknowledge,
  message,
  incidentId,
  ackList = [],
  ackInProgress: externalAckInProgress = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isFullscreen, setFullscreen] = useState(false);
  const vibrateRef = useRef<NodeJS.Timeout | null>(null);
  const [ackInProgress, setAckInProgress] = useState(false);
  const [locationState, setLocationState] = useState<"idle"|"prompt"|"granted"|"denied"|"failed">( "idle" );

  // Use externalAckInProgress if provided
  const isAcking = ackInProgress || externalAckInProgress;

  // --- UX/ALARM EFFECTS ---
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("stark-alarm-active");
    document.body.style.overflow = "hidden";

    // Vibrate pattern (looped, disables on close)
    function startVibrate() {
      if ("vibrate" in navigator) {
        navigator.vibrate([1000, 300, 1200, 500, 2000]);
        vibrateRef.current = setInterval(() => {
          navigator.vibrate([1000, 300, 1200, 500, 2000]);
        }, 4000) as unknown as NodeJS.Timeout;
      }
    }
    startVibrate();

    // Siren (nonstop until ack)
    function playSiren() {
      try {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.volume = 1;
          audioRef.current.play().catch(() => {});
        }
      } catch {}
    }
    playSiren();

    // Browser notification (with interaction required)
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("🚨 EMERGENCY ALERT 🚨", {
          body: message || "Immediate response required!",
          requireInteraction: true,
          icon: "/alert-icon.png"
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            new Notification("🚨 EMERGENCY ALERT 🚨", {
              body: message || "Immediate response required!",
              requireInteraction: true,
              icon: "/alert-icon.png"
            });
          }
        });
      }
    }

    // Try to enter fullscreen for true "do not ignore" effect
    const el = document.documentElement as any;
    if (el.requestFullscreen) {
      el.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    }

    // Prevent accidental closing (before ack)
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // Cleanup on close/ack
    return () => {
      document.body.classList.remove("stark-alarm-active");
      document.body.style.overflow = "";
      if (vibrateRef.current) clearInterval(vibrateRef.current);
      if ("vibrate" in navigator) navigator.vibrate?.(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      try {
        if (
          isFullscreen &&
          document.fullscreenElement &&
          document.exitFullscreen
        ) {
          document.exitFullscreen();
        }
      } catch {}
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
    // eslint-disable-next-line
  }, [open, message, isFullscreen]);

  // --- Handle Acknowledge Button ---
  const handleAcknowledge = async () => {
    setAckInProgress(true);
    setLocationState("prompt");
    try {
      if (!incidentId) throw new Error("No incidentId provided!");

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("You must be signed in!");

      let lat: number | null = null, lng: number | null = null;
      let gotLocation = false;

      // Try geolocation (for muster tracking!)
      if ("geolocation" in navigator) {
        try {
          // Native browser prompt
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          gotLocation = true;
          setLocationState("granted");
        } catch (e) {
          setLocationState("denied");
        }
      } else {
        setLocationState("failed");
      }

      // Write ack to Firestore, including live location (even if denied)
      await setDoc(
        doc(db, "emergencies", incidentId, "acks", user.uid),
        {
          userId: user.uid,
          name: user.displayName || user.email || "Unknown",
          avatarUrl: user.photoURL || "",
          email: user.email || "",
          lat,
          lng,
          hasLocation: !!(lat !== null && lng !== null && gotLocation),
          acknowledgedAt: new Date().toISOString(),
          time: Date.now(),
        },
        { merge: true }
      );

      setAckInProgress(false);

      // Exit fullscreen (if any)
      if (
        isFullscreen &&
        document.fullscreenElement &&
        document.exitFullscreen
      ) {
        document.exitFullscreen();
      }
      onAcknowledge();
    } catch (err: any) {
      setAckInProgress(false);
      setLocationState("failed");
      alert("Could not acknowledge. Please try again.\n" + (err?.message || ""));
    }
  };

  // ---- JARVIS-LEVEL: List all mustered users ----
  const renderAckList = () => {
    if (!ackList || ackList.length === 0) return null;
    return (
      <div style={{
        background: "#20112a", color: "#ffd6db", padding: 14, borderRadius: 16,
        marginTop: 24, marginBottom: 8, textAlign: "left", maxWidth: 390, marginLeft: "auto", marginRight: "auto"
      }}>
        <strong>⚡ Mustered Personnel:</strong>
        <ul style={{ margin: "6px 0 0 0", padding: 0, listStyle: "none" }}>
          {ackList.map((ack, idx) => (
            <li key={ack.userId} style={{
              margin: "6px 0",
              padding: "0 0 0 10px",
              borderLeft: "3px solid #ff2c2c",
              fontWeight: 700,
              display: "flex", alignItems: "center"
            }}>
              <span style={{
                width: 26, height: 26, display: "inline-block", marginRight: 10,
                background: "#222", borderRadius: "100%", overflow: "hidden", textAlign: "center"
              }}>
                {ack.avatarUrl ? (
                  <img src={ack.avatarUrl} alt={ack.name} style={{
                    width: "100%", height: "100%", objectFit: "cover"
                  }} />
                ) : (
                  <span style={{ fontSize: 15, color: "#ffbcbc", lineHeight: "26px" }}>
                    {ack.name?.[0] || "?"}
                  </span>
                )}
              </span>
              <span>{ack.name || ack.email || "Unknown User"}</span>
              <span style={{ fontSize: 11, marginLeft: "auto", opacity: 0.8 }}>
                {ack.acknowledgedAt
                  ? new Date(ack.acknowledgedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : ""}
              </span>
            </li>
          ))}
        </ul>
        <div style={{ fontSize: 13, marginTop: 4, color: "#ffd6db", fontWeight: 600 }}>
          {ackList.length} mustered {ackList.length === 1 ? "person" : "people"} so far.
        </div>
      </div>
    );
  };

  return !open ? null : (
    <>
      {/* Siren Sound */}
      <audio ref={audioRef} src={SIREN_SRC} loop preload="auto" />
      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          background: "rgba(0,0,0,0.96)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "all",
          animation: "strobe-bg 0.55s infinite alternate"
        }}
        aria-modal="true"
        tabIndex={-1}
        role="alertdialog"
      >
        <div
          style={{
            marginBottom: 18,
            animation: "flash-icon 0.66s alternate infinite",
            filter: "drop-shadow(0 0 28px #ff2929cc)"
          }}
        >
          <FlashIcon />
        </div>
        <div
          style={{
            maxWidth: 480,
            background: "#1a0101",
            border: "8px solid #ff0000",
            borderRadius: 32,
            padding: "48px 32px 36px 32px",
            boxShadow: "0 4px 48px 8px #8b0000",
            textAlign: "center",
            animation: "pulse 1.2s infinite"
          }}
        >
          <h1
            style={{
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: 1.5,
              color: "#ff2424",
              textShadow: "0 4px 22px #000",
              marginBottom: 22,
              lineHeight: 1.18
            }}
          >
            🚨 EMERGENCY ALERT 🚨
          </h1>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 22,
              color: "#fff",
              letterSpacing: 0.3
            }}
          >
            {message ||
              "A critical incident has been declared. Follow muster instructions and acknowledge immediately!"}
          </div>
          {/* Location state info */}
          {locationState === "denied" && (
            <div style={{ color: "#ffe9d6", background: "#A13", padding: 12, borderRadius: 9, marginBottom: 10, fontSize: 15 }}>
              Location permission denied or failed.<br/>
              <b>You are still counted as mustered, but your location will not be visible to the command team.</b>
            </div>
          )}
          {locationState === "prompt" && (
            <div style={{ color: "#fffbe6", background: "#c9a800", padding: 12, borderRadius: 9, marginBottom: 10, fontSize: 15 }}>
              Please allow location access for enhanced safety and rescue.
            </div>
          )}
          {locationState === "failed" && (
            <div style={{ color: "#ffe9d6", background: "#A13", padding: 12, borderRadius: 9, marginBottom: 10, fontSize: 15 }}>
              Location not supported or another error occurred.
            </div>
          )}

          <button
            autoFocus
            disabled={isAcking || !incidentId}
            onClick={handleAcknowledge}
            style={{
              marginTop: 20,
              background: isAcking
                ? "linear-gradient(90deg,#aaa 0%,#ddd 100%)"
                : "linear-gradient(90deg,#ff4b2b 0%,#ff416c 100%)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 25,
              border: "none",
              borderRadius: 16,
              boxShadow: "0 4px 18px 0 #d8000020",
              padding: "22px 68px",
              cursor: isAcking || !incidentId ? "not-allowed" : "pointer",
              outline: "none",
              animation: isAcking ? undefined : "button-pulse 0.9s infinite alternate"
            }}
          >
            {isAcking
              ? "ACKNOWLEDGING..."
              : !incidentId
                ? "LOADING..."
                : "ACKNOWLEDGE & MUSTER"}
          </button>
          <div
            style={{
              marginTop: 26,
              color: "#ffbcbc",
              fontSize: 16,
              textShadow: "0 0 2px #000"
            }}
          >
            The alarm will stop when acknowledged.<br />Your response is required.
          </div>
          {/* --- Jarvis: Show Live List of Acknowledged Users --- */}
          {renderAckList()}
        </div>
      </div>
      {/* CSS Animations */}
      <style>{`
        @keyframes strobe-bg {
          0% { background: #1a0101; }
          100% { background: #ff2c2c; }
        }
        @keyframes flash-icon {
          0% { filter: drop-shadow(0 0 22px #ff0); opacity: 1;}
          100% { filter: drop-shadow(0 0 42px #ff2424); opacity: 0.7;}
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 44px 8px #ff002044; }
          100% { box-shadow: 0 0 78px 14px #ff3333cc; }
        }
        @keyframes button-pulse {
          0% { box-shadow: 0 0 22px 3px #ff2c2c99;}
          100% { box-shadow: 0 0 36px 6px #ff416cdd;}
        }
        .stark-alarm-active {
          animation: strobe-bg 0.55s infinite alternate !important;
        }
      `}</style>
    </>
  );
};

export default EmergencyAlarmModal;