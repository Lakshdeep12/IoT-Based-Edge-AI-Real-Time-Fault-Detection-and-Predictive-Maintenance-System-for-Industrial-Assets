import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode, useState } from "react";

import { AppSidebar } from "../components/app-sidebar";
import { AppTopbar } from "../components/app-topbar";
import { AuthProvider, useAuth } from "../hooks/use-auth";
import { Lock, Mail, User as UserIcon, AlertCircle, RefreshCw } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function MainLayout() {
  const { authenticated, loading, login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Initializing secure terminal…</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSubmitting(true);
      try {
        if (isLogin) {
          await login(email, password);
        } else {
          await register(email, password, name);
          await login(email, password);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || "Authentication failed. Check credentials.");
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isLogin ? "Sign in to Hub" : "Create Operator Account"}
            </h1>
            <p className="text-xs text-muted-foreground mt-2 max-w-[300px]">
              {isLogin
                ? "Enter your credentials to access the Predictive Maintenance Hub."
                : "Register a secure maintenance operator profile."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe"
                    className="h-10 w-full pl-9 pr-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@company.com"
                  className="h-10 w-full pl-9 pr-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="h-10 w-full pl-9 pr-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="h-11 w-full mt-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : isLogin ? "Sign In" : "Create Account & Sign In"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="text-xs font-semibold text-primary hover:underline">
              {isLogin ? "No account? Register here" : "Already registered? Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <AppTopbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
