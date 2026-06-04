import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { AlertCircle, AlertTriangle, Info, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { alertService } from "@/services/api";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alert Center · Predictive Maintenance Hub" }] }),
  component: AlertsPage,
});

const sevConfig = {
  critical: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Critical" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "Warning" },
  info: { icon: Info, color: "text-primary", bg: "bg-primary/10", label: "Info" },
} as const;

type Severity = keyof typeof sevConfig;
type AlertStatus = "active" | "acknowledged" | "resolved";

interface Alert {
  alert_id: number;
  device_id: string;
  alert_type: string;
  severity: string;
  status: AlertStatus;
  llm_remediation_guide: string | null;
  recorded_at: string;
}

function AlertRow({
  alert,
  isLast,
  onAcknowledge,
}: {
  alert: Alert;
  isLast: boolean;
  onAcknowledge: (id: number) => void;
}) {
  const sev = (sevConfig[alert.severity as Severity] ?? sevConfig.info);
  const Icon = sev.icon;
  const timeStr = alert.recorded_at
    ? new Date(alert.recorded_at).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "Unknown";
  const isAcknowledged = alert.status !== "active";

  return (
    <li className={`flex gap-4 p-5 transition-colors ${isLast ? "" : "border-b border-border"} ${isAcknowledged ? "opacity-60" : ""}`}>
      <div className={`flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${sev.bg}`}>
        <Icon className={`h-[18px] w-[18px] ${sev.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{alert.device_id}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${sev.bg} ${sev.color}`}>
            {sev.label}
          </span>
          {isAcknowledged && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-muted text-muted-foreground">
              {alert.status}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{alert.alert_type}</p>
        {alert.llm_remediation_guide && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
            AI guide available · {alert.llm_remediation_guide.substring(0, 80)}…
          </p>
        )}
        <div className="text-[11px] text-muted-foreground mt-1.5">{timeStr}</div>
      </div>
      <div className="flex items-start gap-2 flex-shrink-0">
        {!isAcknowledged && (
          <button
            id={`ack-alert-${alert.alert_id}`}
            onClick={() => onAcknowledge(alert.alert_id)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Acknowledge
          </button>
        )}
        <a href="/maintenance" className="text-xs font-medium text-primary hover:underline">Investigate →</a>
      </div>
    </li>
  );
}

function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filtered, setFiltered] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await alertService.getAll();
      setAlerts(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let list = [...alerts];
    if (severityFilter !== "all") list = list.filter((a) => a.severity === severityFilter);
    if (statusFilter !== "all") list = list.filter((a) => a.status === statusFilter);
    setFiltered(list);
  }, [alerts, severityFilter, statusFilter]);

  async function handleAcknowledge(alertId: number) {
    try {
      await alertService.acknowledge(alertId, "acknowledged");
      setAlerts((prev) =>
        prev.map((a) => a.alert_id === alertId ? { ...a, status: "acknowledged" } : a)
      );
    } catch {
      // silently ignore; UI stays in sync via optimistic update rollback not needed for MVP
    }
  }

  const activeCount = alerts.filter((a) => a.status === "active").length;

  return (
    <PageShell
      title="Alert Center"
      description="Chronological alert timeline with severity-based routing."
      breadcrumb={["Alerts"]}
      actions={
        <button
          id="refresh-alerts"
          onClick={load}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card text-sm hover:bg-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      }
    >
      {/* Summary badges */}
      {!loading && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
            {alerts.filter((a) => a.severity === "critical").length} Critical
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium bg-warning/10 text-warning">
            {alerts.filter((a) => a.severity === "warning").length} Warning
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {activeCount} Active
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 sticky top-16 bg-background py-3 z-10">
        <select
          id="severity-filter"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2.5 text-sm"
        >
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2.5 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading alerts…</span>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <CheckCircle2 className="h-10 w-10 text-success/40" />
          <p className="text-sm text-muted-foreground">No alerts match the selected filters.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <ol className="relative">
            {filtered.map((a, i) => (
              <AlertRow
                key={a.alert_id}
                alert={a}
                isLast={i === filtered.length - 1}
                onAcknowledge={handleAcknowledge}
              />
            ))}
          </ol>
        </div>
      )}
    </PageShell>
  );
}
