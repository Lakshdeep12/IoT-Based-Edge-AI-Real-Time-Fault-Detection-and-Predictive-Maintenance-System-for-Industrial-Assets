import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Mail, Phone, MapPin, Shield } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "User Profile · Predictive Maintenance Hub" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <PageShell title="User Profile" description="Your account, role and recent activity." breadcrumb={["User Profile"]}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-2xl font-semibold">LS</div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">Lakshdeep Singh</h3>
          <p className="text-sm text-muted-foreground">Senior Plant Engineer</p>
          <span className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary">
            <Shield className="h-3 w-3" /> Administrator
          </span>
          <div className="mt-6 w-full space-y-2.5 text-sm text-left">
            <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> lakshdeeps021@gmail.com</div>
            <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> Rajasthan, India</div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
          <ul className="mt-4 space-y-4">
            {[
              { t: "Acknowledged critical alert on Centrifugal Pump #3", d: "2 minutes ago" },
              { t: "Generated Monthly Health Report", d: "3 hours ago" },
              { t: "Updated confidence threshold to 75%", d: "Yesterday" },
              { t: "Created work order WO-2841 for Turbine #1", d: "2 days ago" },
              { t: "Reviewed predictive forecast for Plant B", d: "3 days ago" },
            ].map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <div>
                  <div className="text-sm text-foreground">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
