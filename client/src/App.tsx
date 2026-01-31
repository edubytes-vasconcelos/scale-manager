import InstallPWA from "@/components/InstallPWA";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";

import Volunteers from "@/pages/admin/Volunteers";
import Ministries from "@/pages/admin/Ministries";
import EventTypes from "@/pages/admin/EventTypes";
import Teams from "@/pages/admin/Teams";
import Schedules from "@/pages/admin/Schedules";
import ChurchSettings from "@/pages/admin/ChurchSettings";

import AppLayout from "@/components/AppLayout";

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

/**
 * 🔐 ProtectedRoute
 * Responsável por:
 * - Aguardar auth estar pronta
 * - Garantir sessão válida
 * - Aguardar carregamento do perfil
 * - Decidir onboarding somente após perfil existir
 */
function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { session, volunteer, loading, authReady } = useAuth();

  // 🔄 Aguarda autenticação e bootstrap do AuthProvider
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

  // 🔒 Não autenticado
  if (!session) {
    return <Redirect to="/login" />;
  }

  // 🧭 Sessão existe, mas perfil ainda não existe (auto cadastro)
  if (!volunteer) {
    return <Onboarding />;
  }

  // 🧭 Usuário autenticado, mas ainda sem organização
  if (!volunteer.organizationId) {
    return <Onboarding />;
  }

  // ✅ Tudo pronto → renderiza a página
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
          component={() => <AdminPageWrapper Component={Volunteers} />}
        />
      </Route>

      <Route path="/admin/ministries">
        <ProtectedRoute
          component={() => <AdminPageWrapper Component={Ministries} />}
        />
      </Route>

      <Route path="/admin/event-types">
        <ProtectedRoute
          component={() => <AdminPageWrapper Component={EventTypes} />}
        />
      </Route>

      <Route path="/admin/church-settings">
        <ProtectedRoute
          component={() => <AdminPageWrapper Component={ChurchSettings} />}
        />
      </Route>

      <Route path="/admin/teams">
        <ProtectedRoute
          component={() => <AdminPageWrapper Component={Teams} />}
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
        <Router />
        <Toaster />
        <InstallPWA />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
