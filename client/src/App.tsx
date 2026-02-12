import { lazy, Suspense } from "react";
import InstallPWA from "@/components/InstallPWA";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { Loader2, ShieldAlert } from "lucide-react";
import AppLayout from "@/components/AppLayout";

import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";

const NotFound = lazy(() => import("@/pages/not-found"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Volunteers = lazy(() => import("@/pages/admin/Volunteers"));
const Ministries = lazy(() => import("@/pages/admin/Ministries"));
const EventTypes = lazy(() => import("@/pages/admin/EventTypes"));
const Teams = lazy(() => import("@/pages/admin/Teams"));
const Schedules = lazy(() => import("@/pages/admin/Schedules"));
const ChurchSettings = lazy(() => import("@/pages/admin/ChurchSettings"));
const AccessAudit = lazy(() => import("@/pages/admin/AccessAudit"));

function AppShellSkeleton({ message }: { message: string }) {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </AppLayout>
  );
}

type Role = "admin" | "leader" | "volunteer";

function normalizeRole(raw?: string | null): Role | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "leader" || normalized === "lider" || normalized === "líder") {
    return "leader";
  }
  if (normalized === "volunteer" || normalized === "voluntario" || normalized === "voluntário") {
    return "volunteer";
  }
  return null;
}

function ProtectedRoute({
  component: Component,
  allowedRoles,
}: {
  component: React.ComponentType;
  allowedRoles?: Role[];
}) {
  const { session, volunteer, loading, authReady } = useAuth();

  if (loading || !authReady) {
    if (session) {
      return <AppShellSkeleton message="Carregando sistema..." />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Carregando sistema...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Redirect to="/login" />;
  }

  if (!volunteer) {
    return <Onboarding />;
  }

  if (!volunteer.organizationId) {
    return <Onboarding />;
  }

  const currentRole = normalizeRole(volunteer.accessLevel);
  if (allowedRoles && (!currentRole || !allowedRoles.includes(currentRole))) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
          <ShieldAlert className="w-12 h-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Você não tem permissão para acessar esta página. Entre em contato com um administrador da sua igreja.
          </p>
          <Redirect to="/" />
        </div>
      </AppLayout>
    );
  }

  return <Component />;
}

/**
 * 🧱 Wrapper padrão para páginas administrativas
 */
function AdminPageWrapper({
  Component,
}: {
  Component: React.ComponentType;
}) {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <Component />
      </div>
    </AppLayout>
  );
}

/**
 * 🌐 Rotas da aplicação
 */
function Router() {
  return (
    <Switch>
      {/* Públicas */}
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* Dashboard */}
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>

      {/* Admin */}
      <Route path="/schedules">
        <ProtectedRoute
          component={() => <AdminPageWrapper Component={Schedules} />}
        />
      </Route>

      <Route path="/admin/volunteers">
        <ProtectedRoute
          allowedRoles={["admin", "leader"]}
          component={() => <AdminPageWrapper Component={Volunteers} />}
        />
      </Route>

      <Route path="/admin/ministries">
        <ProtectedRoute
          allowedRoles={["admin"]}
          component={() => <AdminPageWrapper Component={Ministries} />}
        />
      </Route>

      <Route path="/admin/event-types">
        <ProtectedRoute
          allowedRoles={["admin"]}
          component={() => <AdminPageWrapper Component={EventTypes} />}
        />
      </Route>

      <Route path="/admin/church-settings">
        <ProtectedRoute
          allowedRoles={["admin", "leader"]}
          component={() => <AdminPageWrapper Component={ChurchSettings} />}
        />
      </Route>

      <Route path="/admin/teams">
        <ProtectedRoute
          allowedRoles={["admin", "leader"]}
          component={() => <AdminPageWrapper Component={Teams} />}
        />
      </Route>

      <Route path="/admin/access-audit">
        <ProtectedRoute
          allowedRoles={["admin"]}
          component={() => <AdminPageWrapper Component={AccessAudit} />}
        />
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * 🚀 App root
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary>
          <Suspense fallback={<AppShellSkeleton message="Carregando..." />}>
            <Router />
          </Suspense>
        </ErrorBoundary>
        <Toaster />
        <InstallPWA />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
