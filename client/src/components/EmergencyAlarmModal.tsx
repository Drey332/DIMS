import React, { useEffect, useRef, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

// Props interface (explicit typing)
interface EmergencyAlarmModalProps {
  open: boolean;
  onAcknowledge: () => void;
  message?: string;
  alarmId: string;
}

const SIREN_SRC = "/siren.mp3";

const FlashIcon: React.FC = () => (
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

const EmergencyAlarmModal: React.FC<EmergencyAlarmModalProps> = ({
  open,
  onAcknowledge,
  message,
  alarmId
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isFullscreen, setFullscreen] = useState(false);
  const vibrateRef = useRef<NodeJS.Timeout | null>(null);
  const [ackInProgress, setAckInProgress] = useState(false);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add("stark-alarm-active");
    document.body.style.overflow = "hidden";

    // --- Vibrate ---
    function startVibrate() {
      if ("vibrate" in navigator) {
        navigator.vibrate([1000, 300, 1200, 500, 2000]);
        vibrateRef.current = setInterval(() => {
          navigator.vibrate([1000, 300, 1200, 500, 2000]);
        }, 4000) as unknown as NodeJS.Timeout;
      }
    }
    startVibrate();

    // --- Siren sound ---
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

    // --- Amber-style notification ---
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

    // --- Fullscreen (ultra-lock) ---
    const el = document.documentElement as any;
    if (el.requestFullscreen) {
      el.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    }

    // --- Prevent accidental closing ---
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // --- CLEANUP ---
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

  if (!open) return null;

  // ACK & WRITE to Firestore
  const handleAcknowledge = async () => {
    setAckInProgress(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("You must be signed in!");
      if (!alarmId) throw new Error("Missing alarm ID!");

      let gps: { lat: number; lng: number } | null = null;
      if ("geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 })
          );
          gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch { /* skip location if denied */ }
      }
      await setDoc(
        doc(db, "alarms", alarmId, "acks", user.uid),
        {
          userId: user.uid,
          name: user.displayName || user.email || "Unknown",
          photoURL: user.photoURL || "",
          gps,
          time: Date.now()
        },
        { merge: true }
      );
      setAckInProgress(false);
      // Close fullscreen
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
      alert("Could not acknowledge. Please try again.\n" + (err?.message || ""));
    }
  };

  return (
    <>
      {/* Siren Sound */}
      <audio ref={audioRef} src={SIREN_SRC} loop preload="auto" />
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
          <button
            autoFocus
            disabled={ackInProgress}
            onClick={handleAcknowledge}
            style={{
              marginTop: 20,
              background: ackInProgress
                ? "linear-gradient(90deg,#aaa 0%,#ddd 100%)"
                : "linear-gradient(90deg,#ff4b2b 0%,#ff416c 100%)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 25,
              border: "none",
              borderRadius: 16,
              boxShadow: "0 4px 18px 0 #d8000020",
              padding: "22px 68px",
              cursor: ackInProgress ? "not-allowed" : "pointer",
              outline: "none",
              animation: ackInProgress ? undefined : "button-pulse 0.9s infinite alternate"
            }}
          >
            {ackInProgress ? "ACKNOWLEDGING..." : "ACKNOWLEDGE & MUSTER"}
          </button>
          <div
            style={{
              marginTop: 26,
              color: "#ffbcbc",
              fontSize: 16,
              textShadow: "0 0 2px #000"
            }}
          >
            The alarm will stop when acknowledged. <br />Your response is required.
          </div>
        </div>
      </div>
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