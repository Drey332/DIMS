import { useEffect, useMemo, useState } from "react";
import type { IncidentInput } from "@/utils/ai-recommendations";
import { getAIRecommendations } from "@/utils/ai-recommendations";

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

  const { severity, actions, documentation, reportStructure } = state.payload;

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
        <h4 className="font-medium text-foreground">Recommended Actions</h4>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
          {actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
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
