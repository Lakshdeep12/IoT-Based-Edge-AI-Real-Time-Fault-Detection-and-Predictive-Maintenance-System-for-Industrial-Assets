import { Bell, Search, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../hooks/use-auth";

export function AppTopbar() {
  const [now, setNow] = useState(new Date());
  const [showProfile, setShowProfile] = useState(false);
  const { user, logout } = useAuth();
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-card/90 backdrop-blur px-6">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search devices, alerts, reports…"
            className="w-full h-9 rounded-md border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
          />
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent/50 text-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
        <span className="font-medium text-foreground">System Online</span>
        <span className="text-muted-foreground">· Live monitoring active</span>
      </div>

      <div className="hidden md:flex flex-col items-end text-right leading-tight">
        <div className="text-[13px] font-medium text-foreground tabular-nums">
          {now.toLocaleTimeString("en-US", { hour12: false })}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>

      <button className="relative h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-accent transition">
        <Bell className="h-4 w-4 text-foreground" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
      </button>

      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center gap-2.5 pl-3 border-l border-border hover:opacity-80 transition"
        >
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-primary-foreground text-sm font-semibold">
            {initials}
          </div>
          <div className="hidden md:block leading-tight text-left">
            <div className="text-[13px] font-medium text-foreground">{user?.name || "Operator"}</div>
            <div className="text-[11px] text-muted-foreground capitalize">{user?.role || "operator"}</div>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showProfile ? "rotate-180" : ""}`} />
        </button>

        {showProfile && (
          <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-sm font-medium text-foreground truncate">{user?.name || "Operator"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
