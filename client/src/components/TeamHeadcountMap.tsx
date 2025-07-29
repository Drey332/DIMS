import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom avatar marker, fallback to default if not set
const getIcon = (avatarUrl?: string) =>
  new L.Icon({
    iconUrl: avatarUrl || "/avatar-default.png", // You can place a default avatar at public/avatar-default.png
    iconSize: [46, 46],
    iconAnchor: [23, 46],
    className: "rounded-full border-2 border-yellow-500 shadow-xl"
  });

type Ack = {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  avatarUrl?: string;
  acknowledgedAt?: string;
  role?: string;
};

type Props = {
  acks: Ack[];
};

const defaultCenter: [number, number] = [4.85, 7.01]; // Offshore Nigeria, or change as needed

export default function TeamHeadcountMap({ acks }: Props) {
  // Try to center on first ack, fallback to default
  const center: [number, number] =
    acks.length > 0 && typeof acks[0].lat === "number" && typeof acks[0].lng === "number"
      ? [acks[0].lat, acks[0].lng]
      : defaultCenter;

  return (
    <div className="w-full h-[360px] rounded-2xl shadow-xl border border-yellow-300 overflow-hidden relative z-10">
      <MapContainer
        center={center}
        zoom={7}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
        className="z-0"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {acks.map((ack) => (
          <Marker
            key={ack.id}
            position={[ack.lat, ack.lng]}
            icon={getIcon(ack.avatarUrl)}
          >
            <Popup>
              <div className="text-center">
                <img
                  src={ack.avatarUrl || "/avatar-default.png"}
                  className="w-12 h-12 rounded-full mx-auto border-2 border-yellow-400 shadow"
                  alt={ack.name}
                />
                <div className="font-bold mt-2 text-lg">{ack.name || "User"}</div>
                {ack.role && (
                  <div className="text-yellow-700 font-semibold text-xs">{ack.role}</div>
                )}
                <div className="text-xs text-gray-600 mt-1">
                  {ack.acknowledgedAt &&
                    "Acknowledged: " +
                      new Date(ack.acknowledgedAt).toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}