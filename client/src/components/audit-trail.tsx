import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gavel, 
  CheckCircle, 
  List, 
  Archive, 
  Download, 
  FileText, 
  Shield 
} from "lucide-react";
import { DashboardStats } from "@/types";

export function AuditTrail() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", { projectId: 1 }], // Forcados project
  });

  // Default stats for demo
  const defaultStats = {
    activeIncidents: 2,
    totalActions: 247,
    filesArchived: 89,
    complianceScore: 98.5
  };

  const displayStats = stats || defaultStats;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading audit data...</div>;
  }

  return (
    <Card className="hydro-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-hydro-dark flex items-center">
          <Gavel className="text-primary mr-3" />
          Audit Trail & Compliance Documentation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-green-900">Protocol Compliance</h4>
              <CheckCircle className="text-green-600 text-xl" />
            </div>
            <div className="text-2xl font-bold text-green-700 mb-1">
              {displayStats.complianceScore}%
            </div>
            <div className="text-sm text-green-700">All procedures documented</div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-blue-900">Actions Logged</h4>
              <List className="text-blue-600 text-xl" />
            </div>
            <div className="text-2xl font-bold text-blue-700 mb-1">
              {displayStats.totalActions}
            </div>
            <div className="text-sm text-blue-700">Last 24 hours</div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-purple-900">Files Archived</h4>
              <Archive className="text-purple-600 text-xl" />
            </div>
            <div className="text-2xl font-bold text-purple-700 mb-1">
              {displayStats.filesArchived}
            </div>
            <div className="text-sm text-purple-700">Photos & documents</div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Compliance Overview</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>IMCA Guidelines:</span>
                <Badge className="bg-green-100 text-green-800">Compliant</Badge>
              </div>
              <div className="flex justify-between">
                <span>IOGP Standards:</span>
                <Badge className="bg-green-100 text-green-800">Compliant</Badge>
              </div>
              <div className="flex justify-between">
                <span>HydroDive Protocols:</span>
                <Badge className="bg-green-100 text-green-800">Compliant</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Decision Documentation:</span>
                <Badge className="bg-green-100 text-green-800">Complete</Badge>
              </div>
              <div className="flex justify-between">
                <span>Evidence Chain:</span>
                <Badge className="bg-green-100 text-green-800">Secured</Badge>
              </div>
              <div className="flex justify-between">
                <span>Legal Defensibility:</span>
                <Badge className="bg-green-100 text-green-800">Verified</Badge>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button className="hydro-button-primary">
            <Download className="w-4 h-4 mr-2" />
            Export Audit Report
          </Button>
          <Button className="bg-green-600 text-white hover:bg-green-700 transition-colors">
            <FileText className="w-4 h-4 mr-2" />
            Generate Compliance PDF
          </Button>
          <Button className="bg-orange-600 text-white hover:bg-orange-700 transition-colors">
            <Shield className="w-4 h-4 mr-2" />
            Legal Defense Package
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
