import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- Superhero Avatar or Fallback Icon ---
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
  acknowledgedAt?: string | null;
  role?: string | null;
  locationError?: string | null;
  hasLocation: boolean;
};

type Props = {
  acks: Ack[];
};

const defaultCenter: [number, number] = [4.85, 7.01]; // Offshore Nigeria, or change as needed

// Get user initials (fallback avatar)
const getUserInitials = (name: string): string => {
  return name
    .split(" ")
    .filter(Boolean)
    .map(n => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
};

// Tony Stark-level color coding
const getRoleColor = (role?: string | null): string => {
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
};

export default function TeamHeadcountMap({ acks }: Props) {
  // Split into with/without location for smart display
  const acksWithLocation = acks.filter(
    ack => ack.hasLocation && ack.lat !== null && ack.lng !== null
  );
  const acksWithoutLocation = acks.filter(ack => !ack.hasLocation);

  // Center map on the first real coordinate
  const center: [number, number] =
    acksWithLocation.length > 0
      ? [acksWithLocation[0].lat!, acksWithLocation[0].lng!]
      : defaultCenter;

  return (
    <div className="w-full h-[430px] space-y-4">
      {/* Map Section */}
      <div className="w-full h-[300px] rounded-2xl shadow-xl border border-yellow-300 overflow-hidden relative z-10">
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
          {acksWithLocation.map((ack) => (
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
                    {ack.acknowledgedAt &&
                      "Acknowledged: " +
                        new Date(ack.acknowledgedAt).toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-green-600 mt-1 font-semibold">
                    ✓ Location Available
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Summary Stats */}
      <div className="flex justify-between items-center text-sm bg-gray-50 rounded-lg p-3">
        <div>
          <span className="font-semibold text-green-600">
            {acksWithLocation.length} with location
          </span>
          {acksWithoutLocation.length > 0 && (
            <span className="ml-3 font-semibold text-orange-600">
              {acksWithoutLocation.length} location denied
            </span>
          )}
        </div>
        <div className="font-bold text-gray-700">
          Total: {acks.length} acknowledged
        </div>
      </div>

      {/* Users without location - Stark smart list */}
      {acksWithoutLocation.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
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
    </div>
  );
}