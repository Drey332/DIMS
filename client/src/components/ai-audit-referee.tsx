import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye,
  FileText,
  Clock,
  TrendingUp
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuditResult {
  complianceStatus: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT' | 'CRITICAL_VIOLATION';
  findings: string[];
  requiredActions: string[];
  protocolReferences: string[];
  blockAction: boolean;
  nextSteps: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ComplianceSummary {
  overallCompliance: number;
  criticalIssues: number;
  pendingActions: string[];
  protocolViolations: string[];
}

interface AIAuditRefereeProps {
  projectId: number;
  onActionBlocked?: (result: AuditResult) => void;
  onComplianceUpdate?: (summary: ComplianceSummary) => void;
}

export function AIAuditReferee({ projectId, onActionBlocked, onComplianceUpdate }: AIAuditRefereeProps) {
  const [isAuditing, setIsAuditing] = useState(false);
  const [lastAuditResult, setLastAuditResult] = useState<AuditResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch compliance summary
  const { data: complianceSummary, refetch: refetchSummary } = useQuery({
    queryKey: ["/api/ai/compliance-summary", projectId],
    queryFn: async (): Promise<ComplianceSummary> => {
      const response = await fetch(`/api/ai/compliance-summary?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch compliance summary');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Audit action mutation
  const auditActionMutation = useMutation({
    mutationFn: async (actionDetails: any): Promise<AuditResult> => {
      const response = await fetch("/api/ai/audit-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionDetails, projectId })
      });
      if (!response.ok) throw new Error('Audit failed');
      return response.json();
    },
    onSuccess: (result: AuditResult) => {
      setLastAuditResult(result);
      refetchSummary();
      
      if (result.blockAction && onActionBlocked) {
        onActionBlocked(result);
      }

      // Show toast based on compliance status
      if (result.complianceStatus === 'CRITICAL_VIOLATION') {
        toast({
          title: "🚨 Critical Violation Detected",
          description: "Action blocked due to safety protocol violation",
          variant: "destructive",
        });
      } else if (result.complianceStatus === 'NON_COMPLIANT') {
        toast({
          title: "⚠️ Non-Compliance Detected",
          description: "Review required actions before proceeding",
          variant: "destructive",
        });
      } else if (result.complianceStatus === 'WARNING') {
        toast({
          title: "⚠️ Compliance Warning",
          description: "Additional precautions recommended",
        });
      }
    },
    onError: () => {
      toast({
        title: "AI Audit Error",
        description: "Failed to perform compliance check",
        variant: "destructive",
      });
    },
  });

  // Expose audit function for external use
  const auditAction = async (actionDetails: {
    type: string;
    description: string;
    evidence?: string[];
    criticality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }) => {
    setIsAuditing(true);
    try {
      await auditActionMutation.mutateAsync(actionDetails);
    } finally {
      setIsAuditing(false);
    }
  };

  // Update parent component when compliance changes
  useEffect(() => {
    if (complianceSummary && onComplianceUpdate) {
      onComplianceUpdate(complianceSummary);
    }
  }, [complianceSummary, onComplianceUpdate]);

  const getComplianceColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50";
    if (score >= 75) return "text-yellow-600 bg-yellow-50";
    if (score >= 50) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'NON_COMPLIANT':
        return <XCircle className="w-5 h-5 text-orange-600" />;
      case 'CRITICAL_VIOLATION':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Shield className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Compliance Summary Card */}
      {complianceSummary && (
        <Card className="hydro-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-primary" />
                AI Safety Referee
              </div>
              <Badge className={`${getComplianceColor(complianceSummary.overallCompliance)} font-medium`}>
                {complianceSummary.overallCompliance}% Compliant
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-hydro-dark">
                  {complianceSummary.overallCompliance}%
                </div>
                <div className="text-sm text-gray-600">Overall Compliance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {complianceSummary.criticalIssues}
                </div>
                <div className="text-sm text-gray-600">Critical Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {complianceSummary.pendingActions.length}
                </div>
                <div className="text-sm text-gray-600">Pending Actions</div>
              </div>
            </div>

            {complianceSummary.criticalIssues > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {complianceSummary.criticalIssues} critical safety issue(s) require immediate attention
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Last Audit Result */}
      {lastAuditResult && (
        <Card className="hydro-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(lastAuditResult.complianceStatus)}
                <span className="ml-2">Latest Audit Result</span>
              </div>
              <Badge className={getRiskBadgeColor(lastAuditResult.riskLevel)}>
                {lastAuditResult.riskLevel} Risk
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              Status: <span className="font-medium">{lastAuditResult.complianceStatus.replace('_', ' ')}</span>
            </div>

            {lastAuditResult.findings.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Findings:</h4>
                <ul className="space-y-1">
                  {lastAuditResult.findings.map((finding, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-orange-500 mr-2">•</span>
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lastAuditResult.requiredActions.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Required Actions:</h4>
                <ul className="space-y-1">
                  {lastAuditResult.requiredActions.map((action, index) => (
                    <li key={index} className="text-sm text-red-700 flex items-start">
                      <span className="text-red-500 mr-2">→</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lastAuditResult.nextSteps.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Recommended Next Steps:</h4>
                <ul className="space-y-1">
                  {lastAuditResult.nextSteps.map((step, index) => (
                    <li key={index} className="text-sm text-blue-700 flex items-start">
                      <span className="text-blue-500 mr-2">✓</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lastAuditResult.protocolReferences.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="w-4 h-4 mr-2" />
                    View Protocol References
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Protocol References</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {lastAuditResult.protocolReferences.map((ref, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded text-sm">
                        {ref}
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      )}

      {/* Real-time Monitoring Status */}
      <Card className="hydro-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm text-gray-600">AI Referee Active</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1" />
              Real-time monitoring
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export the audit function for external components
export { type AuditResult, type ComplianceSummary };