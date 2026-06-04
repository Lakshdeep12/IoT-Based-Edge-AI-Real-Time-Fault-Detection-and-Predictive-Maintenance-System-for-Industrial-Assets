import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { PageShell } from "@/components/page-shell";
import { Calendar, Download, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { deviceService, telemetryService } from "@/services/api";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics · Predictive Maintenance Hub" }] }),
  component: AnalyticsPage,
});

interface ChartCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  loading?: boolean;
}

const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };
const axisProps = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false };

function ChartCard({ title, subtitle, children, loading }: ChartCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <button className="text-xs text-muted-foreground hover:text-foreground">⤢</button>
      </div>
      <div className="h-64">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : children}
      </div>
    </div>
  );
}

/** Shape returned from /telemetry/device/:id */
interface TelemetryPoint {
  recorded_at: string;
  temperature_c: number;
  vibration_mps2: number;
}

/** Shape we pass to recharts */
interface ChartPoint {
  date: string;
  temperature: number;
  vibration: number;
  health?: number;
}

function AnalyticsPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [telemetry, setTelemetry] = useState<ChartPoint[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load devices on mount
  useEffect(() => {
    deviceService.getAll()
      .then((data) => {
        setDevices(data);
        if (data.length > 0) setSelectedDevice(data[0].id);
      })
      .catch(() => setError("Failed to load devices."))
      .finally(() => setLoadingDevices(false));
  }, []);

  // Load telemetry whenever device changes
  const loadTelemetry = useCallback(async (deviceId: string, limit = 60) => {
    if (!deviceId) return;
    setLoadingTelemetry(true);
    setError(null);
    try {
      const raw: TelemetryPoint[] = await telemetryService.getHistory(deviceId, limit);
      const points: ChartPoint[] = raw
        .slice()
        .reverse()
        .map((t) => ({
          date: new Date(t.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          temperature: +t.temperature_c.toFixed(1),
          vibration: +t.vibration_mps2.toFixed(2),
        }));
      setTelemetry(points);
    } catch {
      setError("No telemetry data for this device yet.");
      setTelemetry([]);
    } finally {
      setLoadingTelemetry(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDevice) loadTelemetry(selectedDevice);
  }, [selectedDevice, loadTelemetry]);

  const noData = !loadingTelemetry && telemetry.length === 0;

  return (
    <PageShell
      title="Analytics"
      description="Time-series insights from real device telemetry."
      breadcrumb={["Analytics"]}
      actions={
        <>
          {/* Device selector */}
          <select
            id="analytics-device-selector"
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            disabled={loadingDevices}
            className="h-9 rounded-md border border-border bg-card px-2.5 text-sm min-w-[180px] disabled:opacity-50"
          >
            {loadingDevices && <option>Loading devices…</option>}
            {devices.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
            ))}
          </select>

          <select
            id="analytics-range-selector"
            onChange={(e) => loadTelemetry(selectedDevice, parseInt(e.target.value))}
            className="h-9 rounded-md border border-border bg-card px-2.5 text-sm"
          >
            <option value="60">Last 60 readings</option>
            <option value="30">Last 30 readings</option>
            <option value="100">Last 100 readings</option>
          </select>

          <button
            id="analytics-refresh"
            onClick={() => loadTelemetry(selectedDevice)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card text-sm hover:bg-accent"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingTelemetry ? "animate-spin" : ""}`} />
          </button>

          <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card text-sm hover:bg-accent">
            <Download className="h-4 w-4" /> Export
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {noData && !error && (
        <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          No telemetry readings found for this device. Upload CSV data or submit manual readings on the Devices page.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Temperature vs Time" subtitle={`Sensor temperature · °C · ${devices.find(d => d.id === selectedDevice)?.name ?? selectedDevice}`} loading={loadingTelemetry}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetry} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}°C`, "Temperature"]} />
              <Line type="monotone" dataKey="temperature" stroke="var(--destructive)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Vibration vs Time" subtitle="RMS vibration · m/s²" loading={loadingTelemetry}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={telemetry} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="vib" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} m/s²`, "Vibration"]} />
              <Area type="monotone" dataKey="vibration" stroke="var(--primary)" strokeWidth={2} fill="url(#vib)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Health Score Trend" subtitle="Device health index derived from telemetry" loading={loadingTelemetry}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetry} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" {...axisProps} />
              <YAxis {...axisProps} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="temperature"
                name="Temp (proxy for health)"
                stroke="var(--success)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Combined Overlay" subtitle="Temperature & vibration correlation" loading={loadingTelemetry}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetry} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="temperature" name="Temperature °C" stroke="var(--destructive)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="vibration" name="Vibration m/s²" stroke="var(--primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Fleet device health bar chart */}
      {devices.length > 0 && (
        <div className="mt-4">
          <ChartCard title="Fleet Device Health" subtitle="Current health index across all registered devices" loading={loadingDevices}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={devices.map((d) => ({ name: d.id, health: d.health, status: d.status }))}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, "Health"]} />
                <Bar
                  dataKey="health"
                  radius={[4, 4, 0, 0]}
                  fill="var(--primary)"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </PageShell>
  );
}
