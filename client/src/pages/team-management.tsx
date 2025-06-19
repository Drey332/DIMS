import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserStatus } from "@/components/user-status";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin,
  Clock,
  Shield,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { User } from "@/types";
import { cn } from "@/lib/utils";

export default function TeamManagement() {
  // Actual HydroDive personnel for Forcados project
  const teamMembers = [
    {
      id: 1,
      firstName: "Frank",
      lastName: "Ifedi",
      email: "f.ifedi@hydrodive.com",
      role: "GOLD",
      title: "MD/CEO - Gold Manager",
      isActive: true,
      lastSeen: "2025-01-24T15:30:00Z",
      activityStatus: "ONLINE",
      status: "Active",
      location: "Corporate Office",
      phone: "+234-803-XXXX-001"
    },
    {
      id: 2,
      firstName: "Dave",
      lastName: "Ward",
      email: "d.ward@hydrodive.com",
      role: "SILVER",
      title: "Marine and Diving Operations Director",
      isActive: true,
      lastSeen: "2025-01-24T15:25:00Z",
      activityStatus: "IDLE",
      status: "On Duty",
      location: "Forcados Site",
      phone: "+234-803-XXXX-002"
    },
    {
      id: 3,
      firstName: "Latifatu",
      lastName: "Osagie",
      email: "l.osagie@hydrodive.com",
      role: "SILVER",
      title: "Personnel Logistics Manager",
      isActive: true,
      lastSeen: "2025-01-24T15:20:00Z",
      activityStatus: "ONLINE",
      status: "Available",
      location: "Lagos Office",
      phone: "+234-803-XXXX-003"
    },
    {
      id: 4,
      firstName: "Modupe",
      lastName: "Oherein",
      email: "m.oherein@hydrodive.com",
      role: "SILVER",
      title: "Human Resources Manager",
      isActive: true,
      lastSeen: "2025-01-24T15:15:00Z",
      activityStatus: "OFFLINE",
      status: "Available",
      location: "Lagos Office",
      phone: "+234-803-XXXX-004"
    },
    {
      id: 5,
      firstName: "Stephan",
      lastName: "Wessels",
      email: "s.wessels@hydrodive.com",
      role: "SILVER",
      title: "Operations Manager",
      isActive: true,
      lastSeen: "2025-01-24T15:10:00Z",
      activityStatus: "IDLE",
      status: "On Duty",
      location: "Operations Center",
      phone: "+234-803-XXXX-005"
    },
    {
      id: 6,
      firstName: "Steve",
      lastName: "Hardy",
      email: "s.hardy@hydrodive.com",
      role: "SILVER",
      title: "Marine Manager",
      isActive: true,
      lastSeen: "2025-01-24T15:35:00Z",
      activityStatus: "ONLINE",
      status: "Field Operations",
      location: "Forcados Site",
      phone: "+234-803-XXXX-006"
    },
    {
      id: 7,
      firstName: "Afam",
      lastName: "Ejidike",
      email: "a.ejidike@hydrodive.com",
      role: "GOLD",
      title: "Project Manager",
      isActive: true,
      lastSeen: "2025-01-24T15:28:00Z",
      activityStatus: "ONLINE",
      status: "Active",
      location: "Project Office",
      phone: "+234-803-XXXX-007"
    },
    {
      id: 8,
      firstName: "Tochi",
      lastName: "Nwogu",
      email: "t.nwogu@hydrodive.com",
      role: "GOLD",
      title: "Legal Advisor",
      isActive: true,
      lastSeen: "2025-01-24T15:22:00Z",
      activityStatus: "IDLE",
      status: "Available",
      location: "Corporate Office",
      phone: "+234-803-XXXX-008"
    }
  ];

  const user = {
    role: "GOLD",
    name: "Frank Ifedi",
    title: "MD/CEO - Gold Manager",
    initials: "FI"
  };

  const project = {
    name: "Forcados ACOE Decommissioning Project",
    number: "863-01-24",
    client: "Shell Petroleum Development Company (SPDC)"
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'GOLD':
        return 'role-gold';
      case 'SILVER':
        return 'role-silver';
      case 'BRONZE':
        return 'role-bronze';
      default:
        return 'bg-gray-500';
    }
  };

  const getRoleLightColor = (role: string) => {
    switch (role) {
      case 'GOLD':
        return 'role-gold-light';
      case 'SILVER':
        return 'role-silver-light';
      case 'BRONZE':
        return 'role-bronze-light';
      default:
        return 'bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
      case 'On Duty':
      case 'Available':
        return 'bg-green-500';
      case 'Field Operations':
        return 'bg-orange-500';
      case 'Offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
      case 'On Duty':
      case 'Available':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Field Operations':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`;
  };

  return (
    <div className="min-h-screen bg-hydro-light">
      <Header user={user} project={project} />
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-hydro-dark">Team Management</h1>
          <Button className="hydro-button-primary">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Team Member
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Overview */}
          <div className="lg:col-span-2">
            <Card className="hydro-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-primary" />
                  Command Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div 
                      key={member.id} 
                      className={cn("p-4 rounded-lg border", getRoleLightColor(member.role))}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className={cn("text-white font-medium", getRoleColor(member.role))}>
                              {getInitials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-hydro-dark">
                              {member.firstName} {member.lastName}
                            </h3>
                            <p className="text-sm text-gray-600">{member.title}</p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {member.email}
                              </div>
                              <div className="flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {member.phone}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={cn("mb-2", getRoleColor(member.role))}>
                            {member.role} Command
                          </Badge>
                          <div className="flex items-center justify-end space-x-2">
                            <UserStatus 
                              userId={member.id} 
                              initialStatus={member.activityStatus || 'OFFLINE'} 
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <MapPin className="w-3 h-3 mr-2" />
                          Location: <span className="ml-1 font-medium">{member.location}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Clock className="w-3 h-3 mr-2" />
                          Last seen: <span className="ml-1">{new Date(member.lastSeen).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Mail className="w-3 h-3 mr-1" />
                          Contact
                        </Button>
                        <Button size="sm" variant="outline">
                          <Shield className="w-3 h-3 mr-1" />
                          Permissions
                        </Button>
                        <Button size="sm" variant="outline">
                          View Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Command Structure */}
          <div>
            <Card className="hydro-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-primary" />
                  Command Structure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gold text-gold-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">
                      GOLD
                    </div>
                    <h4 className="font-medium">Strategic Command</h4>
                    <p className="text-sm text-gray-600">Overall incident management</p>
                    <div className="text-xs text-gray-500 mt-1">1 Active</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-silver text-silver-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">
                      SILVER
                    </div>
                    <h4 className="font-medium">Tactical Command</h4>
                    <p className="text-sm text-gray-600">Resource coordination</p>
                    <div className="text-xs text-gray-500 mt-1">2 Active</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-bronze text-bronze-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">
                      BRONZE
                    </div>
                    <h4 className="font-medium">Operational Command</h4>
                    <p className="text-sm text-gray-600">On-scene operations</p>
                    <div className="text-xs text-gray-500 mt-1">1 Active</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hydro-card">
              <CardHeader>
                <CardTitle>Team Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Members:</span>
                    <Badge variant="outline">8</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Now:</span>
                    <Badge className="bg-green-100 text-green-800">8</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">On-Site:</span>
                    <Badge className="bg-blue-100 text-blue-800">3</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Response Time:</span>
                    <Badge className="bg-green-100 text-green-800">&lt; 5 min</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
