import React, { useState, useEffect } from "react";
import { getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../firebase";
import ERPModal from "./ERPModal";

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
  type: "INTERNAL" | "EXTERNAL" | "EMERGENCY_SERVICE";
};

type PostAcknowledgmentERPModalProps = {
  open: boolean;
  onClose: () => void;
  emergencyId: string;
  emergencyTitle: string;
  emergencyLocation?: string;
  emergencyType?: string;
  notifiedContacts?: any[];
  projectId?: string;
};

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
        // Fetch matching ERP protocol
        const erpQuery = query(
          collection(db, "projects", projectId, "erpProtocols"),
          where("type", "==", emergencyType)
        );
        const erpSnapshot = await getDocs(erpQuery);
        
        if (!erpSnapshot.empty) {
          const erpData = erpSnapshot.docs[0].data() as ERPProtocol;
          setErpProtocol({ ...erpData, id: erpSnapshot.docs[0].id });
        } else {
          // Fallback: try to find by keywords
          const allErpQuery = collection(db, "projects", projectId, "erpProtocols");
          const allErpSnapshot = await getDocs(allErpQuery);
          
          for (const doc of allErpSnapshot.docs) {
            const data = doc.data() as ERPProtocol;
            const keywords = (data.keywords || "").toLowerCase().split(",");
            const titleLower = emergencyTitle.toLowerCase();
            
            if (keywords.some(keyword => titleLower.includes(keyword.trim()))) {
              setErpProtocol({ ...data, id: doc.id });
              break;
            }
          }
        }

        // Fetch emergency contacts
        const contactsQuery = collection(db, "projects", projectId, "emergencyContacts");
        const contactsSnapshot = await getDocs(contactsQuery);
        const contacts = contactsSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as EmergencyContact));
        setEmergencyContacts(contacts);

      } catch (error) {
        console.error("Failed to fetch ERP data:", error);
      }
      setLoading(false);
    }

    fetchERPData();
  }, [open, emergencyType, emergencyTitle, projectId]);

  if (!open) return null;
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading emergency protocols...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ERPModal
      open={open}
      onClose={onClose}
      erpProtocol={erpProtocol}
      notifyContacts={notifiedContacts}
      emergencyContacts={emergencyContacts}
      emergencyTitle={emergencyTitle}
      emergencyLocation={emergencyLocation}
    />
  );
}

export default PostAcknowledgmentERPModal;