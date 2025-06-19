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

  const getContactColor = (type: string) => {
    switch (type) {
      case 'HOSPITAL':
        return 'bg-red-50 border-red-200';
      case 'MEDEVAC':
        return 'bg-orange-50 border-orange-200';
      case 'MARINE_RESCUE':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
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
        return 'text-red-800';
      case 'MEDEVAC':
        return 'text-orange-800';
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div className="lg:col-span-2">
        <Card className="hydro-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-hydro-dark flex items-center">
              <MapPin className="text-primary mr-3" />
              Project-Specific Emergency Assets & Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Emergency Contacts */}
              <div>
                <h4 className="font-bold text-hydro-dark mb-3 flex items-center">
                  <Phone className="text-red-600 mr-2" />
                  Emergency Contacts
                </h4>
                <div className="space-y-3">
                  {displayContacts.map((contact) => (
                    <div key={contact.id} className={`p-3 ${getContactColor(contact.contactType)} border rounded-lg cursor-pointer hover:shadow-md transition-shadow`}
                         onClick={() => window.open(`tel:${contact.phone}`, '_self')}>
                      <div className={`font-medium ${getContactTextColor(contact.contactType)} flex items-center justify-between`}>
                        <span>
                          {contact.contactType === 'HOSPITAL' ? 'Primary Hospital' :
                           contact.contactType === 'MEDEVAC' ? 'MEDEVAC Service' :
                           contact.contactType === 'MARINE_RESCUE' ? 'Marine Emergency' :
                           contact.contactType}
                        </span>
                        <Phone className="w-4 h-4 text-green-600" />
                      </div>
                      <div className={`text-sm ${getContactSubTextColor(contact.contactType)}`}>
                        {contact.name}
                      </div>
                      <div className={`text-sm font-mono ${getContactSubTextColor(contact.contactType)} hover:underline`}>
                        {contact.phone}
                      </div>
                      <div className={`text-xs ${getContactTimeColor(contact.contactType)} mt-1 flex items-center`}>
                        <Clock className="w-3 h-3 mr-1" />
                        {contact.responseTime ? (
                          <>
                            {contact.contactType === 'MEDEVAC' && <Plane className="w-3 h-3 mr-1" />}
                            Response time: <span className="ml-1">{contact.responseTime}</span>
                          </>
                        ) : (
                          <>Last verified: <span className="ml-1">{contact.lastVerified}</span></>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Asset Status */}
              <div>
                <h4 className="font-bold text-hydro-dark mb-3 flex items-center">
                  <Anchor className="text-blue-600 mr-2" />
                  Asset Status
                </h4>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-green-900">Dive Support Vessel</div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-sm text-green-800">
                      Last inspection: <span>Jan 22, 2025</span>
                    </div>
                    <div className="text-sm text-green-800">
                      Next due: <span>Jan 29, 2025</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-orange-900">Decompression Chamber</div>
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    </div>
                    <div className="text-sm text-orange-800">
                      Status: <span>Inspection Overdue</span>
                    </div>
                    <div className="text-sm text-orange-800">
                      Action required: <span>Schedule inspection</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">Emergency Equipment</div>
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Status: <span>Maintenance Scheduled</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3">
              <Button className="hydro-button-primary">
                <Edit className="w-4 h-4 mr-2" />
                Add/Update Contacts
              </Button>
              <Button 
                className="bg-green-600 text-white hover:bg-green-700 transition-colors"
                onClick={() => window.location.href = '/assets'}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify All Assets
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
