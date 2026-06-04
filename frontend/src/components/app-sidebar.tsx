import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, HardDrive, Activity, BarChart3, Brain,
  Wrench, Bell, FileText, Settings, UserCircle, Cpu,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard Overview", icon: LayoutDashboard },
  { to: "/devices", label: "Devices", icon: HardDrive },
  { to: "/monitoring", label: "Live Monitoring", icon: Activity },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/predictions", label: "Predictions", icon: Brain },
  { to: "/maintenance", label: "Maintenance Center", icon: Wrench },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "User Profile", icon: UserCircle },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Cpu className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-foreground">Predictive</div>
          <div className="text-[13px] font-semibold tracking-tight text-foreground -mt-0.5">Maintenance Hub</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </div>
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${active ? "text-primary" : ""}`} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-accent/60 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            All systems operational
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Edge gateway · 99.98% uptime</div>
        </div>
      </div>
    </aside>
  );
}
