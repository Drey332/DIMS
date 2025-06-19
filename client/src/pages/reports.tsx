import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Download, 
  Filter,
  Calendar as CalendarIcon,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Eye,
  Search
} from "lucide-react";
import { AuditLog, DashboardStats } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function Reports() {
  const [filterType, setFilterType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", { projectId: 1 }],
  });

  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs", { projectId: 1 }],
  });

  // Default audit logs for demo
  const defaultLogs = [
    {
      id: 1,
      actionType: "INCIDENT_CREATED",
      description: "Equipment inspection overdue incident created",
      createdAt: "2025-01-24T14:30:00Z",
      userId: 4,
      user: { firstName: "Nick", lastName: "Roddy", role: "BRONZE" }
    },
    {
      id: 2,
      actionType: "FILE_UPLOADED",
      description: "Inspection photos uploaded for dive vessel",
      createdAt: "2025-01-24T14:25:00Z",
      userId: 4,
      user: { firstName: "Nick", lastName: "Roddy", role: "BRONZE" }
    },
    {
      id: 3,
      actionType: "DECISION_MADE",
      description: "Weather window extension approved",
      createdAt: "2025-01-24T14:20:00Z",
      userId: 1,
      user: { firstName: "David", lastName: "Mooney", role: "GOLD" }
    },
    {
      id: 4,
      actionType: "INCIDENT_UPDATED",
      description: "Safety drill completed successfully",
      createdAt: "2025-01-24T12:45:00Z",
      userId: 3,
      user: { firstName: "Kene", lastName: "Anyabolu", role: "SILVER" }
    },
    {
      id: 5,
      actionType: "CONTACT_VERIFIED",
      description: "Emergency contacts verification completed",
      createdAt: "2025-01-24T10:15:00Z",
      userId: 2,
      user: { firstName: "Dean", lastName: "Golding", role: "SILVER" }
    }
  ];

  const displayLogs = auditLogs.length > 0 ? auditLogs : defaultLogs;

  const user = {
    role: "GOLD",
    name: "David Mooney",
    title: "General Manager",
    initials: "DM"
  };

  const project = {
    name: "Forcados ACOE Decommissioning Project",
    number: "863-01-24",
    client: "Shell Petroleum Development Company (SPDC)"
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'INCIDENT_CREATED':
      case 'INCIDENT_UPDATED':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'FILE_UPLOADED':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'DECISION_MADE':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'CONTACT_VERIFIED':
        return <Shield className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'INCIDENT_CREATED':
      case 'INCIDENT_UPDATED':
        return 'bg-orange-50 border-orange-200';
      case 'FILE_UPLOADED':
        return 'bg-blue-50 border-blue-200';
      case 'DECISION_MADE':
        return 'bg-green-50 border-green-200';
      case 'CONTACT_VERIFIED':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'GOLD':
        return 'bg-gold text-gold-foreground';
      case 'SILVER':
        return 'bg-silver text-silver-foreground';
      case 'BRONZE':
        return 'bg-bronze text-bronze-foreground';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const filteredLogs = displayLogs.filter(log => {
    const matchesType = filterType === "all" || log.actionType.toLowerCase().includes(filterType.toLowerCase());
    const matchesSearch = searchTerm === "" || 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actionType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-hydro-light">
      <Header user={user} project={project} />
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-hydro-dark">Reports & Audit Trail</h1>
          <div className="flex space-x-3">
            <Button className="bg-green-600 text-white hover:bg-green-700">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <Button className="hydro-button-primary">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Compliance Overview Cards */}
          <Card className="hydro-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-green-900">Protocol Compliance</h4>
                <CheckCircle className="text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-700 mb-1">98.5%</div>
              <p className="text-sm text-green-700">All procedures documented</p>
            </CardContent>
          </Card>

          <Card className="hydro-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-900">Actions Logged</h4>
                <FileText className="text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700 mb-1">{stats?.totalActions || 247}</div>
              <p className="text-sm text-blue-700">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card className="hydro-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-purple-900">Files Archived</h4>
                <FileText className="text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-700 mb-1">{stats?.filesArchived || 89}</div>
              <p className="text-sm text-purple-700">Photos & documents</p>
            </CardContent>
          </Card>

          <Card className="hydro-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-orange-900">Active Issues</h4>
                <AlertTriangle className="text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-700 mb-1">{stats?.activeIncidents || 2}</div>
              <p className="text-sm text-orange-700">Require attention</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audit Trail */}
          <div className="lg:col-span-2">
            <Card className="hydro-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-primary" />
                    Audit Trail
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search actions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-48"
                      />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="incident">Incidents</SelectItem>
                        <SelectItem value="file">Files</SelectItem>
                        <SelectItem value="decision">Decisions</SelectItem>
                        <SelectItem value="contact">Contacts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className={cn("p-3 rounded-lg border", getActionColor(log.actionType))}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            {getActionIcon(log.actionType)}
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{log.description}</h4>
                              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {new Date(log.createdAt).toLocaleString()}
                                </div>
                                <div className="flex items-center">
                                  <User className="w-3 h-3 mr-1" />
                                  {log.user?.firstName} {log.user?.lastName}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={cn("text-xs", getRoleColor(log.user?.role || "BRONZE"))}>
                              {log.user?.role}
                            </Badge>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Report Generation */}
          <div>
            <Card className="hydro-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-primary" />
                  Generate Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Report Type</label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compliance">Compliance Report</SelectItem>
                      <SelectItem value="incident">Incident Summary</SelectItem>
                      <SelectItem value="audit">Full Audit Trail</SelectItem>
                      <SelectItem value="team">Team Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Date Range</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange ? format(dateRange, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange}
                        onSelect={setDateRange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Button className="w-full hydro-button-primary">
                    <Download className="w-4 h-4 mr-2" />
                    Generate PDF
                  </Button>
                  <Button className="w-full bg-green-600 text-white hover:bg-green-700">
                    <FileText className="w-4 h-4 mr-2" />
                    Excel Export
                  </Button>
                  <Button className="w-full bg-orange-600 text-white hover:bg-orange-700">
                    <Shield className="w-4 h-4 mr-2" />
                    Legal Package
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hydro-card">
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">IMCA Guidelines</span>
                    <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">IOGP Standards</span>
                    <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">HydroDive Protocols</span>
                    <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Legal Defensibility</span>
                    <Badge className="bg-green-100 text-green-800">Verified</Badge>
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
