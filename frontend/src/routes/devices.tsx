import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deviceService } from "@/services/api";
import { useState } from "react";
import { HardDrive, Plus, Trash2, Edit3, CheckCircle2, AlertTriangle, ShieldAlert, X, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/devices")({
  head: () => ({ meta: [{ title: "Devices · Predictive Maintenance Hub" }] }),
  component: DevicesPage,
});

const statusConfig = {
  healthy: { label: "Healthy", icon: CheckCircle2, badge: "bg-green-100 text-green-700" },
  warning: { label: "Warning", icon: AlertTriangle, badge: "bg-amber-100 text-amber-700" },
  critical: { label: "Critical", icon: ShieldAlert, badge: "bg-red-100 text-red-700" },
};

function AddDeviceModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("Industrial Motor");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const TYPES = ["Centrifugal Pump", "Industrial Motor", "Compressor", "Turbine", "Gearbox", "Conveyor", "HVAC Unit", "Generator"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await deviceService.create(id, name, location, type);
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create device.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Register New Asset</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        {error && <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive font-medium">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Device ID", value: id, setter: setId, placeholder: "DV-1099", required: true },
            { label: "Asset Name", value: name, setter: setName, placeholder: "Centrifugal Pump #9", required: true },
            { label: "Location", value: location, setter: setLocation, placeholder: "Plant A — Line 2", required: true },
          ].map(({ label, value, setter, placeholder, required }) => (
            <div key={label} className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
              <input required={required} value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Asset Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-9 rounded-lg border border-border text-sm font-medium hover:bg-accent">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DevicesPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const { data: devices = [], isLoading, isError } = useQuery({
    queryKey: ["devices"],
    queryFn: deviceService.getAll,
    refetchInterval: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deviceService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });

  const filtered = devices.filter((d: any) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.location.toLowerCase().includes(search.toLowerCase()) ||
    d.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell title="Device Management" description="Register, monitor and manage all industrial assets." breadcrumb={["Devices"]}
      actions={
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Asset
        </button>
      }>
      {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} onAdded={() => qc.invalidateQueries({ queryKey: ["devices"] })} />}

      <div className="mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, location…"
          className="h-9 w-full max-w-sm rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : isError ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Failed to load devices. Is the backend running?</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-5 py-3">Asset</th>
                <th className="text-left font-semibold px-3 py-3 hidden md:table-cell">Location</th>
                <th className="text-left font-semibold px-3 py-3 hidden lg:table-cell">Type</th>
                <th className="text-right font-semibold px-3 py-3">Health</th>
                <th className="text-right font-semibold px-3 py-3">RUL</th>
                <th className="text-right font-semibold px-3 py-3">Status</th>
                <th className="text-right font-semibold px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No devices match your search.</td></tr>
              ) : filtered.map((d: any) => {
                const cfg = statusConfig[d.status as keyof typeof statusConfig] || statusConfig.healthy;
                const Icon = cfg.icon;
                return (
                  <tr key={d.id} className="border-t border-border hover:bg-accent/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <HardDrive className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{d.name}</div>
                          <div className="text-[11px] text-muted-foreground">{d.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-muted-foreground hidden md:table-cell">{d.location}</td>
                    <td className="px-3 py-3.5 text-muted-foreground hidden lg:table-cell">{d.type}</td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${d.health >= 80 ? "bg-green-500" : d.health >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${d.health}%` }} />
                        </div>
                        <span className="tabular-nums font-medium text-xs">{d.health}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-sm">{d.rul}d</td>
                    <td className="px-3 py-3.5 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.badge}`}>
                        <Icon className="h-3 w-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => { if (confirm(`Delete ${d.name}?`)) deleteMut.mutate(d.id); }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
