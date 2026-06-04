import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { useQuery } from "@tanstack/react-query";
import { deviceService, telemetryService } from "@/services/api";
import { useState } from "react";
import { Thermometer, Activity, Clock, RefreshCw } from "lucide-react";
import { LineChart, Line, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const Route = createFileRoute("/monitoring")({
  head: () => ({ meta: [{ title: "Live Monitoring · Predictive Maintenance Hub" }] }),
  component: MonitoringPage,
});

function MonitoringPage() {
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  const { data: devices = [], isLoading: devLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: deviceService.getAll,
  });

  const { data: telemetry = [], isLoading: telLoading } = useQuery({
    queryKey: ["telemetry", selectedDevice],
    queryFn: () => telemetryService.getHistory(selectedDevice, 60),
    enabled: !!selectedDevice,
    refetchInterval: 10_000,
  });

  // Prepare chart data: reverse so oldest is first, format timestamp
  const chartData = [...telemetry].reverse().map((t: any, i: number) => ({
    idx: i + 1,
    time: new Date(t.recorded_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
    temp: parseFloat(t.temperature_c.toFixed(1)),
    vib: parseFloat(t.vibration_mps2.toFixed(3)),
    runtime: parseFloat((t.runtime || 0).toFixed(1)),
  }));

  const latest = telemetry[0] as any;

  return (
    <PageShell title="Live Sensor Monitoring" description="Real-time telemetry feed from IoT edge nodes." breadcrumb={["Monitoring"]}>
      {/* Device Selector */}
      <div className="mb-6 flex items-center gap-3">
        <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-[220px]">
          <option value="">— Select a device —</option>
          {devices.map((d: any) => (
            <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
          ))}
        </select>
        {telLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
        {selectedDevice && <span className="text-xs text-muted-foreground">Auto-refreshes every 10s</span>}
      </div>

      {!selectedDevice ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-base font-semibold text-foreground">Select a device to begin monitoring</h3>
          <p className="text-sm text-muted-foreground mt-1">Choose an asset from the dropdown above to view live telemetry.</p>
        </div>
      ) : (
        <>
          {/* Live KPI Row */}
          {latest && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Temperature", value: `${latest.temperature_c.toFixed(1)} °C`, icon: Thermometer,
                  color: latest.temperature_c > 80 ? "text-destructive" : "text-warning", bg: "bg-orange-50" },
                { label: "Vibration", value: `${latest.vibration_mps2.toFixed(3)} m/s²`, icon: Activity,
                  color: latest.vibration_mps2 > 4 ? "text-destructive" : "text-primary", bg: "bg-blue-50" },
                { label: "Runtime Hours", value: `${(latest.runtime || 0).toFixed(1)} h`, icon: Clock,
                  color: "text-muted-foreground", bg: "bg-muted/40" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="rounded-xl border border-border bg-card p-5">
                  <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">{label}</div>
                  <div className={`text-2xl font-bold tabular-nums mt-1 ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {chartData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No telemetry data yet for this device.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Temperature Chart */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Temperature Trend (°C)</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="temp" name="Temp °C" stroke="#f59e0b" strokeWidth={2} fill="url(#tempGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Vibration Chart */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Vibration Trend (m/s²)</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="vibGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="vib" name="Vibration m/s²" stroke="#3b82f6" strokeWidth={2} fill="url(#vibGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Combined Overlay */}
              <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Combined Sensor Overlay</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="temp" name="Temp °C" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="vib" name="Vibration m/s²" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
