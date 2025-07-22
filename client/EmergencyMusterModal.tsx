import React, { useRef, useEffect, useState } from "react";
import { db } from "./src/firebase";
import { useActiveEmergency } from "./src/hooks/useActiveEmergency";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ---------- Types ----------
type User = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  phone?: string;
};

const EmergencyMusterModal: React.FC<{ user: User }> = ({ user }) => {
  const { emergency, loading, error } = useActiveEmergency();

  const [action, setAction] = useState<"none" | "ack" | "sos">("none");
  const [ackTime, setAckTime] = useState<Date | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locStatus, setLocStatus] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement>(null);

  // Countdown: time since emergency started
  const [seconds, setSeconds] = useState<number>(0);
  useEffect(() => {
    if (!emergency?.startTime) return;
    const started = new Date(emergency.startTime);
    const int = setInterval(() => {
      setSeconds(Math.floor((Date.now() - started.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(int);
  }, [emergency?.startTime]);

  // Sound, vibrate, focus lock (only while modal open)
  useEffect(() => {
    if (!emergency || loading || error || action !== "none") return;
    document.body.style.overflow = "hidden";
    navigator.vibrate?.([900, 300, 900, 300, 1000]);
    audioRef.current?.play();
    const blockTab = (e: KeyboardEvent) => e.preventDefault();
    window.addEventListener("keydown", blockTab, true);
    return () => {
      document.body.style.overflow = "";
      navigator.vibrate?.(0);
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      window.removeEventListener("keydown", blockTab, true);
    };
  }, [emergency, loading, error, action]);

  // Try to get muster point location from emergency (if set)
  const musterPoint =
    emergency?.musterPoint && emergency.musterPoint.lat && emergency.musterPoint.lng
      ? { lat: emergency.musterPoint.lat, lng: emergency.musterPoint.lng }
      : null;

  // Firestore: Ack/SOS (with geolocation)
  const logMuster = async (acknowledged: boolean, sos: boolean) => {
    let latitude: number | null = null;
    let longitude: number | null = null;
    setLocStatus("Getting location...");
    if (navigator.geolocation) {
      try {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            pos => {
              latitude = pos.coords.latitude;
              longitude = pos.coords.longitude;
              setLat(latitude);
              setLng(longitude);
              setLocStatus("Location acquired!");
              resolve();
            },
            err => {
              setLocStatus("Location unavailable");
              resolve();
            },
            { enableHighAccuracy: true, timeout: 12000 }
          );
        });
      } catch {
        setLocStatus("Could not get location");
      }
    } else {
      setLocStatus("Device does not support location");
    }
    if (!emergency) return;
    await setDoc(
      doc(db, "emergencies", emergency.id, "musters", user.id),
      {
        userId: user.id,
        name: user.name,
        acknowledged,
        sos,
        ackTime: serverTimestamp(),
        lat: latitude,
        lng: longitude,
        deviceInfo: navigator.userAgent,
      },
      { merge: true }
    );
    setAckTime(new Date());
  };

  const handleAcknowledge = async () => {
    await logMuster(true, false);
    setAction("ack");
    navigator.vibrate?.(0);
    audioRef.current?.pause();
  };

  const handleSOS = async () => {
    await logMuster(false, true);
    setAction("sos");
    navigator.vibrate?.(0);
    audioRef.current?.pause();
  };

  // ---------- UI/UX: Render ----------

  if (loading) return null; // Or a loading spinner
  if (error) return null; // Or show <div>{error.message}</div>
  if (!emergency) return null;

  return (
    <AnimatePresence>
      {action === "none" && (
        <motion.div
          key="emergency-muster-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-85 z-[5000] flex items-center justify-center"
          aria-modal="true"
          role="dialog"
          tabIndex={-1}
        >
          <audio ref={audioRef} loop src="/siren.mp3" />
          <motion.div
            initial={{ scale: 0.97, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 20, opacity: 0 }}
            className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full flex flex-col items-center border-4 border-red-800"
            tabIndex={0}
            aria-labelledby="emergency-title"
          >
            <h2
              className="text-3xl font-extrabold text-red-800 mb-2 tracking-tight"
              id="emergency-title"
            >
              🚨 EMERGENCY: {emergency.type || "General"}
            </h2>
            <div className="mb-2 text-lg text-gray-900 font-bold">
              {emergency.description}
            </div>
            <div className="mb-3 text-sm text-gray-700 flex items-center gap-2">
              <span className="font-semibold">⏱️ Time since alert:</span>
              <span className="font-mono text-base">{seconds}s</span>
            </div>
            <div className="mb-5 w-full">
              <div className="font-bold text-gray-700 mb-1">
                Protocol / Steps:
              </div>
              <ol className="list-decimal pl-5 text-gray-900 font-medium space-y-2 text-base">
                {(emergency.protocol || "")
                  .split(/\n|(?:\d+\.)/)
                  .filter(Boolean)
                  .map((step: string, i: number) => (
                    <li key={i}>{step.trim()}</li>
                  ))}
              </ol>
            </div>
            <button
              onClick={handleAcknowledge}
              className="bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-400 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-xl transition-all mb-3 w-full"
              aria-label="Acknowledge and Check In"
              disabled={loading || !!error}
            >
              ✅ Acknowledge & Check In
            </button>
            <button
              onClick={handleSOS}
              className="bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-400 text-white font-bold px-8 py-3 rounded-xl shadow-xl transition-all w-full"
              aria-label="Request Help"
              disabled={loading || !!error}
            >
              🆘 Request Help / SOS
            </button>
            <div className="mt-4 text-xs text-gray-600 text-center">
              If you need special assistance or are not at your normal location,
              press <b>Request Help / SOS</b>.
            </div>
          </motion.div>
        </motion.div>
      )}

      {action === "ack" && (
        <motion.div
          key="mustered"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-85 z-[5000] flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.97, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 20, opacity: 0 }}
            className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full flex flex-col items-center"
          >
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              ✅ You are mustered!
            </h2>
            <div className="text-lg text-gray-900 mb-2">
              Stay at the muster point and await further instructions.
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Logged at {ackTime?.toLocaleTimeString() || "now"}
            </div>
            <div className="mt-4 text-gray-700 text-sm font-semibold">
              {locStatus}
            </div>
            {lat && lng && (
              <div className="mt-5 w-full">
                <div className="font-semibold text-gray-700 mb-2">
                  Your last known location:
                </div>
                <MapContainer
                  center={[lat, lng]}
                  zoom={16}
                  style={{ height: "220px", width: "100%" }}
                  scrollWheelZoom={false}
                  dragging={false}
                  doubleClickZoom={false}
                  attributionControl={false}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[lat, lng]} />
                  {musterPoint && (
                    <Marker position={[musterPoint.lat, musterPoint.lng]} />
                  )}
                </MapContainer>
                <div className="text-xs text-gray-500 mt-1">
                  (Location visible to rescue/admin team)
                </div>
                {musterPoint && (
                  <div className="mt-1 text-xs text-blue-700">
                    <b>Muster Point:</b> {musterPoint.lat}, {musterPoint.lng}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {action === "sos" && (
        <motion.div
          key="sos"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-85 z-[5000] flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.97, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 20, opacity: 0 }}
            className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full flex flex-col items-center"
          >
            <h2 className="text-2xl font-bold text-red-700 mb-2">
              🆘 SOS Sent!
            </h2>
            <div className="text-lg text-gray-900 mb-2">
              Help is on the way. Stay visible and keep calm.
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Rescue team has been notified.
            </div>
            <div className="mt-4 text-gray-700 text-sm font-semibold">
              {locStatus}
            </div>
            {lat && lng && (
              <div className="mt-5 w-full">
                <div className="font-semibold text-gray-700 mb-2">
                  Your last known location:
                </div>
                <MapContainer
                  center={[lat, lng]}
                  zoom={16}
                  style={{ height: "220px", width: "100%" }}
                  scrollWheelZoom={false}
                  dragging={false}
                  doubleClickZoom={false}
                  attributionControl={false}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[lat, lng]} />
                  {musterPoint && (
                    <Marker position={[musterPoint.lat, musterPoint.lng]} />
                  )}
                </MapContainer>
                <div className="text-xs text-gray-500 mt-1">
                  (Location visible to rescue/admin team)
                </div>
                {musterPoint && (
                  <div className="mt-1 text-xs text-blue-700">
                    <b>Muster Point:</b> {musterPoint.lat}, {musterPoint.lng}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmergencyMusterModal;