// PostAcknowledgmentERPModal.tsx

import React, { useState, useEffect } from "react";
import { getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { X, Phone, Hospital, Shield, User, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils"; // Optional, for classNames, or remove if not using Tailwind

// --- Types ---
type ERPProtocol = {
  id?: string;
  keywords: string;
  type: string;
  notify: string[] | string;
  protocol: string;
};

type EmergencyContact = {
  id?: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  contactType?: "HOSPITAL" | "POLICE" | "MEDEVAC" | "MARINE_RESCUE" | "OTHER";
};

type NotifyContact = {
  name: string;
  phone?: string;
  role?: string;
  title?: string;
  email?: string;
};

type PostAcknowledgmentERPModalProps = {
  open: boolean;
  onClose: () => void;
  emergencyId: string;
  emergencyTitle: string;
  emergencyLocation?: string;
  emergencyType?: string;
  notifiedContacts?: NotifyContact[];
  projectId?: string;
};

function ERPProtocolAndContactsView({
  erpProtocol,
  notifyContacts,
  emergencyContacts,
  emergencyTitle,
  emergencyLocation,
}: {
  erpProtocol: ERPProtocol | null;
  notifyContacts?: NotifyContact[];
  emergencyContacts: EmergencyContact[];
  emergencyTitle: string;
  emergencyLocation?: string;
}) {
  // Helper to get icon for contact type
  const getContactIcon = (type: string) => {
    switch (type) {
      case "HOSPITAL": return <Hospital className="text-red-600 w-6 h-6" />;
      case "POLICE": return <Shield className="text-blue-600 w-6 h-6" />;
      case "MEDEVAC": return <User className="text-orange-500 w-6 h-6" />;
      case "MARINE_RESCUE": return <AlertTriangle className="text-sky-600 w-6 h-6" />;
      default: return <Phone className="text-gray-600 w-6 h-6" />;
    }
  };

  return (
    <div className="p-2 sm:p-5">
      <h2 className="font-extrabold text-2xl text-hydro-dark mb-2 flex items-center gap-2">
        🚨 Emergency Response Protocol
      </h2>
      <div className="mb-2 text-lg font-bold">
        {emergencyTitle}
        {emergencyLocation && (
          <span className="ml-3 text-base font-medium text-gray-500">({emergencyLocation})</span>
        )}
      </div>
      {/* Protocol Steps */}
      {erpProtocol ? (
        <div className="mb-6">
          <div className="font-semibold text-gray-700 mb-1">Response Steps:</div>
          <ol className="list-decimal ml-6 space-y-2">
            {(erpProtocol.protocol || "")
              .split(/\s*\d+\.\s+/)
              .filter(Boolean)
              .map((step, idx) => (
                <li key={idx} className="text-hydro-dark font-medium">{step.trim()}</li>
              ))}
          </ol>
        </div>
      ) : (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded mb-6">
          No ERP protocol found for this emergency type.
        </div>
      )}

      {/* Who to Notify */}
      {notifyContacts && notifyContacts.length > 0 && (
        <div className="mb-6">
          <div className="font-semibold text-hydro-dark mb-2">Project Team to Notify:</div>
          <ul className="space-y-2">
            {notifyContacts.map((nc, i) => (
              <li key={i} className="flex items-center gap-3">
                <User className="text-blue-700 w-5 h-5" />
                <span className="font-bold">{nc.name}</span>
                {nc.role && (
                  <span className="ml-2 px-2 py-0.5 rounded text-xs bg-gray-100 border font-medium">{nc.role}</span>
                )}
                {nc.phone && (
                  <a
                    href={`tel:${nc.phone}`}
                    className="ml-3 px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded hover:underline"
                  >
                    {nc.phone}
                  </a>
                )}
                {nc.email && (
                  <a
                    href={`mailto:${nc.email}`}
                    className="ml-2 text-xs text-gray-500 underline"
                  >
                    {nc.email}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Emergency Contacts from Project Setup */}
      {emergencyContacts && emergencyContacts.length > 0 && (
        <div className="mb-1">
          <div className="font-semibold text-hydro-dark mb-2">Emergency Assets & External Contacts:</div>
          <ul className="space-y-2">
            {emergencyContacts.map((c) => (
              <li key={c.id || c.phone} className="flex items-center gap-3 border p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                <span>{getContactIcon(c.contactType || "")}</span>
                <span className="font-bold">{c.name}</span>
                {c.role && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200">{c.role}</span>}
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    className="ml-3 px-2 py-0.5 bg-green-50 text-green-800 rounded font-bold hover:underline"
                  >
                    {c.phone}
                  </a>
                )}
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="ml-2 text-xs text-gray-500 underline"
                  >
                    {c.email}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PostAcknowledgmentERPModal({
  open,
  onClose,
  emergencyId,
  emergencyTitle,
  emergencyLocation,
  emergencyType,
  notifiedContacts = [],
  projectId = "hydrosafe-5d245"
}: PostAcknowledgmentERPModalProps) {
  const [erpProtocol, setErpProtocol] = useState<ERPProtocol | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch ERP protocols and emergency contacts when modal opens
  useEffect(() => {
    if (!open || !emergencyType) return;

    async function fetchERPData() {
      setLoading(true);
      try {
        // 1. ERP Protocol by type
        const erpQuery = query(
          collection(db, "projects", projectId, "erpProtocols"),
          where("type", "==", emergencyType)
        );
        const erpSnapshot = await getDocs(erpQuery);

        if (!erpSnapshot.empty) {
          const erpData = erpSnapshot.docs[0].data() as ERPProtocol;
          setErpProtocol({ ...erpData, id: erpSnapshot.docs[0].id });
        } else {
          // 2. Fallback: Find by keyword match
          const allErpSnapshot = await getDocs(collection(db, "projects", projectId, "erpProtocols"));
          for (const doc of allErpSnapshot.docs) {
            const data = doc.data() as ERPProtocol;
            const keywords = (data.keywords || "").toLowerCase().split(",");
            const titleLower = emergencyTitle.toLowerCase();
            if (keywords.some((kw) => titleLower.includes(kw.trim()))) {
              setErpProtocol({ ...data, id: doc.id });
              break;
            }
          }
        }

        // 3. Emergency/external contacts
        const contactsSnapshot = await getDocs(collection(db, "projects", projectId, "contacts"));
        setEmergencyContacts(
          contactsSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as EmergencyContact))
        );
      } catch (error) {
        console.error("Failed to fetch ERP data:", error);
      }
      setLoading(false);
    }

    fetchERPData();
  }, [open, emergencyType, emergencyTitle, projectId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full relative p-1 sm:p-5">
        <button
          className="absolute right-6 top-5 text-gray-400 hover:text-red-600 font-bold text-3xl"
          onClick={onClose}
          title="Close"
          style={{ lineHeight: 1, zIndex: 100 }}
        >
          <X />
        </button>
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <span className="font-semibold text-gray-700">Loading emergency protocol...</span>
          </div>
        ) : (
          <ERPProtocolAndContactsView
            erpProtocol={erpProtocol}
            notifyContacts={notifiedContacts}
            emergencyContacts={emergencyContacts}
            emergencyTitle={emergencyTitle}
            emergencyLocation={emergencyLocation}
          />
        )}
      </div>
    </div>
  );
}

export default PostAcknowledgmentERPModal;