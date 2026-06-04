import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Brain, TrendingUp, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { predictionService } from "@/services/api";

export const Route = createFileRoute("/predictions")({
  head: () => ({ meta: [{ title: "AI Predictions · Predictive Maintenance Hub" }] }),
  component: PredictionsPage,
});

const riskTone = {
  Critical: "text-destructive bg-destructive/10",
  High: "text-warning bg-warning/10",
  Medium: "text-primary bg-primary/10",
  Low: "text-success bg-success/10",
} as const;

const riskColor = {
  Critical: "var(--destructive)",
  High: "var(--warning)",
  Medium: "var(--primary)",
  Low: "var(--success)",
} as const;

function Gauge({ value, color }: { value: number; color: string }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} stroke="var(--border)" strokeWidth="7" fill="none" />
        <circle cx="40" cy="40" r={r} stroke={color} strokeWidth="7" fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">{value.toFixed(0)}%</div>
    </div>
  );
}

interface Prediction {
  prediction_id: number;
  device_id: string;
  device_name: string;
  predicted_state: string;
  confidence: number;
  failure_probability: number;
  rul_days: number | null;
  risk: "Critical" | "High" | "Medium" | "Low";
  recorded_at: string | null;
}

function PredictionCard({ p }: { p: Prediction }) {
  const color = riskColor[p.risk] ?? "var(--primary)";
  const tone = riskTone[p.risk] ?? "text-primary bg-primary/10";
  const timeStr = p.recorded_at
    ? new Date(p.recorded_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Predicted Fault</div>
          <div className="text-base font-semibold text-foreground mt-0.5">{p.predicted_state}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{p.device_name ?? p.device_id}</div>
        </div>
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${tone}`}>{p.risk}</span>
      </div>

      <div className="flex items-center gap-5">
        <Gauge value={p.confidence} color={color} />
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">Failure probability</span>
              <span className="font-medium tabular-nums">{p.failure_probability.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${p.failure_probability}%`, background: color }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-medium tabular-nums">{p.confidence.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${p.confidence}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining Life</div>
          <div className="text-lg font-semibold tabular-nums">
            {p.rul_days ?? "—"} <span className="text-xs font-normal text-muted-foreground">days</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {timeStr && <div className="text-[10px] text-muted-foreground">{timeStr}</div>}
          <a href={`/devices`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View device <TrendingUp className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await predictionService.getAll();
      setPredictions(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Could not load predictions from the inference engine.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <PageShell
      title="AI Predictions"
      description="Forecasted faults, confidence and remaining useful life from the inference engine."
      breadcrumb={["Predictions"]}
      actions={
        <div className="flex items-center gap-2">
          <button
            id="refresh-predictions"
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card text-sm hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <div className="inline-flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-card text-sm">
            <Brain className="h-4 w-4 text-primary" /> Model v4.2 · Updated {now}
          </div>
        </div>
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Running inference engine…</span>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-destructive text-sm">Failed to load predictions</div>
            <div className="text-xs text-muted-foreground mt-1">{error}</div>
            <button onClick={() => load()} className="mt-3 text-xs font-medium text-primary hover:underline">Try again</button>
          </div>
        </div>
      )}

      {!loading && !error && predictions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Brain className="h-10 w-10 text-muted-foreground/40" />
          <div className="text-sm font-medium text-muted-foreground">No predictions yet</div>
          <p className="text-xs text-muted-foreground max-w-xs">
            Upload telemetry data via the Devices page to trigger the ML inference pipeline.
          </p>
        </div>
      )}

      {!loading && !error && predictions.length > 0 && (
        <>
          {/* Summary strip */}
          <div className="flex flex-wrap gap-3 mb-5">
            {(["Critical", "High", "Medium", "Low"] as const).map((tier) => {
              const count = predictions.filter((p) => p.risk === tier).length;
              return (
                <div key={tier} className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium ${riskTone[tier]}`}>
                  {tier}: {count}
                </div>
              );
            })}
            <div className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              Total: {predictions.length} devices
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {predictions.map((p) => <PredictionCard key={p.prediction_id} p={p} />)}
          </div>
        </>
      )}
    </PageShell>
  );
}
