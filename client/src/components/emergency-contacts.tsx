import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Phone, 
  Hospital, 
  Plane, 
  Anchor,
  Clock,
  Edit,
  CheckCircle
} from "lucide-react";
import { EmergencyContact } from "@/types";
import { cn } from "@/lib/utils";

export function EmergencyContacts() {
  const { data: contacts = [], isLoading } = useQuery<EmergencyContact[]>({
    queryKey: ["/api/emergency-contacts", { projectId: 1 }], // Forcados project
  });

  // Default contacts for demo (in case API doesn't return data)
  const defaultContacts = [
    {
      id: 1,
      contactType: 'HOSPITAL',
      name: 'Warri Central Hospital',
      phone: '+234-803-XXX-XXXX',
      lastVerified: '2025-01-20',
      responseTime: undefined,
      isActive: true
    },
    {
      id: 2,
      contactType: 'MEDEVAC',
      name: 'Nigeria Air Rescue',
      phone: '+234-805-XXX-XXXX',
      lastVerified: '2025-01-18',
      responseTime: '25 minutes',
      isActive: true
    },
    {
      id: 3,
      contactType: 'MARINE_RESCUE',
      name: 'Nigerian Maritime Rescue',
      phone: '+234-807-XXX-XXXX',
      lastVerified: '2025-01-15',
      responseTime: undefined,
      isActive: true
    }
  ];

  const displayContacts = contacts.length > 0 ? contacts : defaultContacts;

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'HOSPITAL':
        return <Hospital className="text-red-600" />;
      case 'MEDEVAC':
        return <Plane className="text-orange-600" />;
      case 'MARINE_RESCUE':
        return <Anchor className="text-blue-600" />;
      default:
        return <Phone className="text-gray-600" />;
    }
  };

  const getVerificationStatus = (lastVerified: string | undefined) => {
    if (!lastVerified) return { status: 'overdue', text: 'Unknown', color: 'hydro-card-overdue' };
    
    const verifiedDate = new Date(lastVerified);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - verifiedDate.getTime()) / (1000 * 3600 * 24));
    
    if (daysDiff <= 7) return { status: 'verified', text: 'Verified', color: 'hydro-card-verified' };
    if (daysDiff <= 30) return { status: 'pending', text: 'Pending', color: 'hydro-card-pending' };
    return { status: 'overdue', text: 'Overdue', color: 'hydro-card-overdue' };
  };

  const handleCallContact = (phone: string, name: string) => {
    // For mobile devices, initiate phone call
    if (typeof window !== 'undefined' && window.navigator.userAgent.match(/iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile/i)) {
      window.location.href = `tel:${phone}`;
    } else {
      // For desktop, show notification
      alert(`Calling ${name} at ${phone}`);
    }
  };

  const getContactTextColor = (type: string) => {
    switch (type) {
      case 'HOSPITAL':
        return 'text-red-900';
      case 'MEDEVAC':
        return 'text-orange-900';
      case 'MARINE_RESCUE':
        return 'text-blue-900';
      default:
        return 'text-gray-900';
    }
  };

  const getContactSubTextColor = (type: string) => {
    switch (type) {
      case 'HOSPITAL':
        return 'text-red-700';
      case 'MEDEVAC':
        return 'text-orange-700';
      case 'MARINE_RESCUE':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const getContactTimeColor = (type: string) => {
    switch (type) {
      case 'HOSPITAL':
        return 'text-red-700';
      case 'MEDEVAC':
        return 'text-orange-700';
      case 'MARINE_RESCUE':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading contacts...</div>;
  }

  return (
    <Card className="hydro-card lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-hydro-dark flex items-center">
          <MapPin className="text-primary mr-3" />
          Project-Specific Emergency Assets & Contacts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayContacts.map((contact) => {
            const verification = getVerificationStatus(contact.lastVerified || '');
            return (
              <div 
                key={contact.id} 
                className={cn("p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all duration-200", verification.color)}
                onClick={() => handleCallContact(contact.phone, contact.name)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      {getContactIcon(contact.contactType)}
                    </div>
                    <div>
                      <div className="font-bold text-lg">
                        {contact.contactType === 'HOSPITAL' ? '🏥 Medical: ' + contact.name :
                         contact.contactType === 'MEDEVAC' ? '🚑 Ambulance: ' + contact.name :
                         contact.contactType === 'MARINE_RESCUE' ? '🚤 Boat: ' + contact.name :
                         contact.name}
                      </div>
                      <div className="text-sm text-gray-600 font-mono">{contact.phone}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {contact.responseTime ? (
                      <div className="font-medium text-sm">
                        {contact.responseTime} {verification.text}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className={cn("w-4 h-4", 
                          verification.status === 'verified' ? 'text-green-500' :
                          verification.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                        )} />
                        <span className="text-sm font-medium">{verification.text}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Last verified: {contact.lastVerified}
                    </div>
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
