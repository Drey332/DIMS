import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Shield, 
  FileText, 
  Download, 
  Scale,
  Clock,
  CheckCircle,
  AlertTriangle,
  Gavel,
  FileCheck,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ComplianceReport {
  overallCompliance: number;
  sections: {
    assetVerification: ComplianceSection;
    incidentManagement: ComplianceSection;
    emergencyResponse: ComplianceSection;
    documentation: ComplianceSection;
    training: ComplianceSection;
  };
  findings: Finding[];
  recommendations: string[];
  evidenceChain: Evidence[];
  protocolReferences: ProtocolReference[];
  legalDefensePackage: LegalDefensePackage;
}

interface ComplianceSection {
  score: number;
  status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
  requirements: string[];
  evidenceFound: string[];
  gaps: string[];
}

interface Finding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  description: string;
  protocolReference: string;
  evidence: string;
  recommendation: string;
}

interface Evidence {
  type: 'PHOTO' | 'DOCUMENT' | 'LOG_ENTRY' | 'COMMUNICATION';
  timestamp: string;
  description: string;
  source: string;
  protocolCompliance: string;
  chainOfCustody: string;
}

interface ProtocolReference {
  standard: string;
  section: string;
  requirement: string;
  complianceStatus: 'MET' | 'PARTIAL' | 'NOT_MET';
  evidence: string;
}

interface LegalDefensePackage {
  executiveSummary: string;
  complianceTimeline: any[];
  evidenceInventory: Evidence[];
  protocolAdherence: ProtocolReference[];
  responseEffectiveness: string;
  mitigationMeasures: string[];
  lessonsLearned: string[];
}

interface ComplianceDashboardProps {
  projectId: number;
}

export function ComplianceDashboard({ projectId }: ComplianceDashboardProps) {
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [legalPackage, setLegalPackage] = useState<LegalDefensePackage | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate compliance report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (): Promise<ComplianceReport> => {
      const response = await fetch("/api/compliance/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      if (!response.ok) throw new Error('Failed to generate compliance report');
      return response.json();
    },
    onSuccess: (data) => {
      setComplianceReport(data);
      toast({
        title: "Compliance Report Generated",
        description: `Overall compliance: ${data.overallCompliance}%`,
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate compliance report",
        variant: "destructive",
      });
    },
  });

  // Generate legal defense package mutation
  const generateLegalPackageMutation = useMutation({
    mutationFn: async (): Promise<LegalDefensePackage> => {
      const response = await fetch("/api/compliance/legal-defense-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      if (!response.ok) throw new Error('Failed to generate legal defense package');
      return response.json();
    },
    onSuccess: (data) => {
      setLegalPackage(data);
      toast({
        title: "Legal Defense Package Ready",
        description: "Complete legal documentation package generated",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate legal defense package",
        variant: "destructive",
      });
    },
  });

  // Generate executive summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async (): Promise<{ summary: string }> => {
      const response = await fetch("/api/compliance/executive-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      if (!response.ok) throw new Error('Failed to generate executive summary');
      return response.json();
    },
    onSuccess: (data) => {
      setExecutiveSummary(data.summary);
      toast({
        title: "Executive Summary Ready",
        description: "Summary prepared for executive review",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate executive summary",
        variant: "destructive",
      });
    },
  });

  const getComplianceColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 75) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (score >= 50) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const downloadAsText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hydro-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="flex-1">
                <h3 className="font-medium text-hydro-dark">Compliance Report</h3>
                <p className="text-sm text-gray-600">Complete audit with protocol citations</p>
              </div>
              <Button 
                onClick={() => generateReportMutation.mutate()}
                disabled={generateReportMutation.isPending}
                className="hydro-button-primary"
              >
                {generateReportMutation.isPending ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hydro-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Scale className="w-8 h-8 text-purple-600" />
              <div className="flex-1">
                <h3 className="font-medium text-hydro-dark">Legal Defense Package</h3>
                <p className="text-sm text-gray-600">Evidence chain and regulatory defense</p>
              </div>
              <Button 
                onClick={() => generateLegalPackageMutation.mutate()}
                disabled={generateLegalPackageMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {generateLegalPackageMutation.isPending ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <Gavel className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hydro-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Award className="w-8 h-8 text-green-600" />
              <div className="flex-1">
                <h3 className="font-medium text-hydro-dark">Executive Summary</h3>
                <p className="text-sm text-gray-600">High-level compliance overview</p>
              </div>
              <Button 
                onClick={() => generateSummaryMutation.mutate()}
                disabled={generateSummaryMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {generateSummaryMutation.isPending ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCheck className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Report Display */}
      {complianceReport && (
        <Card className="hydro-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-primary" />
                Compliance Report
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={`${getComplianceColor(complianceReport.overallCompliance)} font-medium`}>
                  {complianceReport.overallCompliance}% Overall Compliance
                </Badge>
                <Button 
                  onClick={() => downloadAsText(JSON.stringify(complianceReport, null, 2), `compliance-report-${new Date().toISOString().split('T')[0]}.json`)}
                  variant="outline" 
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Section Scores */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(complianceReport.sections).map(([key, section]) => (
                <div key={key} className="text-center">
                  <div className={`p-3 rounded-lg border ${getComplianceColor(section.score)}`}>
                    <div className="text-2xl font-bold">{section.score}%</div>
                    <div className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {section.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Critical Findings */}
            {complianceReport.findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                  Critical & High Priority Findings
                </h4>
                <div className="space-y-2">
                  {complianceReport.findings
                    .filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')
                    .map((finding, index) => (
                    <Alert key={index} className="border-l-4 border-l-red-500">
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge className={getSeverityColor(finding.severity)}>{finding.severity}</Badge>
                              <span className="text-sm font-medium">{finding.category}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-1">{finding.description}</p>
                            <p className="text-xs text-gray-500">Protocol: {finding.protocolReference}</p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* Protocol References */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  View Protocol References ({complianceReport.protocolReferences.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Protocol References & Compliance Status</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {complianceReport.protocolReferences.map((ref, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{ref.standard}</Badge>
                          <span className="font-medium text-sm">{ref.section}</span>
                        </div>
                        <Badge className={
                          ref.complianceStatus === 'MET' ? 'bg-green-100 text-green-800' :
                          ref.complianceStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {ref.complianceStatus}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{ref.requirement}</p>
                      {ref.evidence && (
                        <p className="text-xs text-gray-600">Evidence: {ref.evidence}</p>
                      )}
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Legal Defense Package Display */}
      {legalPackage && (
        <Card className="hydro-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Scale className="w-5 h-5 mr-2 text-purple-600" />
                Legal Defense Package
              </div>
              <Button 
                onClick={() => downloadAsText(JSON.stringify(legalPackage, null, 2), `legal-defense-package-${new Date().toISOString().split('T')[0]}.json`)}
                variant="outline" 
                size="sm"
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Package
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Executive Summary</h4>
              <div className="p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap">
                {legalPackage.executiveSummary}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {legalPackage.evidenceInventory.length}
                </div>
                <div className="text-sm text-blue-700">Evidence Items</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {legalPackage.protocolAdherence.filter(p => p.complianceStatus === 'MET').length}
                </div>
                <div className="text-sm text-green-700">Protocols Met</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">
                  {legalPackage.mitigationMeasures.length}
                </div>
                <div className="text-sm text-purple-700">Mitigation Actions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Executive Summary Display */}
      {executiveSummary && (
        <Card className="hydro-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Award className="w-5 h-5 mr-2 text-green-600" />
                Executive Summary
              </div>
              <Button 
                onClick={() => downloadAsText(executiveSummary, `executive-summary-${new Date().toISOString().split('T')[0]}.txt`)}
                variant="outline" 
                size="sm"
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Summary
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded">
              {executiveSummary}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}