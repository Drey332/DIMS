import { AlertTriangle, Loader2, ShieldCheck, Activity, WifiOff, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEnvIntelContext } from "@/hooks/use-env-intel";
import type { EnvContext } from "@shared/types/env";

interface EnvIntelCardProps {
  latitude?: number;
  longitude?: number;
}

export function EnvIntelCard({ latitude, longitude }: EnvIntelCardProps) {
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
  const { context: data, status, heartbeat } = useEnvIntelContext(
    latitude,
    longitude,
    250
  );

  if (!hasCoords) {
    return (
      <Card className="border-slate-200 bg-slate-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="h-5 w-5" />
            Operational Environment Intelligence
          </CardTitle>
          <CardDescription>
            Provide precise coordinates to generate geomagnetic and seismic intel for this site.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const waitingForFirstPayload = !data && (status === "connecting" || status === "idle");

  if (waitingForFirstPayload) {
    return (
      <Card className="border-slate-200 bg-slate-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Activity className="h-5 w-5" />
            Operational Environment Intelligence
          </CardTitle>
          <CardDescription>Loading geomagnetic + seismic posture…</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-red-200 bg-red-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="h-5 w-5" />
            Operational Environment Intelligence Unavailable
          </CardTitle>
          <CardDescription>We have not received any environmental intelligence for this site yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-red-900">
            <WifiOff className="h-4 w-4" />
            Waiting for connection…
          </div>
        </CardContent>
      </Card>
    );
  }

  const badgeClass =
    data.risk_level === "high"
      ? "bg-red-100 text-red-800 border-red-200"
      : data.risk_level === "medium"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-emerald-100 text-emerald-800 border-emerald-200";

  const formattedFetchedAt = new Date(data.fetched_at).toLocaleString();
  const kpDisplay =
    typeof data.indicators.kp_index === "number" && Number.isFinite(data.indicators.kp_index)
      ? data.indicators.kp_index.toFixed(1)
      : "n/a";

  const statusBadge = getStatusBadge(status, data);
  const showOfflineBanner = status === "offline";
  const showReconnectBanner = status === "reconnecting";
  const showStaleBanner = data.stale && status !== "offline";
  const lastHeartbeat = heartbeat ? new Date(heartbeat).toLocaleTimeString() : null;

  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <ShieldCheck className="h-5 w-5" />
            Operational Environment Intelligence
          </CardTitle>
          <Badge className={`border ${badgeClass}`}>Risk: {data.risk_level.toUpperCase()}</Badge>
          {statusBadge}
          <Badge variant="outline" className="border-emerald-200 bg-white/70 text-emerald-800">
            Kp {kpDisplay}
          </Badge>
          <Badge variant="outline" className="border-emerald-200 bg-white/70 text-emerald-800">
            Quakes 24h: {data.indicators.quakes_24h_count}
          </Badge>
        </div>
        <CardDescription className="text-sm text-emerald-800">
          Snapshot fetched {formattedFetchedAt}. Ready to drop straight into ERP notes.
        </CardDescription>
        {showOfflineBanner ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/80 p-2 text-sm text-red-700">
            <WifiOff className="h-4 w-4" />
            Upstream feed unreachable. Showing the most recent cached intelligence.
          </div>
        ) : null}
        {showReconnectBanner ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2 text-xs text-amber-800">
            <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
            Connection interrupted—retrying automatically.
          </div>
        ) : null}
        {showStaleBanner ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-xs text-amber-800">
            Feeds responded with partial data. Treat this assessment as stale until next refresh.
          </div>
        ) : null}
        {lastHeartbeat ? (
          <div className="text-xs text-emerald-700">Last signal: {lastHeartbeat}</div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-emerald-900">
        <div className="rounded-lg border border-emerald-200 bg-white/80 p-4">
          <pre className="whitespace-pre-wrap break-words font-sans leading-relaxed text-sm text-emerald-900">{data.erp_note_md}</pre>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <h4 className="font-semibold text-emerald-900">Key risks</h4>
            <ul className="mt-2 space-y-2 text-sm">
              {data.key_risks.length === 0 ? (
                <li className="text-emerald-700">No elevated risk factors detected in the last 24 hours.</li>
              ) : (
                data.key_risks.map((risk) => (
                  <li key={risk} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                    <span>{risk}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-emerald-900">Protective measures</h4>
            <ul className="mt-2 space-y-2 text-sm">
              {data.protective_measures.length === 0 ? (
                <li className="text-emerald-700">No special protective actions recommended at this time.</li>
              ) : (
                data.protective_measures.map((measure) => (
                  <li key={measure} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                    <span>{measure}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusBadge(status: string, context: EnvContext): JSX.Element | null {
  switch (status) {
    case "live":
      return (
        <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-800">LIVE</Badge>
      );
    case "stale":
      return (
        <Badge className="border border-amber-200 bg-amber-100 text-amber-800">STALE</Badge>
      );
    case "reconnecting":
      return (
        <Badge className="border border-slate-200 bg-slate-100 text-slate-700">RECONNECTING…</Badge>
      );
    case "offline":
      return (
        <Badge className="border border-red-200 bg-red-100 text-red-800">OFFLINE</Badge>
      );
    case "connecting":
    case "idle":
      return context
        ? (
            <Badge className="border border-slate-200 bg-slate-100 text-slate-700">SYNCING…</Badge>
          )
        : null;
    default:
      return null;
  }
}
