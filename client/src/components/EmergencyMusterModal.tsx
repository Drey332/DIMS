import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { User } from "@shared/schema";

interface EmergencyMusterModalProps {
  user: User;
}

const EmergencyMusterModal: React.FC<EmergencyMusterModalProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [emergencyType, setEmergencyType] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");

  // Listen for emergency signals or manual trigger
  const openModal = () => setIsOpen(true);
  const closeModal = () => {
    setIsOpen(false);
    setEmergencyType("");
    setDescription("");
    setLocation("");
    setSeverity("MEDIUM");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "emergencies"), {
        type: emergencyType,
        description,
        location,
        severity,
        reportedBy: user.id,
        reporterName: user.username,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        musterRequired: true,
      });
      
      // Trigger muster protocol
      alert("Emergency reported! Muster protocol initiated.");
      closeModal();
    } catch (error) {
      console.error("Error reporting emergency:", error);
      alert("Failed to report emergency. Please try again.");
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={openModal}
        className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-full shadow-lg z-50 hover:bg-red-700 transition-colors"
        title="Emergency Alert"
      >
        🚨
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-600">Emergency Alert</h2>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Type
            </label>
            <select
              value={emergencyType}
              onChange={(e) => setEmergencyType(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select emergency type</option>
              <option value="FIRE">Fire</option>
              <option value="MEDICAL">Medical Emergency</option>
              <option value="ABANDON_VESSEL">Abandon Vessel</option>
              <option value="MAN_OVERBOARD">Man Overboard</option>
              <option value="COLLISION">Collision</option>
              <option value="LOSS_OF_POWER">Loss of Power</option>
              <option value="SEVERE_WEATHER">Severe Weather</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="Provide details about the emergency..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="e.g., Engine Room, Deck 3, etc."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity Level
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              Report Emergency
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmergencyMusterModal;