import React, { useMemo, useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- Helper to build map avatar icons ---
const getIcon = (avatarUrl?: string) =>
  new L.Icon({
    iconUrl: avatarUrl || "/avatar-default.png",
    iconSize: [46, 46],
    iconAnchor: [23, 46],
    className: "rounded-full border-2 border-yellow-500 shadow-xl",
  });

type Ack = {
  id: string;
  userId: string;
  name: string;
  lat: number | null;
  lng: number | null;
  avatarUrl?: string | null;
  email?: string | null;
  acknowledgedAt?: string | null; // ISO string
  role?: string | null;
  locationError?: string | null;
  hasLocation: boolean;
  time?: number; // ms (legacy support)
};

type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  avatarUrl?: string;
};

type Props = {
  acks: Ack[];
  teamMembers: TeamMember[];
  incidentStartTime: number;
  enableReplay?: boolean;
  replayWindow?: number;
};

// Lagos, Nigeria center
const defaultCenter: [number, number] = [6.5244, 3.3792];
function getUserInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map(n => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

function getRoleColor(role?: string | null): string {
  switch (role) {
    case "GOLD":
      return "border-yellow-500 bg-yellow-100";
    case "SILVER":
      return "border-gray-400 bg-gray-100";
    case "BRONZE":
      return "border-orange-500 bg-orange-100";
    default:
      return "border-blue-500 bg-blue-100";
  }
}

// Render seconds since incident start
function formatSeconds(ts: number, base: number) {
  const s = Math.round((ts - base) / 1000);
  return (s > 0 ? "+" : "") + s + "s";
}

function formatClock(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const REPLAY_SPEEDS = [1, 2, 4];

export default function TeamHeadcountMap({
  acks,
  teamMembers,
  incidentStartTime,
  enableReplay = false,
  replayWindow = 2 * 60 * 1000,
}: Props) {
  // --- Replay Mode State ---
  const [replayNow, setReplayNow] = useState(() =>
    enableReplay ? incidentStartTime : Date.now()
  );
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 4x
  const replayAnimRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate replay bounds (incident start to last ack)
  const ackTimes = useMemo(
    () =>
      acks
        .map(a => a.time || (a.acknowledgedAt ? new Date(a.acknowledgedAt).getTime() : 0))
        .filter(t => t > 0)
        .sort((a, b) => a - b),
    [acks]
  );
  const minTime = incidentStartTime;
  const maxTime =
    enableReplay && ackTimes.length > 0
      ? ackTimes[ackTimes.length - 1] + 10 * 1000 // add 10s after last ack for replay finish
      : Date.now();

  // Animate replay
  useEffect(() => {
    if (enableReplay && playing) {
      replayAnimRef.current = setInterval(() => {
        setReplayNow(curr => {
          const next = curr + 1000 * speed;
          if (next >= maxTime) {
            setPlaying(false);
            return maxTime;
          }
          return next;
        });
      }, 500 / speed);
    } else if (replayAnimRef.current) {
      clearInterval(replayAnimRef.current);
    }
    return () => {
      if (replayAnimRef.current) clearInterval(replayAnimRef.current);
    };
  }, [playing, speed, enableReplay, maxTime]);

  // Only show acks up to this point (if in replay mode)
  const filteredAcks = useMemo(() => {
    if (!enableReplay) return acks;
    return acks.filter(ack => {
      const ts = ack.time || (ack.acknowledgedAt ? new Date(ack.acknowledgedAt).getTime() : 0);
      return ts && ts <= replayNow;
    });
  }, [acks, enableReplay, replayNow]);

  // Who just appeared now? (for animating/highlighting in list and on map)
  const justAppearedIds = useMemo(() => {
    if (!enableReplay) return new Set();
    const ids = new Set<string>();
    filteredAcks.forEach(ack => {
      const ts = ack.time || (ack.acknowledgedAt ? new Date(ack.acknowledgedAt).getTime() : 0);
      if (Math.abs(replayNow - ts) < 1300) {
        ids.add(ack.userId);
      }
    });
    return ids;
  }, [filteredAcks, enableReplay, replayNow]);

  // Live: find everyone mustered/not
  const musteredIds = useMemo(() => new Set(filteredAcks.map(ack => ack.userId)), [filteredAcks]);
  const onlineTeam = teamMembers;
  const notMustered = onlineTeam.filter(tm => !musteredIds.has(tm.id));

  // --- Map markers ---
  const acksWithLocation = filteredAcks.filter(a => a.hasLocation && a.lat !== null && a.lng !== null);
  const acksWithoutLocation = filteredAcks.filter(a => !a.hasLocation);
  const center: [number, number] =
    acksWithLocation.length > 0
      ? [acksWithLocation[0].lat!, acksWithLocation[0].lng!]
      : defaultCenter;

  // --- Who acknowledged fastest? ---
  const sortedAcks = [...filteredAcks].sort(
    (a, b) => ((a.time || 0) - (b.time || 0))
  );
  const fastestAck = sortedAcks[0];

  // --- Average Response Time ---
  const avgResponse =
    filteredAcks.length > 0
      ? Math.round(
          filteredAcks.reduce((acc, ack) => acc + ((ack.time || 0) - minTime), 0) /
            filteredAcks.length /
            1000
        )
      : 0;

  // --- For timeline: always show full window ---
  const canReplay = enableReplay && ackTimes.length > 0;

  // Sync replayNow to start if user opens modal
  useEffect(() => {
    if (enableReplay && !playing) {
      setReplayNow(minTime);
    }
    // eslint-disable-next-line
  }, [enableReplay]);

  // --- UI Render ---
  return (
    <div className="w-full h-[540px] space-y-4 grid-pattern relative">
      {/* --- Always render replay controls sticky at top (never disappears!) --- */}
      {canReplay && (
        <div className="flex items-center gap-3 px-2 py-3 glassy-card animate-glow neon-border sticky top-0 z-20 bg-white bg-opacity-95">
          <button
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${playing ? "border-red-500 bg-red-500/20" : "border-green-500 bg-green-500/20"} transition`}
            onClick={() => setPlaying(p => !p)}
            title={playing ? "Pause replay" : "Play replay"}
          >
            {playing ? (
              <svg width="22" height="22" viewBox="0 0 26 26"><rect x="6" y="5" width="4" height="16" fill="#ff3333"/><rect x="16" y="5" width="4" height="16" fill="#ff3333"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 26 26"><polygon points="7,5 21,13 7,21" fill="#33ff33" /></svg>
            )}
          </button>
          <input
            type="range"
            min={minTime}
            max={maxTime}
            value={replayNow}
            step={1000}
            onChange={e => {
              setReplayNow(Number(e.target.value));
              setPlaying(false);
            }}
            className="flex-1 mx-4 accent-blue-700"
          />
          <span className="text-blue-700 font-bold text-lg">{formatSeconds(replayNow, minTime)}</span>
          <span className="mx-2 text-gray-500 text-sm">{formatClock(replayNow)}</span>
          <span className="ml-2 text-yellow-400 text-xs font-bold">x{speed}</span>
          <select
            className="ml-2 text-black rounded px-2 py-1"
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
          >
            {REPLAY_SPEEDS.map(sp => (
              <option value={sp} key={sp}>{sp}x</option>
            ))}
          </select>
          <span className="ml-3 text-gray-400 text-xs">Replay Mode</span>
        </div>
      )}

      {/* Map */}
      <div className="w-full h-[300px] glassy-card overflow-hidden relative z-10">
        <MapContainer
          center={center}
          zoom={acksWithLocation.length > 0 ? 10 : 7}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom
          className="z-0"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {acksWithLocation.map((ack) => {
            const ts = ack.time || (ack.acknowledgedAt ? new Date(ack.acknowledgedAt).getTime() : 0);
            const justAppeared = justAppearedIds.has(ack.userId);
            return (
              <Marker
                key={ack.id}
                position={[ack.lat!, ack.lng!]}
                icon={getIcon(ack.avatarUrl || undefined)}
              >
                <Popup>
                  <div className="text-center min-w-[200px]">
                    {ack.avatarUrl ? (
                      <img
                        src={ack.avatarUrl}
                        className="w-12 h-12 rounded-full mx-auto border-2 border-yellow-400 shadow"
                        alt={ack.name}
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-full mx-auto border-2 border-yellow-400 shadow flex items-center justify-center font-bold text-sm ${getRoleColor(
                          ack.role
                        )}`}
                      >
                        {getUserInitials(ack.name)}
                      </div>
                    )}
                    <div className="font-bold mt-2 text-lg">{ack.name}</div>
                    {ack.role && (
                      <div className="text-yellow-700 font-semibold text-xs">
                        {ack.role}
                      </div>
                    )}
                    {ack.email && (
                      <div className="text-xs text-gray-600">{ack.email}</div>
                    )}
                    <div className="text-xs text-gray-600 mt-1">
                      Acknowledged: {formatClock(ts)} ({formatSeconds(ts, minTime)})
                    </div>
                    <div className="text-xs text-green-600 mt-1 font-semibold">
                      ✓ Location Available
                    </div>
                  </div>
                </Popup>
                {/* Pulse animation for recent acknowledges */}
                {justAppeared && (
                  <Circle
                    center={[ack.lat!, ack.lng!]}
                    radius={800}
                    pathOptions={{
                      color: "#15ff00",
                      fillColor: "#12ff2a80",
                      fillOpacity: 0.25,
                    }}
                  />
                )}
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Acknowledged List (fully synced to replay) */}
      <div className="glassy-card border-green-400/50 p-3">
        <h4 className="font-semibold text-green-800 mb-2 text-lg flex items-center gap-2">
          <span role="img" aria-label="check">✅</span>
          Acknowledged List
        </h4>
        <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
          {filteredAcks.length === 0 ? (
            <div className="text-gray-400">No one has acknowledged yet.</div>
          ) : (
            filteredAcks.map((ack) => {
              const ts = ack.time || (ack.acknowledgedAt ? new Date(ack.acknowledgedAt).getTime() : 0);
              const justAppeared = justAppearedIds.has(ack.userId);
              return (
                <div
                  key={ack.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm bg-white transition-all duration-300 ${
                    justAppeared
                      ? "border-green-500 bg-green-50 animate-[glow_1s_ease-in-out_2] ring-2 ring-green-300 shadow-lg"
                      : "border-gray-200"
                  }`}
                  style={
                    justAppeared
                      ? {
                          boxShadow: "0 0 24px 4px #22d3ee99, 0 2px 8px #0002",
                          filter: "drop-shadow(0 0 16px #00ff9966)",
                          background:
                            "linear-gradient(90deg, #d1fae5cc 0%, #f0fff4cc 100%)",
                        }
                      : {}
                  }
                >
                  <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center font-extrabold text-lg text-hydro-dark border-2 border-gray-200">
                    {getUserInitials(ack.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg truncate">
                      {ack.name}
                      <span className="ml-2 text-xs text-gray-400 uppercase">
                        (USER)
                      </span>
                      {ack.role && (
                        <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded text-gray-600 font-bold uppercase">
                          {ack.role}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {ack.email}
                    </div>
                  </div>
                  <div className="text-right min-w-[90px]">
                    <div className="text-base font-bold text-gray-700 tracking-wider">
                      {formatClock(ts)}
                    </div>
                    <div className="text-xs font-semibold text-sky-600 tracking-wider">
                      {formatSeconds(ts, minTime)}
                    </div>
                  </div>
                  {ack.hasLocation && (
                    <span className="ml-1 text-green-500 text-lg" title="Location shared">📍</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Users without location */}
      {acksWithoutLocation.length > 0 && (
        <div className="glassy-card border-orange-400/50 p-3">
          <h4 className="font-semibold text-orange-800 mb-2 text-sm flex items-center gap-2">
            <span role="img" aria-label="location">📍</span>
            Acknowledged (Location Unavailable)
          </h4>
          <div className="flex flex-wrap gap-2">
            {acksWithoutLocation.map((ack) => {
              const ts = ack.time || (ack.acknowledgedAt ? new Date(ack.acknowledgedAt).getTime() : 0);
              const justAppeared = justAppearedIds.has(ack.userId);
              return (
                <div
                  key={ack.id}
                  className={`flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full border border-orange-300 text-sm ${
                    justAppeared ? "animate-pulse bg-yellow-200" : ""
                  }`}
                >
                  {ack.avatarUrl ? (
                    <img
                      src={ack.avatarUrl}
                      className="w-6 h-6 rounded-full"
                      alt={ack.name}
                    />
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRoleColor(
                        ack.role
                      )}`}
                    >
                      {getUserInitials(ack.name)}
                    </div>
                  )}
                  <span className="font-medium text-orange-900">{ack.name}</span>
                  {ack.role && (
                    <span className="text-xs bg-orange-200 text-orange-800 px-1 rounded">
                      {ack.role}
                    </span>
                  )}
                  <span className="ml-2 text-xs text-orange-600">No Location</span>
                  <span className="ml-2 text-xs text-gray-400">{ts ? formatClock(ts) : ""}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-orange-700 mt-2">
            These team members have acknowledged the emergency but their location could not be determined.
          </p>
        </div>
      )}

            {/* Not Mustered (Online, assigned to project) */}
            {notMustered.length > 0 && (
              <div className="glassy-card border-gray-400/50 p-3 mt-2">
                <h4 className="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-2">
                  <span role="img" aria-label="not-mustered">⏳</span>
                  Waiting for Muster
                </h4>
                <div className="flex flex-wrap gap-2">
                  {notMustered.map(tm => (
                    <div
                      key={tm.id}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-200 rounded-full border border-gray-300 text-sm"
                    >
                      {tm.avatarUrl ? (
                        <img src={tm.avatarUrl} className="w-6 h-6 rounded-full" alt={tm.firstName} />
                      ) : (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gray-400 text-white">
                          {getUserInitials(`${tm.firstName ?? ""} ${tm.lastName ?? ""}`)}
                        </div>
                      )}
                      <span className="font-medium text-gray-900">
                        {tm.firstName} {tm.lastName}
                      </span>
                      {tm.role && (
                        <span className="text-xs bg-gray-300 text-gray-700 px-1 rounded ml-2">
                          {tm.role}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  These team members are online but have <span className="font-bold text-orange-700">NOT</span> acknowledged the emergency.
                </p>
              </div>
            )}

            
            </div>
            );
            }