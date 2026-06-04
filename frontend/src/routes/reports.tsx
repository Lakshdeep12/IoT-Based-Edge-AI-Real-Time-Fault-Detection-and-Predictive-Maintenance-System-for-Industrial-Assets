import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { FileText, FileSpreadsheet, Download, Calendar, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { reportService } from "@/services/api";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports · Predictive Maintenance Hub" }] }),
  component: ReportsPage,
});

interface ReportMeta {
  id: string;
  title: string;
  desc: string;
  type: "pdf" | "csv";
  icon: typeof FileText;
  date: string;
}

const reportCatalog: ReportMeta[] = [
  {
    id: "fleet-health-pdf",
    title: "Fleet Health Report",
    desc: "Full fleet-wide device status, health indices, failure probabilities and RUL across all registered assets.",
    type: "pdf",
    icon: FileText,
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  },
  {
    id: "telemetry-export-csv",
    title: "Asset Telemetry Export",
    desc: "Raw device sensor readings — temperature, vibration and runtime — exported as a flat CSV file.",
    type: "csv",
    icon: FileSpreadsheet,
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  },
  {
    id: "predictive-forecast-pdf",
    title: "Predictive Maintenance Forecast",
    desc: "AI-generated failure probability outlook with recommended maintenance actions for the next 30 days.",
    type: "pdf",
    icon: FileText,
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  },
];

function ReportCard({ report }: { report: ReportMeta }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const Icon = report.icon;
  const isPdf = report.type === "pdf";

  async function handleDownload() {
    setStatus("loading");
    setErrorMsg(null);
    try {
      await reportService.download(report.type);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e: any) {
      const detail = e?.response?.data
        ? await e.response.data.text?.()
        : null;
      setErrorMsg(detail || "Download failed. Ensure you are logged in.");
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPdf ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{report.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{report.desc}</p>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent text-foreground flex-shrink-0 uppercase">
          {report.type}
        </span>
      </div>

      {errorMsg && (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs">
        <div className="text-muted-foreground">Generated {report.date}</div>
        <button
          id={`download-${report.id}`}
          onClick={handleDownload}
          disabled={status === "loading"}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-card text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
        >
          {status === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
          {status === "idle" && <Download className="h-3.5 w-3.5" />}
          {status === "error" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
          {status === "loading" ? "Generating…" : status === "done" ? "Downloaded!" : "Download"}
        </button>
      </div>
    </div>
  );
}

function ReportsPage() {
  return (
    <PageShell
      title="Reports"
      description="Generate and download live fleet reports directly from the database."
      breadcrumb={["Reports"]}
      actions={
        <button className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Calendar className="h-4 w-4" /> Schedule Report
        </button>
      }
    >
      {/* Info banner */}
      <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary flex items-center gap-2">
        <Download className="h-4 w-4 flex-shrink-0" />
        Reports are generated live from the current database — data is always up-to-date.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reportCatalog.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
    </PageShell>
  );
}
