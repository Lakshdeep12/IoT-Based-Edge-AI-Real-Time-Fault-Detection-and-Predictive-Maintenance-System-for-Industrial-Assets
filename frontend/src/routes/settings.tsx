import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Predictive Maintenance Hub" }] }),
  component: SettingsPage,
});

const sections = [
  {
    title: "Workspace",
    items: [
      { label: "Organization name", value: "Acme Industrial Group" },
      { label: "Default plant", value: "Plant A — Houston, TX" },
      { label: "Time zone", value: "(UTC-06:00) Central Time" },
    ],
  },
  {
    title: "Alerting",
    items: [
      { label: "Critical alert channel", value: "PagerDuty · ops-rotation" },
      { label: "Email digest", value: "Daily at 07:00 local" },
      { label: "SMS escalation", value: "After 5 minutes unacknowledged" },
    ],
  },
  {
    title: "Model Configuration",
    items: [
      { label: "Active model version", value: "PredictiveCore v4.2" },
      { label: "Confidence threshold", value: "75%" },
      { label: "Retraining cadence", value: "Every 14 days" },
    ],
  },
];

function SettingsPage() {
  return (
    <PageShell title="Settings" description="Manage workspace, alerting and AI model preferences." breadcrumb={["Settings"]}>
      <div className="space-y-4 max-w-3xl">
        {sections.map((s) => (
          <div key={s.title} className="rounded-xl border border-border bg-card">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
            </div>
            <dl className="divide-y divide-border">
              {s.items.map((it) => (
                <div key={it.label} className="px-5 py-3.5 flex items-center justify-between">
                  <dt className="text-sm text-muted-foreground">{it.label}</dt>
                  <dd className="text-sm font-medium text-foreground flex items-center gap-3">
                    {it.value}
                    <button className="text-xs text-primary hover:underline">Edit</button>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
