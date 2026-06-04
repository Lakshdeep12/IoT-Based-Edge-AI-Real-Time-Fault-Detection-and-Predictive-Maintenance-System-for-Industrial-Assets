import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { AlertOctagon, Clock, Wrench, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { maintenanceService } from "@/services/api";

export const Route = createFileRoute("/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance Center · Predictive Maintenance Hub" }] }),
  component: MaintenancePage,
});

/** Parse the LLM remediation guide markdown into structured sections. */
function parseGuide(guide: string): { rootCause: string; steps: string[] } {
  const rootCauseMatch = guide.match(/\*\*Root Cause[^*]*\*\*\s*\n+([\s\S]*?)(?=\*\*|$)/i);
  const rootCause = rootCauseMatch ? rootCauseMatch[1].trim() : guide.split("\n").slice(0, 2).join(" ").trim();

  const stepLines = guide
    .split("\n")
    .filter((l) => /^\d+\./.test(l.trim()))
    .map((l) => l.replace(/^\d+\.\s*/, "").trim());

  return { rootCause, steps: stepLines };
}

function priorityFromSeverity(severity: string): "Critical" | "High" | "Medium" {
  if (severity === "critical") return "Critical";
  if (severity === "warning") return "High";
  return "Medium";
}

const priorityTone = {
  Critical: "text-destructive bg-destructive/10 border-destructive/20",
  High: "text-warning bg-warning/10 border-warning/20",
  Medium: "text-primary bg-primary/10 border-primary/20",
} as const;

interface RemedItem {
  alert_id: number;
  device_id: string;
  alert_type: string;
  severity: string;
  llm_remediation_guide: string;
  recorded_at: string;
}

function RemediationCard({ item }: { item: RemedItem }) {
  const [expanded, setExpanded] = useState(true);
  const priority = priorityFromSeverity(item.severity);
  const { rootCause, steps } = parseGuide(item.llm_remediation_guide);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <AlertOctagon className="h-4 w-4 text-destructive flex-shrink-0" />
            <h3 className="text-base font-semibold text-foreground">{item.alert_type}</h3>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${priorityTone[priority]}`}>
              {priority} Priority
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{item.device_id}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" />
            <span className="text-foreground font-medium">
              {item.recorded_at
                ? new Date(item.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "—"}
            </span>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="h-8 w-8 rounded-md border border-border bg-card flex items-center justify-center hover:bg-accent transition-colors"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Root cause */}
          <div className="p-5 lg:col-span-1 border-b lg:border-b-0 lg:border-r border-border flex flex-col gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Root Cause Analysis</div>
              <p className="text-sm text-foreground leading-relaxed">{rootCause || "Root cause analysis in progress…"}</p>
            </div>
            <div className="mt-auto">
              <button
                id={`create-work-order-${item.alert_id}`}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 w-full justify-center"
              >
                <Wrench className="h-4 w-4" /> Create Work Order
              </button>
            </div>
          </div>

          {/* Step-by-step guide */}
          <div className="p-5 lg:col-span-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Step-by-Step Repair Guide</div>
            {steps.length > 0 ? (
              <ol className="space-y-2.5">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-accent text-primary text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {item.llm_remediation_guide}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MaintenancePage() {
  const [items, setItems] = useState<RemedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await maintenanceService.getRemediation();
        setItems(data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Failed to load maintenance recommendations.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <PageShell
      title="Maintenance Center"
      description="AI-generated recommendations with step-by-step repair guidance."
      breadcrumb={["Maintenance Center"]}
    >
      {loading && (
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading AI remediation guides…</span>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <CheckCircle2 className="h-10 w-10 text-success/40" />
          <div className="text-sm font-medium text-muted-foreground">No active maintenance recommendations</div>
          <p className="text-xs text-muted-foreground max-w-xs">
            AI remediation guides appear here when alerts with root-cause analysis are generated.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <RemediationCard key={item.alert_id} item={item} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
