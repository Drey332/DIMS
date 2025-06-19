import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  Bell,
  Eye,
  ArrowUp
} from "lucide-react";
import { Incident, User } from "@/types";
import { cn } from "@/lib/utils";

export function CommandDashboard() {
  const { data: incidents = [], isLoading: incidentsLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const { data: teamMembers = [], isLoading: teamLoading } = useQuery<User[]>({
    queryKey: ["/api/team-members"],
  });

  const activeIncidents = incidents.filter(incident => incident.status === 'ACTIVE');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'priority-critical border';
      case 'HIGH':
        return 'priority-high border';
      case 'MEDIUM':
        return 'priority-medium border';
      case 'LOW':
        return 'priority-low border';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
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
        return 'status-active';
      case 'Field Operations':
        return 'status-pending';
      default:
        return 'bg-gray-400';
    }
  };

  if (incidentsLoading || teamLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Active Incidents Overview */}
      <div className="lg:col-span-2">
        <Card className="hydro-card">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <CardTitle className="text-2xl font-bold text-hydro-dark flex items-center">
              <AlertTriangle className="text-orange-500 mr-3 h-6 w-6" />
              Active Incidents & Operations
            </CardTitle>
            <Button className="hydro-button-emergency">
              <Bell className="w-4 h-4 mr-2" />
              New Emergency
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeIncidents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center px-6 py-3 rounded-full bg-green-50 text-green-800 font-medium">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    No incidents at this time
                  </div>
                </div>
              ) : (
                activeIncidents.map((incident) => (
                  <div key={incident.id} className={cn("rounded-xl p-5 border", getPriorityColor(incident.priority))}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "w-4 h-4 rounded-full",
                          incident.priority === 'CRITICAL' ? 'bg-red-500 animate-pulse' :
                          incident.priority === 'HIGH' ? 'bg-orange-500 animate-pulse-slow' :
                          'bg-yellow-500'
                        )}></div>
                        <h4 className="font-medium">{incident.title}</h4>
                      </div>
                      <Badge variant="outline" className="font-medium">
                        {incident.priority} Priority
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>Bronze: <span className="font-medium text-bronze">Nick Roddy</span></div>
                      <div>Silver: <span className="font-medium text-silver">Dean Golding</span></div>
                      <div>Started: <span>{new Date(incident.startTime).toLocaleTimeString()}</span></div>
                      <div>Duration: <span>2h 18m</span></div>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <Button size="sm" variant="outline" className="bg-orange-600 text-white hover:bg-orange-700">
                        <Eye className="w-3 h-3 mr-1" />
                        Review
                      </Button>
                      <Button size="sm" variant="outline" className="bg-gray-200 text-gray-700 hover:bg-gray-300">
                        <ArrowUp className="w-3 h-3 mr-1" />
                        Escalate
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Command Team Status */}
      <div>
        <Card className="hydro-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-hydro-dark flex items-center">
              <Users className="text-primary mr-3" />
              Command Team Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Actual HydroDive personnel for Forcados project */}
              {[
                { name: "Frank Ifedi", role: "GOLD", title: "MD/CEO - Gold Manager", initials: "FI", status: "Active" },
                { name: "Dave Ward", role: "SILVER", title: "Marine Operations Director", initials: "DW", status: "On Duty" },
                { name: "Afam Ejidike", role: "GOLD", title: "Project Manager", initials: "AE", status: "Active" },
                { name: "Steve Hardy", role: "SILVER", title: "Marine Manager", initials: "SH", status: "Field Operations" },
              ].map((member) => (
                <div key={member.name} className={cn("flex items-center justify-between p-3 rounded-lg border", getRoleColor(member.role))}>
                  <div className="flex items-center space-x-3">
                    <div className={cn("w-10 h-10 text-white rounded-full flex items-center justify-center font-medium text-sm", 
                      member.role === 'GOLD' ? 'bg-gold' :
                      member.role === 'SILVER' ? 'bg-silver' :
                      'bg-bronze'
                    )}>
                      {member.initials}
                    </div>
                    <div>
                      <div className="font-medium text-hydro-dark">{member.name}</div>
                      <div className="text-sm text-gray-600">{member.role} - {member.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={cn("w-3 h-3 rounded-full", getStatusColor(member.status))}></div>
                    <span className="text-sm font-medium text-green-700">{member.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
