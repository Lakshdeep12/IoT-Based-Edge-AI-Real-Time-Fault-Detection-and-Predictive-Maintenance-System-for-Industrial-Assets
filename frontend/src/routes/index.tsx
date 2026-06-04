import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { sparkline, timeSeries } from "@/lib/mock-data";
import {
  Activity, AlertTriangle, CheckCircle2, HardDrive, Heart, ShieldAlert,
  TrendingDown, TrendingUp, Clock, Download, ArrowUpRight, Loader2,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import { deviceService, alertService, predictionService } from "@/services/api";

export const Route = createFileRoute("/")(  {
  head: () => ({
    meta: [
      { title: "Dashboard Overview · Predictive Maintenance Hub" },
      { name: "description", content: "Real-time KPIs, asset health and AI-driven failure predictions for industrial assets." },
    ],
  }),
  component: DashboardPage,
});

interface KPI {
  label: string;
  value: string;
  delta: number;
  icon: LucideIcon;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
  data: { x: number; y: number }[];
}

const toneColor: Record<KPI["tone"], string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--destructive)",
  muted: "var(--muted-foreground)",
};

const toneBg: Record<KPI["tone"], string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

function KpiCard({ kpi }: { kpi: KPI }) {
  const Icon = kpi.icon;
  const positive = kpi.delta >= 0;
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneBg[kpi.tone]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? "+" : ""}{kpi.delta}%
        </span>
      </div>
      <div className="mt-4">
        <div className="text-[12px] font-medium text-muted-foreground">{kpi.label}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular-nums">{kpi.value}</div>
      </div>
      <div className="h-10 mt-3 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={kpi.data}>
            <defs>
              <linearGradient id={`sp-${kpi.label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={toneColor[kpi.tone]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={toneColor[kpi.tone]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="y" stroke={toneColor[kpi.tone]} strokeWidth={1.75} fill={`url(#sp-${kpi.label})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const series = timeSeries(30);

function DashboardPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [devData, alertData, analyticsData] = await Promise.all([
          deviceService.getAll(),
          alertService.getAll(),
          predictionService.getAnalytics(),
        ]);
        setDevices(devData);
        setRecentAlerts(alertData.slice(0, 5));
        setAnalytics(analyticsData);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const totalDevices = devices.length;
  const healthyDevices = devices.filter((d) => d.status === "healthy").length;
  const warningDevices = devices.filter((d) => d.status === "warning").length;
  const criticalDevices = devices.filter((d) => d.status === "critical").length;
  const activeAlerts = recentAlerts.filter((a) => a.status === "active").length;
  const avgHealth = analytics?.average_health_score ?? 0;
  const avgRul = analytics?.average_rul_days ?? 0;

  const kpis: KPI[] = [
    { label: "Total Devices", value: loading ? "—" : totalDevices.toString(), delta: 0, icon: HardDrive, tone: "primary", data: sparkline(16, 60, 8) },
    { label: "Healthy Devices", value: loading ? "—" : healthyDevices.toString(), delta: 1.8, icon: CheckCircle2, tone: "success", data: sparkline(16, 70, 6) },
    { label: "Warning Devices", value: loading ? "—" : warningDevices.toString(), delta: -3.2, icon: AlertTriangle, tone: "warning", data: sparkline(16, 40, 14) },
    { label: "Critical Devices", value: loading ? "—" : criticalDevices.toString(), delta: criticalDevices > 0 ? 12.5 : 0, icon: ShieldAlert, tone: "danger", data: sparkline(16, 30, 18) },
    { label: "Active Alerts", value: loading ? "—" : activeAlerts.toString(), delta: -8.1, icon: Activity, tone: "primary", data: sparkline(16, 45, 12) },
    { label: "Avg Health Score", value: loading ? "—" : `${avgHealth}%`, delta: 0.6, icon: Heart, tone: "success", data: sparkline(16, 75, 8) },
    { label: "Failure Probability", value: loading ? "—" : `${analytics?.active_warnings_count ?? 0} warn`, delta: -1.4, icon: TrendingDown, tone: "warning", data: sparkline(16, 30, 10) },
    { label: "Avg Remaining Life", value: loading ? "—" : `${Math.round(avgRul)} d`, delta: 3.7, icon: Clock, tone: "muted", data: sparkline(16, 60, 8) },
  ];

  const criticalAssets = devices.filter((d) => d.status === "critical").slice(0, 5);

  return (
    <PageShell
      title="Dashboard Overview"
      description="Real-time fleet health, predictive insights and operational KPIs."
      breadcrumb={["Dashboard"]}
      actions={
        <>
          <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card text-sm font-medium hover:bg-accent">
            <Download className="h-4 w-4" /> Export
          </button>
          <a href="/reports" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <ArrowUpRight className="h-4 w-4" /> New Report
          </a>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-base font-semibold text-foreground">Fleet Health &amp; Failure Probability</h3>
              <p className="text-xs text-muted-foreground">Aggregated across {totalDevices} monitored assets · last 30 days</p>
            </div>
            <div className="flex items-center gap-2">
              {["24H", "7D", "30D", "90D"].map((r, i) => (
                <button key={r} className={`h-7 px-2.5 text-xs rounded-md font-medium ${i === 2 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>{r}</button>
              ))}
            </div>
          </div>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="health" stroke="var(--primary)" strokeWidth={2} dot={false} name="Health Score" />
                <Line type="monotone" dataKey="temperature" stroke="var(--warning)" strokeWidth={2} dot={false} name="Avg Temp °C" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Maintenance Cost</h3>
              <p className="text-xs text-muted-foreground">Daily spend · USD</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series.slice(-14)} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="cost" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        {/* Critical assets table */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h3 className="text-base font-semibold text-foreground">Critical Assets Requiring Attention</h3>
              <p className="text-xs text-muted-foreground">Sorted by failure probability</p>
            </div>
            <a href="/devices" className="text-xs font-medium text-primary hover:underline">View all</a>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading assets…
              </div>
            ) : criticalAssets.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <CheckCircle2 className="h-4 w-4 mr-2 text-success" /> No critical assets — fleet healthy!
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-5 py-2.5">Asset</th>
                    <th className="text-left font-medium px-3 py-2.5">Location</th>
                    <th className="text-right font-medium px-3 py-2.5">Health</th>
                    <th className="text-right font-medium px-3 py-2.5">Fail Prob</th>
                    <th className="text-right font-medium px-5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalAssets.map((d) => (
                    <tr key={d.id} className="border-t border-border hover:bg-accent/40">
                      <td className="px-5 py-3">
                        <div className="font-medium text-foreground">{d.name}</div>
                        <div className="text-[11px] text-muted-foreground">{d.id}</div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{d.location}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">{d.health}%</td>
                      <td className="px-3 py-3 text-right tabular-nums text-destructive">{Math.round(d.failure_prob ?? 0)}%</td>
                      <td className="px-5 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> Critical
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent alerts panel */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Recent Alerts</h3>
            <a href="/alerts" className="text-xs font-medium text-primary hover:underline">All alerts</a>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : recentAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent alerts.</p>
          ) : (
            <ul className="space-y-3">
              {recentAlerts.map((a) => {
                const tone = a.severity === "critical" ? "bg-destructive" : a.severity === "warning" ? "bg-warning" : "bg-primary";
                const timeStr = a.recorded_at
                  ? new Date(a.recorded_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "Unknown time";
                return (
                  <li key={a.alert_id} className="flex gap-3">
                    <div className="mt-1.5">
                      <span className={`block h-2 w-2 rounded-full ${tone}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-foreground truncate">{a.device_id}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{a.alert_type}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{timeStr}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  );
}
