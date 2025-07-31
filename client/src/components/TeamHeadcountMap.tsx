import React, { useMemo, useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Helper to build map avatar icons
const getIcon = (avatarUrl?: string) =>
  new L.Icon({
    iconUrl: avatarUrl || "/avatar-default.png",
    iconSize: [46, 46],
    iconAnchor: [23, 46],
    className: "rounded-full border-2 border-yellow-500 shadow-xl",
  });

// --- TypeScript types ---
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
  acks: Ack[]; // All users who acknowledged
  teamMembers: TeamMember[]; // All assigned team members (not just mustered)
  incidentStartTime: number; // ms since epoch
  enableReplay?: boolean;
  replayWindow?: number; // ms (e.g. 2 min)
};

// Fallback: Nigeria offshore
const defaultCenter: [number, number] = [4.85, 7.01];

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

function formatAgo(ts: string | undefined | null) {
  if (!ts) return "Unknown";
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const now = Date.now();
  const diff = Math.floor((now - t) / 1000);
  if (diff < 6) return <span className="animate-pulse text-green-600">now</span>;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function formatTime(ts: number) {
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
  const [replayNow, setReplayNow] = useState(Date.now());
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 4x
  const replayAnimRef = useRef<NodeJS.Timeout | null>(null);

  // Timeline bounds
  const minTime = incidentStartTime;
  const maxTime = Date.now();

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

  // Live: find everyone mustered/not
  const musteredIds = useMemo(() => new Set(filteredAcks.map(ack => ack.userId)), [filteredAcks]);
  const onlineTeam = teamMembers; // Extend this if you want "only online"
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

  return (
    <div className="w-full h-[490px] space-y-4 grid-pattern">
      {/* Replay Controls */}
      {enableReplay && (
        <div className="flex items-center gap-3 mt-2 mb-1 px-2 py-3 glassy-card animate-glow neon-border">
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
            onChange={e => setReplayNow(Number(e.target.value))}
            className="flex-1 mx-4"
          />
          <span className="text-sm text-gray-200 font-bold">{formatTime(replayNow)}</span>
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
          {/* Show all acknowledged with location */}
          {acksWithLocation.map((ack, idx) => {
            // Pulse if "just acknowledged" in last 5 seconds of replay window
            const t = ack.time || (ack.acknowledgedAt ? new Date(ack.acknowledgedAt).getTime() : 0);
            const isRecent =
              enableReplay && Math.abs(replayNow - t) < 5500 ||
              !enableReplay && Date.now() - t < 5500;

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
                      Acknowledged: {ack.acknowledgedAt && formatAgo(ack.acknowledgedAt)}
                    </div>
                    <div className="text-xs text-green-600 mt-1 font-semibold">
                      ✓ Location Available
                    </div>
                  </div>
                </Popup>
                {/* Pulse animation for recent acknowledges */}
                {isRecent && (
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

      {/* Summary Stats */}
      <div className="flex justify-between items-center text-sm glassy-card p-3">
        <div>
          <span className="font-semibold neon-text">
            {acksWithLocation.length} with location
          </span>
          {acksWithoutLocation.length > 0 && (
            <span className="ml-3 font-semibold text-orange-400 animate-glow">
              {acksWithoutLocation.length} location denied
            </span>
          )}
        </div>
        <div className="font-bold holographic">
          Total: {filteredAcks.length} acknowledged
        </div>
      </div>

      {/* Users without location */}
      {acksWithoutLocation.length > 0 && (
        <div className="glassy-card border-orange-400/50 p-3">
          <h4 className="font-semibold text-orange-800 mb-2 text-sm flex items-center gap-2">
            <span role="img" aria-label="location">
              📍
            </span>
            Acknowledged (Location Unavailable):
          </h4>
          <div className="flex flex-wrap gap-2">
            {acksWithoutLocation.map((ack) => (
              <div
                key={ack.id}
                className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full border border-orange-300 text-sm"
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
              </div>
            ))}
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
            Waiting for Muster:
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
                <span className="font-medium text-gray-900">{tm.firstName} {tm.lastName}</span>
                {tm.role && (
                  <span className="text-xs bg-gray-300 text-gray-700 px-1 rounded">
                    {tm.role}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            These team members are online but have NOT acknowledged the emergency.
          </p>
        </div>
      )}

      {/* Advanced Muster Analytics */}
      <div className="mt-4 glassy-card px-4 py-3 text-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="holographic text-2xl font-bold">
            {onlineTeam.length > 0
              ? Math.round((filteredAcks.length / onlineTeam.length) * 100)
              : 0}%
          </div>
          <div className="neon-text text-xs">Mustered</div>
          <div className="text-gray-400 text-xs">
            {filteredAcks.length}/{onlineTeam.length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-cyan-400 text-2xl font-bold animate-glow">
            {avgResponse > 0 ? `${avgResponse}s` : "—"}
          </div>
          <div className="neon-text text-xs">Avg. Response</div>
          <div className="text-gray-400 text-xs">Time</div>
        </div>
        <div className="text-center">
          <div className="text-green-400 text-lg font-bold">
            {fastestAck ? getUserInitials(fastestAck.name) : "—"}
          </div>
          <div className="neon-text text-xs">Fastest</div>
          <div className="text-gray-400 text-xs">
            {fastestAck?.acknowledgedAt ? formatAgo(fastestAck.acknowledgedAt) : "—"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-purple-400 text-xl font-bold">
            {acksWithLocation.length}
          </div>
          <div className="neon-text text-xs">GPS Tracked</div>
          <div className="text-gray-400 text-xs">Locations</div>
        </div>
      </div>
    </div>
  );
}