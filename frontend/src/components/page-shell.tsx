import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, description, breadcrumb = [], actions, children }: Props) {
  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <span>Home</span>
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <span className={i === breadcrumb.length - 1 ? "text-foreground font-medium" : ""}>{b}</span>
              </span>
            ))}
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
