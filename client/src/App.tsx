import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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
import AppLayout from "@/components/AppLayout";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { session, volunteer, loading, authReady } = useAuth();

  if (loading || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Redirect to="/login" />;
  }

  if (!volunteer || !volunteer.organizationId) {
    return <Onboarding />;
  }

  return <Component />;
}

function AdminPageWrapper({ Component }: { Component: React.ComponentType }) {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <Component />
      </div>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/schedules">
        <ProtectedRoute component={() => <AdminPageWrapper Component={Schedules} />} />
      </Route>
      <Route path="/admin/volunteers">
        <ProtectedRoute component={() => <AdminPageWrapper Component={Volunteers} />} />
      </Route>
      <Route path="/admin/ministries">
        <ProtectedRoute component={() => <AdminPageWrapper Component={Ministries} />} />
      </Route>
      <Route path="/admin/event-types">
        <ProtectedRoute component={() => <AdminPageWrapper Component={EventTypes} />} />
      </Route>
      <Route path="/admin/teams">
        <ProtectedRoute component={() => <AdminPageWrapper Component={Teams} />} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
