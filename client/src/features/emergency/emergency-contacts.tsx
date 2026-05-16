import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Phone, 
  Hospital, 
  Plane, 
  Anchor,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { EmergencyContact } from "@/types";
import { cn } from "@/lib/utils";

// For top-tier mobile friendliness, add this global style to your CSS (or tailwind config):
// .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

export function EmergencyContacts() {
  const PROJECT_ID = "1"; // Use dynamic value for multi-project setups!
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time Firestore subscription — gold standard!
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    try {
      const coll = collection(db, "projects", PROJECT_ID, "contacts");
      const unsub = onSnapshot(coll, (snap) => {
        const mappedContacts = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<EmergencyContact, "id">),
        }));
        setContacts(mappedContacts as EmergencyContact[]);
        setIsLoading(false);
      }, (err) => {
        setError("Could not fetch contacts. Please check your connection.");
        setIsLoading(false);
      });
      return unsub;
    } catch (err) {
      setError("Initialization error — contact your admin.");
      setIsLoading(false);
    }
  }, []);

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'HOSPITAL': return <Hospital className="text-red-600" />;
      case 'MEDEVAC': return <Plane className="text-orange-600" />;
      case 'MARINE_RESCUE': return <Anchor className="text-blue-600" />;
      default: return <Phone className="text-gray-600" />;
    }
  };

  const getVerificationStatus = (lastVerified: string | undefined) => {
    if (!lastVerified) return { status: 'overdue', text: 'Unknown', color: 'bg-gradient-to-r from-yellow-100 to-red-100' };
    const verifiedDate = new Date(lastVerified);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - verifiedDate.getTime()) / (1000 * 3600 * 24));
    if (daysDiff <= 7) return { status: 'verified', text: 'Verified', color: 'bg-gradient-to-r from-green-50 to-green-100' };
    if (daysDiff <= 30) return { status: 'pending', text: 'Pending', color: 'bg-gradient-to-r from-yellow-50 to-yellow-100' };
    return { status: 'overdue', text: 'Overdue', color: 'bg-gradient-to-r from-yellow-100 to-red-100' };
  };

  const handleCallContact = (phone: string, name: string) => {
    if (typeof window !== 'undefined' && window.navigator.userAgent.match(/iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile/i)) {
      window.location.href = `tel:${phone}`;
    } else {
      alert(`Call ${name} at ${phone}`);
    }
  };

  return (
    <Card className="hydro-card lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-hydro-dark flex items-center gap-3">
          <MapPin className="text-primary" />
          <span className="truncate">Project-Specific Emergency Assets & Contacts</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[120px] text-hydro-dark/60 py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hydro-dark mb-2"></div>
            <span>Loading emergency contacts...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-600 mb-4">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        )}

        {!isLoading && !error && contacts.length === 0 && (
          <div className="text-center text-gray-400 italic py-8">
            No emergency contacts available for this project.
          </div>
        )}

        <div className="flex flex-col gap-4">
          {contacts.map((contact) => {
            const verification = getVerificationStatus(contact.lastVerified || '');
            return (
              <div 
                key={contact.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-lg transition-all duration-200",
                  verification.color
                )}
                onClick={() => handleCallContact(contact.phone, contact.name)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                    {getContactIcon(contact.contactType)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-lg truncate">
                      {contact.contactType === 'HOSPITAL' ? '🏥 Medical: ' + contact.name :
                        contact.contactType === 'MEDEVAC' ? '🚑 Ambulance: ' + contact.name :
                        contact.contactType === 'MARINE_RESCUE' ? '🚤 Boat: ' + contact.name :
                        contact.name}
                    </div>
                    <div className="text-sm text-gray-600 font-mono truncate">{contact.phone}</div>
                    {contact.email && <div className="text-xs text-gray-600 truncate">{contact.email}</div>}
                  </div>
                </div>
                <div className="text-right min-w-[120px] flex flex-col items-end">
                  {contact.responseTime ? (
                    <div className="font-semibold text-sm text-green-700">{contact.responseTime}</div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className={cn("w-4 h-4",
                        verification.status === 'verified' ? 'text-green-500' :
                        verification.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                      )} />
                      <span className="text-sm font-medium">{verification.text}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                    Last verified: {contact.lastVerified ? new Date(contact.lastVerified).toLocaleDateString() : 'Never'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}