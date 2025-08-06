import React from "react";
import { X, AlertTriangle, Phone, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

type NotifyContact = {
  roleKey: string;
  name: string;
  phone?: string;
  title?: string;
};

type ERPModalProps = {
  open: boolean;
  onClose: () => void;
  erpProtocol: ERPProtocol | null;
  notifyContacts: NotifyContact[];
  emergencyContacts: EmergencyContact[];
  emergencyTitle: string;
  emergencyLocation?: string;
};

export function ERPModal({
  open,
  onClose,
  erpProtocol,
  notifyContacts,
  emergencyContacts,
  emergencyTitle,
  emergencyLocation
}: ERPModalProps) {
  if (!open) return null;

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

          {/* ERP Protocol */}
          {erpProtocol && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                <AlertTriangle className="text-blue-600 mr-2 w-6 h-6" />
                {erpProtocol.type} Protocol
              </h3>
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {erpProtocol.protocol}
                </div>
              </div>
            </div>
          )}

          {/* Command Team Contacts */}
          {notifyContacts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                <Users className="text-green-600 mr-2 w-6 h-6" />
                Command Team to Notify
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notifyContacts.map((contact, idx) => (
                  <div key={idx} className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="font-bold text-green-800">{contact.name}</div>
                    {contact.title && (
                      <div className="text-sm text-green-700 mb-2">{contact.title}</div>
                    )}
                    <Badge className="bg-green-600 text-white mb-2">{contact.roleKey}</Badge>
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

          {/* Emergency Contacts */}
          {emergencyContacts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center">
                <Phone className="text-purple-600 mr-2 w-6 h-6" />
                Emergency Services & External Contacts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emergencyContacts.map((contact, idx) => (
                  <div key={idx} className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="font-bold text-purple-800">{contact.name}</div>
                    <div className="text-sm text-purple-700 mb-2">{contact.role}</div>
                    <Badge 
                      className={`mb-2 ${
                        contact.type === 'EMERGENCY_SERVICE' 
                          ? 'bg-red-600 text-white' 
                          : contact.type === 'EXTERNAL'
                          ? 'bg-orange-600 text-white'
                          : 'bg-purple-600 text-white'
                      }`}
                    >
                      {contact.type.replace('_', ' ')}
                    </Badge>
                    <div className="flex items-center text-sm text-gray-700">
                      <Phone className="w-4 h-4 mr-1" />
                      <a href={`tel:${contact.phone}`} className="hover:underline font-mono">
                        {contact.phone}
                      </a>
                    </div>
                    {contact.email && (
                      <div className="text-xs text-gray-600 mt-1">
                        {contact.email}
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

export default ERPModal;