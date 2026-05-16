import { useEffect, useMemo, useState } from "react";
import type { IncidentInput } from "@shared/incident-analysis";
import { getAIRecommendations } from "@shared/incident-analysis";

interface AIRecommendationsProps {
  incident: IncidentInput;
  title?: string;
}

interface RecommendationState {
  status: "idle" | "loading" | "success" | "error";
  error?: string;
  payload?: Awaited<ReturnType<typeof getAIRecommendations>>;
}

export function AIRecommendationsPanel({ incident, title }: AIRecommendationsProps) {
  const [state, setState] = useState<RecommendationState>({ status: "idle" });

  const incidentSignature = useMemo(() => {
    const { title, description, category } = incident;
    return `${title ?? ""}::${description ?? ""}::${category ?? ""}`;
  }, [incident]);

  useEffect(() => {
    let cancelled = false;
    async function runRecommendations() {
      if (!incident.title || !incident.description || !incident.category) {
        setState({ status: "error", error: "Incident details are incomplete." });
        return;
      }
      setState({ status: "loading" });
      try {
        const payload = await getAIRecommendations(incident);
        if (!cancelled) {
          setState({ status: "success", payload });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error.message : "Failed to load AI recommendations.",
          });
        }
      }
    }

    runRecommendations();
    return () => {
      cancelled = true;
    };
  }, [incident, incidentSignature]);

  if (state.status === "loading" || state.status === "idle") {
    return (
      <div className="rounded-md border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
        {title && <p className="font-medium text-foreground">{title}</p>}
        <p className="mt-2">Analyzing incident details and preparing recommendations…</p>
      </div>
    );
  }

  if (state.status === "error" || !state.payload) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {title && <p className="font-medium text-destructive-foreground">{title}</p>}
        <p className="mt-2">{state.error ?? "Unable to generate AI recommendations."}</p>
      </div>
    );
  }

  const { severity, documentation, reportStructure, risk, evidenceCards, lowResourcePlan } = state.payload;

  return (
    <section className="space-y-4 rounded-md border border-border bg-background p-4 text-sm">
      {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}

      <div>
        <h4 className="font-medium text-foreground">Severity Assessment</h4>
        <p className="mt-1 text-muted-foreground">
          Tier {severity.tier} &mdash; {severity.escalation}
        </p>
      </div>

      <div>
        <h4 className="font-medium text-foreground">Evidence-Informed Risk Index</h4>
        <div className="mt-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">{risk.band}</span>
            <span className="font-mono text-sm text-muted-foreground">{risk.score}/100</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${risk.score}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Confidence: {risk.confidence}. Dominant driver: {risk.drivers[0]?.factor ?? "n/a"}.
          </p>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-foreground">Evidence Cards</h4>
        <div className="mt-2 space-y-2">
          {evidenceCards.slice(0, 4).map((card) => (
            <div key={card.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">{card.priority}</span>
                <span className="text-xs text-muted-foreground">{card.deadline}</span>
              </div>
              <p className="mt-2 text-sm text-foreground">{card.action}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.rationale}</p>
              <p className="mt-1 text-xs text-muted-foreground">Uncertainty: {card.uncertainty}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-foreground">Low-Resource Mode</h4>
        <div className="mt-2 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-sm font-semibold text-foreground">{lowResourcePlan.mode}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {lowResourcePlan.communications.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-foreground">Documentation Checklist</h4>
        {documentation.complete ? (
          <p className="mt-1 text-muted-foreground">All required documentation appears complete.</p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {documentation.missingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="font-medium text-foreground">Report Structure</h4>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Cover Page: {reportStructure.coverPage.title}</li>
          <li>Incident Details: {reportStructure.incidentDetails.description}</li>
          <li>Initial Response: {reportStructure.initialResponse.join(" ")}</li>
          {reportStructure.escalatedResponse.length > 0 && (
            <li>Escalated Response: {reportStructure.escalatedResponse.join(" ")}</li>
          )}
          <li>Investigation: {reportStructure.investigation}</li>
        </ul>
      </div>
    </section>
  );
}

export default AIRecommendationsPanel;
