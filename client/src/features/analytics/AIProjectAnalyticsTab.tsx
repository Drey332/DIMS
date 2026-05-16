import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Zap, RefreshCcw, CheckCircle, AlertTriangle, DollarSign, Eye, BarChart3, List, TrendingUp, MapPin, Shield 
} from "lucide-react";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

// === Utility: Format money ===
const fmtMoney = (num: number) =>
  typeof num === "number"
    ? num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : num;

// === Utility: Renders ANY unknown JSON output ===
function renderAny(value: any) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return value.toString();
  if (Array.isArray(value))
    return (
      <ul style={{ paddingLeft: 20, margin: 0 }}>
        {value.map((item, idx) => (
          <li key={idx}>{renderAny(item)}</li>
        ))}
      </ul>
    );
  if (typeof value === "object")
    return (
      <ul style={{ paddingLeft: 20, margin: 0 }}>
        {Object.entries(value).map(([k, v]) => (
          <li key={k}><b>{k}:</b> {renderAny(v)}</li>
        ))}
      </ul>
    );
  return String(value);
}

// === UI Section Wrapper ===
function Section({
  title,
  children,
  icon,
  className = ""
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={"shadow-lg rounded-2xl " + className}>
      <CardHeader className="flex items-center gap-2 pb-2">
        {icon}
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// === Responsive grid ===
const FancyGrid: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
);

// === MAIN COMPONENT ===
export default function AIProjectAnalyticsTab({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [ai, setAI] = useState<any>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
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
        setAI(null);
        setCreatedAt(null);
      } else {
        const d = snap.data();
        // Fix: Always use the AI result object if present
        setAI(d?.aiResult ?? d ?? null);
        setCreatedAt(d?.timestamp || d?.createdAt || null);
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

  const lastRun = createdAt ? new Date(createdAt).toLocaleString() : "Never";

  // === Section Mappings (Tony Stark-style flex display) ===
  const FIELD_MAP = [
    {
      key: "executiveSummary",
      title: "Executive Summary",
      icon: <RefreshCcw className="text-blue-400" />,
      width: "full"
    },
    { key: "safetyTrends", title: "Safety Trends", icon: <TrendingUp className="text-purple-400" /> },
    { key: "patternAnalysis", title: "Incident Pattern Analysis", icon: <BarChart3 className="text-indigo-500" /> },
    { key: "emergencyResponseEffectiveness", title: "Emergency Response Effectiveness", icon: <Eye className="text-pink-400" /> },
    { key: "headcountMusterSystemPerformance", title: "Muster System Performance", icon: <MapPin className="text-blue-700" /> },
    { key: "complianceAssessment", title: "Compliance Assessment", icon: <Shield className="text-blue-700" /> },
    {
      key: "roiCalculations",
      title: "ROI & Cost Analysis",
      icon: <DollarSign className="text-green-600" />,
      render: (v: any) =>
        v && typeof v === "object" ? (
          <div className="space-y-1">
            <div>
              <b>Expected Return:</b>{" "}
              <span className="text-green-700">{fmtMoney(v.expectedReturn)}</span>
            </div>
            <div>
              <b>Investment:</b>{" "}
              <span className="text-cyan-600">{fmtMoney(v.investment)}</span>
            </div>
            <div>
              <b>ROI:</b>{" "}
              <span className="text-blue-700">{v.roi}%</span>
            </div>
          </div>
        ) : renderAny(v)
    },
    {
      key: "dataSnapshot",
      title: "Data Snapshot",
      icon: <List className="text-gray-400" />,
      render: (v: any) =>
        v && typeof v === "object" ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {Object.entries(v).map(([label, val]) => (
              <div key={label}>
                <b>{label.replace(/([A-Z])/g, " $1")}: </b>
                <span className="font-mono">{renderAny(val)}</span>
              </div>
            ))}
          </div>
        ) : renderAny(v)
    },
    {
      key: "actionableRecommendations",
      title: "Top Actionable Recommendations",
      icon: <Zap className="text-green-500" />,
      render: (v: any) =>
        Array.isArray(v) ? (
          <ol className="list-decimal ml-6 text-base space-y-1">
            {v.map((rec: any, i: number) =>
              typeof rec === "string" ? (
                <li key={i}>{rec}</li>
              ) : (
                <li key={i}>
                  {rec.priority && (
                    <span
                      className={`inline-block px-2 py-1 rounded-lg text-xs font-bold mr-2
                    ${
                      rec.priority === "High"
                        ? "bg-red-100 text-red-700"
                        : rec.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                    >
                      {rec.priority}
                    </span>
                  )}
                  {rec.recommendation || renderAny(rec)}
                </li>
              )
            )}
          </ol>
        ) : renderAny(v)
    },
    {
      key: "identifiedRisks",
      title: "Identified Critical Risks",
      icon: <AlertTriangle className="text-red-500" />,
      render: (v: any) =>
        Array.isArray(v) ? (
          <div className="space-y-3">
            {v.map((r: any, i: number) => (
              <div key={i} className="p-3 rounded-xl border bg-red-50">
                <div className="flex items-center gap-2 font-semibold text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{r.risk}</span>
                  {r.severity && (
                    <span className="ml-2 text-xs font-bold uppercase px-2 py-1 rounded-lg bg-red-100">
                      {r.severity}
                    </span>
                  )}
                </div>
                {r.mitigation && <div className="mt-1 text-sm">{r.mitigation}</div>}
                {!r.mitigation && renderAny(r)}
              </div>
            ))}
          </div>
        ) : renderAny(v)
    },
    {
      key: "costSavingOpportunities",
      title: "Cost Saving Opportunities",
      icon: <DollarSign className="text-green-700" />,
      render: (v: any) =>
        Array.isArray(v) ? (
          <ul className="list-disc ml-6">
            {v.map((item: any, i: number) =>
              typeof item === "string" ? (
                <li key={i}>{item}</li>
              ) : (
                <li key={i}>
                  <b>{item.opportunity}</b>
                  {item.estimatedSavings && (
                    <span className="ml-2 text-green-700 font-mono">
                      (Potential: {fmtMoney(item.estimatedSavings)})
                    </span>
                  )}
                </li>
              )
            )}
          </ul>
        ) : renderAny(v)
    },
    {
      key: "trendAlerts",
      title: "Trend Alerts",
      icon: <RefreshCcw className="text-cyan-400" />,
      render: (v: any) =>
        Array.isArray(v) ? (
          <ul className="list-disc ml-6">
            {v.map((alert: string, i: number) => <li key={i}>{alert}</li>)}
          </ul>
        ) : renderAny(v)
    },
    {
      key: "patternDetections",
      title: "Pattern Detections",
      icon: <Eye className="text-pink-400" />,
      render: (v: any) =>
        Array.isArray(v) ? (
          <ul className="list-disc ml-6">
            {v.map((pat: string, i: number) => <li key={i}>{pat}</li>)}
          </ul>
        ) : renderAny(v)
    },
    // Add more sections/fields here as needed!
  ];

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-2 flex flex-col gap-8">
      {/* Run Button + Last Run Info */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-hydro-dark tracking-tight flex items-center gap-3">
            <Zap className="inline-block text-blue-500 w-7 h-7 animate-pulse" /> 
            <span>AI Project Analysis</span>
          </h1>
          <div className="text-gray-500 text-sm mt-1">
            Last run: <span className="font-mono">{lastRun}</span>
          </div>
        </div>
        <Button
          onClick={runAI}
          disabled={runningAI}
          className="flex items-center gap-2 shadow-lg"
          variant="default"
        >
          {runningAI ? <Loader2 className="animate-spin w-4 h-4" /> : <Zap className="w-5 h-5" />}
          {runningAI ? "Running AI..." : "Run AI Analysis Now"}
        </Button>
      </div>

      {/* Loading/Error/Empty States */}
      {loading && (
        <div className="flex flex-col items-center gap-2 py-12 text-blue-600">
          <Loader2 className="animate-spin w-8 h-8" />
          <div>Loading latest AI analysis…</div>
        </div>
      )}
      {error && (
        <div className="text-red-600 py-8 text-center font-semibold">{error}</div>
      )}
      {!loading && !error && !ai && (
        <div className="py-16 text-center text-gray-500">
          <Zap className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
          <div>No AI analysis report available yet.</div>
          <div className="mt-1 text-sm">Click “Run AI Analysis Now” to generate the first project insights.</div>
        </div>
      )}

      {/* === AI Results === */}
      {!loading && !error && ai && (
        <div className="flex flex-col gap-6">
          {/* Executive Summary Full Width */}
          {ai.executiveSummary && (
            <Section title="Executive Summary" icon={<RefreshCcw className="text-blue-400" />}>
              <div className="text-lg text-slate-800">{renderAny(ai.executiveSummary)}</div>
            </Section>
          )}

          {/* All other mapped sections */}
          <FancyGrid>
            {FIELD_MAP.filter(f => f.key !== "executiveSummary").map(({ key, title, icon, render }) =>
              ai[key] ? (
                <Section key={key} title={title} icon={icon}>
                  {render ? render(ai[key]) : renderAny(ai[key])}
                </Section>
              ) : null
            )}
          </FancyGrid>

          {/* --- Deep Dive Section --- */}
          {ai.perSectionDeepDive && (
            <Section title="Deep Dive (by Section)" icon={<BarChart3 className="text-indigo-500" />}>
              {renderAny(ai.perSectionDeepDive)}
            </Section>
          )}

          {/* --- If new unknown fields arrive in future AI versions, render all others for devs */}
          {Object.entries(ai)
            .filter(([k]) => !FIELD_MAP.map(f => f.key).concat(["perSectionDeepDive"]).includes(k))
            .map(([k, v]) => (
              <Section key={k} title={k.replace(/([A-Z])/g, " $1")} icon={<CheckCircle className="text-green-600" />}>
                {renderAny(v)}
              </Section>
            ))}
        </div>
      )}
    </div>
  );
}