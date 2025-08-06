import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw, Zap } from "lucide-react";
import { db } from "../firebase"; // Adjust path as needed
import { doc, getDoc } from "firebase/firestore";

type AIAnalyticsResult = {
  executiveSummary: string;
  recommendations: string[];
  topRisks: { risk: string; evidence: string; recommendedAction: string }[];
  improvementOpportunities: { opportunity: string; howToAchieve: string }[];
  trendAlerts: string[];
  patternDetections: string[];
  complianceNotes: string;
  costSavingsIdeas: string[];
  perSectionDeepDive: {
    incidents?: { summary: string; recs: string[] };
    observations?: { summary: string; recs: string[] };
    nearMisses?: { summary: string; recs: string[] };
    headcount?: { summary: string; recs: string[] };
    roi?: { summary: string; recs: string[] };
  };
};

export default function AIProjectAnalyticsTab({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [ai, setAI] = useState<{
    aiResult: AIAnalyticsResult | null;
    createdAt: string | null;
    inputSnapshot?: any;
  }>({ aiResult: null, createdAt: null });
  const [runningAI, setRunningAI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load latest AI analysis on mount/projectId change
  async function fetchLatestAI() {
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, "projects", projectId, "aiAnalytics", "latest");
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        setAI({ aiResult: null, createdAt: null });
      } else {
        const d = snap.data();
        setAI({
          aiResult: d.aiResult || null,
          createdAt: d.createdAt || null,
          inputSnapshot: d.inputSnapshot
        });
      }
    } catch (err: any) {
      setError("Failed to load AI analytics: " + err?.message);
    }
    setLoading(false);
  }

  useEffect(() => { fetchLatestAI(); /* eslint-disable-next-line */ }, [projectId]);

  // Trigger AI analysis (calls your backend)
  async function runAI() {
    setRunningAI(true);
    setError(null);
    try {
      const resp = await fetch("/api/ai-project-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!resp.ok) throw new Error("AI backend error");
      await fetchLatestAI();
    } catch (err: any) {
      setError("AI analysis failed: " + err?.message);
    }
    setRunningAI(false);
  }

  const lastRun = ai.createdAt ? new Date(ai.createdAt).toLocaleString() : "Never";

  // Renders a section with a title and items (bullets or custom)
  function Section({
    title,
    children,
    icon
  }: {
    title: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
  }) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-2 pb-2">
          {icon}
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 flex flex-col gap-6">
      {/* Run Button + Last Run Info */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-hydro-dark">AI Project Analysis</h1>
          <div className="text-gray-500 text-sm">Last run: <span className="font-mono">{lastRun}</span></div>
        </div>
        <Button
          onClick={runAI}
          disabled={runningAI}
          className="flex items-center gap-2"
          variant="default"
        >
          {runningAI ? <Loader2 className="animate-spin w-4 h-4" /> : <Zap className="w-5 h-5" />}
          {runningAI ? "Running AI..." : "Run AI Analysis Now"}
        </Button>
      </div>

      {/* States */}
      {loading && (
        <div className="flex flex-col items-center gap-2 py-12 text-blue-600">
          <Loader2 className="animate-spin w-8 h-8" />
          <div>Loading latest AI analysis…</div>
        </div>
      )}
      {error && (
        <div className="text-red-600 py-8 text-center font-semibold">{error}</div>
      )}

      {/* No Report Yet */}
      {!loading && !error && !ai.aiResult && (
        <div className="py-16 text-center text-gray-500">
          <Zap className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
          <div>No AI analysis report available yet.</div>
          <div className="mt-1 text-sm">Click “Run AI Analysis Now” to generate the first project insights.</div>
        </div>
      )}

      {/* Show AI Analysis */}
      {!loading && !error && ai.aiResult && (
        <div className="flex flex-col gap-4">
          <Section title="Executive Summary" icon={<RefreshCcw className="text-blue-400" />}>
            <div className="text-lg text-slate-800">{ai.aiResult.executiveSummary}</div>
          </Section>

          <Section title="Top Recommendations" icon={<Zap className="text-green-500" />}>
            <ul className="list-disc ml-6 text-base">
              {ai.aiResult.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
            </ul>
          </Section>

          <Section title="Top Risks" icon={<AlertTriangle className="text-red-500" />}>
            <ul className="list-disc ml-6">
              {ai.aiResult.topRisks.map((r, i) => (
                <li key={i}>
                  <strong>{r.risk}:</strong> {r.evidence} <br />
                  <span className="text-green-700">AI Suggests:</span> <em>{r.recommendedAction}</em>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Improvement Opportunities" icon={<TrendingUp className="text-purple-500" />}>
            <ul className="list-disc ml-6">
              {ai.aiResult.improvementOpportunities.map((opp, i) => (
                <li key={i}><strong>{opp.opportunity}:</strong> {opp.howToAchieve}</li>
              ))}
            </ul>
          </Section>

          <Section title="Trend Alerts" icon={<RefreshCcw className="text-cyan-400" />}>
            <ul className="list-disc ml-6">
              {ai.aiResult.trendAlerts.map((alert, i) => <li key={i}>{alert}</li>)}
            </ul>
          </Section>

          <Section title="Pattern Detections" icon={<Eye className="text-pink-400" />}>
            <ul className="list-disc ml-6">
              {ai.aiResult.patternDetections.map((pat, i) => <li key={i}>{pat}</li>)}
            </ul>
          </Section>

          <Section title="Compliance Notes" icon={<Shield className="text-blue-700" />}>
            <div className="text-base">{ai.aiResult.complianceNotes}</div>
          </Section>

          <Section title="Cost Savings Ideas" icon={<DollarSign className="text-green-600" />}>
            <ul className="list-disc ml-6">
              {ai.aiResult.costSavingsIdeas.map((idea, i) => <li key={i}>{idea}</li>)}
            </ul>
          </Section>

          {/* Per Section Deep Dive */}
          {ai.aiResult.perSectionDeepDive && (
            <Section title="Deep Dive by Category" icon={<BarChart3 className="text-amber-600" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {Object.entries(ai.aiResult.perSectionDeepDive).map(([key, sec]: any, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-bold capitalize mb-2">{key.replace(/([A-Z])/g, ' $1')}</h4>
                    <div className="mb-2 text-gray-700">{sec.summary}</div>
                    {Array.isArray(sec.recs) && sec.recs.length > 0 && (
                      <ul className="list-disc ml-6 text-sm">
                        {sec.recs.map((r: string, idx: number) => <li key={idx}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* (Optional) Debug: Show input snapshot for auditing */}
          {/* <details className="mt-6">
            <summary className="cursor-pointer font-mono text-xs text-gray-400">Show AI Input Snapshot (Debug)</summary>
            <pre className="text-xs overflow-x-auto max-h-56">{JSON.stringify(ai.inputSnapshot, null, 2)}</pre>
          </details> */}
        </div>
      )}
    </div>
  );
}

// Icon imports
import { 
  AlertTriangle, Eye, TrendingUp, Shield, DollarSign, BarChart3 
} from "lucide-react";