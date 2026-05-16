import React, { useState, useEffect } from "react";
import { getDocs, collection, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { User, Phone, AlertTriangle, MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IncidentAnalysisResult } from "@shared/incident-analysis";

type ERPProtocol = {
  id?: string;
  keywords: string;
  type: string;
  notify: string[] | string;
  protocol: string;
};

type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  title?: string;
  phone?: string;
  email?: string;
};

type PostAcknowledgmentERPModalProps = {
  open: boolean;
  onClose: () => void;
  emergencyType?: string; // The matched ERP protocol type from EmergencyModal
  emergencyTitle: string;
  emergencyLocation?: string;
  notifiedContacts?: TeamMember[];
  projectId?: string;
  emergencyId: string; // Add emergency ID to fetch the saved ERP data
};

export function PostAcknowledgmentERPModal({
  open,
  onClose,
  emergencyType,
  emergencyTitle,
  emergencyLocation,
  notifiedContacts = [],
  projectId = "hydrosafe-5d245",
  emergencyId,
}: PostAcknowledgmentERPModalProps) {
  const [erp, setErp] = useState<ERPProtocol | null>(null);
  const [scientificAnalysis, setScientificAnalysis] = useState<(IncidentAnalysisResult & { source?: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !emergencyId) return;
    setLoading(true);

    async function fetchERP() {
      try {
        // First try to get the saved ERP from the emergency document
        const emergencyRef = doc(db, "emergencies", emergencyId);
        const emergencySnap = await getDoc(emergencyRef);
        
        if (emergencySnap.exists()) {
          const emergencyData = emergencySnap.data();
          const savedERP = emergencyData.matchedERP;
          setScientificAnalysis((emergencyData.scientificAnalysis ?? null) as (IncidentAnalysisResult & { source?: string }) | null);
          
          if (savedERP && savedERP.protocol) {
            // Use the saved ERP data - this ensures consistency with what was matched during submission
            setErp(savedERP as ERPProtocol);
            setLoading(false);
            return;
          }
        }
        
        // Fallback: try to match by emergencyType (for older emergency records without saved ERP)
        if (emergencyType) {
          const q = query(
            collection(db, "projects", projectId, "erpProtocols"),
            where("type", "==", emergencyType)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            setErp({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as ERPProtocol);
          } else {
            setErp(null);
          }
        } else {
          setErp(null);
        }
      } catch (error) {
        console.error("Error fetching ERP:", error);
        setErp(null);
      }
      setLoading(false);
    }
    fetchERP();
  }, [open, emergencyId, emergencyType, projectId]);

  if (!open) return null;

  // Convert notifiedContacts to the format expected by the UI
  // Handle both saved contact format (with 'name') and TeamMember format (with firstName/lastName)
  const notifyContacts = notifiedContacts.map((member: any) => ({
    roleKey: member.roleKey || member.role,
    name: member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim(),
    phone: member.phone,
    title: member.title
  }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" style={{ backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-red-600 z-10"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="p-6 overflow-y-auto max-h-[90vh]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-red-700 mb-2 flex items-center">
              <AlertTriangle className="text-red-500 mr-3 w-8 h-8" />
              Emergency Response Protocol
            </h2>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="font-semibold text-red-800">{emergencyTitle}</p>
              {emergencyLocation && (
                <p className="text-red-600 text-sm mt-1 flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  Location: {emergencyLocation}
                </p>
              )}
            </div>
          </div>

          {scientificAnalysis && (
            <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-5">
              <h3 className="mb-3 flex items-center text-lg font-bold text-slate-900">
                <AlertTriangle className="mr-2 h-5 w-5 text-slate-700" />
                Scientific Risk Context
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-md bg-white p-3">
                  <div className="text-xs uppercase text-slate-500">Risk band</div>
                  <div className="text-xl font-bold text-slate-900">
                    {scientificAnalysis.risk.band} ({scientificAnalysis.risk.score}/100)
                  </div>
                </div>
                <div className="rounded-md bg-white p-3">
                  <div className="text-xs uppercase text-slate-500">Confidence</div>
                  <div className="text-xl font-bold text-slate-900">{scientificAnalysis.risk.confidence}</div>
                </div>
                <div className="rounded-md bg-white p-3">
                  <div className="text-xs uppercase text-slate-500">Field mode</div>
                  <div className="text-xl font-bold text-slate-900">
                    {scientificAnalysis.lowResourcePlan.mode.replace("-", " ")}
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {scientificAnalysis.evidenceCards.slice(0, 3).map((card) => (
                  <div key={card.id} className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{card.priority}</Badge>
                      <span className="text-xs text-slate-500">{card.deadline}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{card.action}</p>
                    <p className="mt-1 text-xs text-slate-600">Uncertainty: {card.uncertainty}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ERP Protocol */}
          {loading ? (
            <div className="mb-8">
              <div className="text-center py-8 text-gray-500">Loading protocol...</div>
            </div>
          ) : erp ? (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                <AlertTriangle className="text-blue-600 mr-2 w-6 h-6" />
                {erp.type} Protocol
              </h3>
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <ol style={{ margin: 0, padding: 0, listStyle: "none", marginTop: 6 }}>
                  {(erp.protocol || "")
                    .split(/\s*\d+\.\s+/)
                    .filter(Boolean)
                    .map((step, idx) => (
                      <li
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 14,
                          background: "#fff",
                          borderLeft: "5px solid #1e40af",
                          boxShadow: "0 2px 9px 0 rgba(30,64,175,0.08)",
                          borderRadius: 10,
                          marginBottom: 12,
                          padding: "12px 15px",
                        }}
                      >
                        <span
                          style={{
                            minWidth: 33,
                            minHeight: 33,
                            background: "#1e40af",
                            color: "#fff",
                            fontWeight: 800,
                            borderRadius: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 17,
                            boxShadow: "0 2px 8px 0 #1e40af20",
                            marginTop: 2,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span
                          style={{
                            fontSize: 15.5,
                            color: "#21244a",
                            fontWeight: 600,
                            lineHeight: 1.62,
                          }}
                        >
                          {step.trim()}
                        </span>
                      </li>
                    ))}
                </ol>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                <p className="text-yellow-800">
                  No specific protocol found. Follow general emergency procedures.
                </p>
              </div>
            </div>
          )}

          {/* Command Team Contacts */}
          {notifyContacts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                <User className="text-green-600 mr-2 w-6 h-6" />
                Command Team to Notify
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notifyContacts.map((contact, idx) => (
                  <div key={idx} className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="font-bold text-green-800">{contact.name}</div>
                    {contact.title && (
                      <div className="text-sm text-green-700 mb-2">{contact.title}</div>
                    )}
                    <Badge className={`mb-2 ${
                      contact.roleKey === 'GOLD' 
                        ? 'bg-yellow-500 text-yellow-900 font-bold' 
                        : contact.roleKey === 'SILVER'
                        ? 'bg-gray-500 text-white font-bold'
                        : contact.roleKey === 'BRONZE'
                        ? 'bg-orange-500 text-orange-900 font-bold'
                        : 'bg-green-600 text-white'
                    }`}>
                      {contact.roleKey}
                    </Badge>
                    {contact.phone && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Phone className="w-4 h-4 mr-1" />
                        <a href={`tel:${contact.phone}`} className="hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Button 
              onClick={onClose}
              className="bg-gray-600 text-white hover:bg-gray-700 px-8 py-3"
            >
              Close Protocol
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostAcknowledgmentERPModal;
