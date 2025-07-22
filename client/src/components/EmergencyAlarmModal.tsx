// EmergencyAlarmModal.tsx

import React, { useEffect, useRef, useState } from "react";

// Optional: Inline SVG for ultra-flashy icon
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

export default function EmergencyAlarmModal({ open, onAcknowledge, message }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isFullscreen, setFullscreen] = useState(false);

  // Strobing background and continuous vibration
  useEffect(() => {
    if (open) {
      // Add body strobe effect (Amber Alert style)
      document.body.classList.add("stark-alarm-active");
      // Freeze background scroll
      document.body.style.overflow = "hidden";
      // Continuous vibration pattern
      let vibrateInterval: any = null;
      if ("vibrate" in navigator) {
        navigator.vibrate([900, 200, 900, 400, 2000]);
        vibrateInterval = setInterval(() => {
          navigator.vibrate([900, 200, 900, 400, 2000]);
        }, 3200);
      }
      // Play loud alarm
      audioRef.current?.play();
      // Browser notification
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("🚨 EMERGENCY ALERT 🚨", {
            body: message || "Immediate response required!",
            requireInteraction: true,
            icon: "/alert-icon.png",
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification("🚨 EMERGENCY ALERT 🚨", {
                body: message || "Immediate response required!",
                requireInteraction: true,
                icon: "/alert-icon.png",
              });
            }
          });
        }
      }
      // Try to go full screen for total UI lock (user must allow)
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
      }
      window.onbeforeunload = (e) => {
        e.preventDefault();
        e.returnValue = "";
      };

      return () => {
        document.body.classList.remove("stark-alarm-active");
        document.body.style.overflow = "";
        window.onbeforeunload = null;
        if (vibrateInterval) clearInterval(vibrateInterval);
        navigator.vibrate?.(0);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        if (isFullscreen && document.exitFullscreen) document.exitFullscreen();
      };
    }
  }, [open, message, isFullscreen]);

  if (!open) return null;

  return (
    <>
      {/* --- Siren Sound --- */}
      <audio ref={audioRef} src="/siren.mp3" loop preload="auto" />
      {/* --- Fullscreen Stark Modal --- */}
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
          animation: "strobe-bg 0.55s infinite alternate",
        }}
      >
        {/* Flashing, rotating warning icon */}
        <div
          style={{
            marginBottom: 18,
            animation: "flash-icon 0.66s alternate infinite",
            filter: "drop-shadow(0 0 28px #ff2929cc)",
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
            animation: "pulse 1.2s infinite",
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
              lineHeight: 1.18,
            }}
          >
            🚨 EMERGENCY ALERT 🚨
          </h1>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 22,
            color: "#fff",
            letterSpacing: 0.3,
          }}>
            {message || "A critical incident has been declared.<br />Follow muster instructions and acknowledge immediately!"}
          </div>
          <button
            autoFocus
            onClick={() => {
              if (isFullscreen && document.exitFullscreen) document.exitFullscreen();
              onAcknowledge();
            }}
            style={{
              marginTop: 20,
              background: "linear-gradient(90deg,#ff4b2b 0%,#ff416c 100%)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 25,
              border: "none",
              borderRadius: 16,
              boxShadow: "0 4px 18px 0 #d8000020",
              padding: "22px 68px",
              cursor: "pointer",
              outline: "none",
              animation: "button-pulse 0.9s infinite alternate",
            }}
          >
            ACKNOWLEDGE & MUSTER
          </button>
          <div style={{
            marginTop: 26,
            color: "#ffbcbc",
            fontSize: 16,
            textShadow: "0 0 2px #000",
          }}>
            The alarm will stop when acknowledged. <br />Your response is required.
          </div>
        </div>
      </div>

      {/* --- Custom CSS Animations for true Stark UX --- */}
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
}