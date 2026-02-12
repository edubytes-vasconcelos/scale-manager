import { useAuth } from "@/providers/AuthProvider";
import { useVolunteerProfile } from "@/hooks/use-data";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Link, useLocation } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  Church,
  Calendar,
  UsersRound,
  LogOut,
  Menu,
  X,
  ClipboardList,
  ChevronRight,
  Home,
  Settings,
  Activity,
  Bell,
  Sun,
  Moon,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isPWAInstalled, showInstallPrompt } from "@/lib/pwa";

/* =========================
   TYPES
========================= */

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

/* =========================
   NAV ITEMS (ROLE BASED)
========================= */

const navItems: {
  path: string;
  label: string;
  icon: any;
  roles?: Role[];
  requiresPreachingPermission?: boolean;
  breadcrumb?: string[];
}[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/schedules", label: "Escalas", icon: ClipboardList },

  {
    path: "/admin/volunteers",
    label: "Voluntários",
    icon: Users,
    roles: ["admin", "leader"],
    breadcrumb: ["Admin", "Voluntários"],
  },
  {
    path: "/admin/ministries",
    label: "Ministérios",
    icon: Church,
    roles: ["admin"],
    breadcrumb: ["Admin", "Ministérios"],
  },
  {
    path: "/admin/event-types",
    label: "Tipos de Evento",
    icon: Calendar,
    roles: ["admin"],
    requiresPreachingPermission: true,
    breadcrumb: ["Admin", "Tipos de Evento"],
  },
  {
    path: "/admin/church-settings",
    label: "Igreja",
    icon: Settings,
    roles: ["admin", "leader"],
    breadcrumb: ["Admin", "Igreja"],
  },
  {
    path: "/admin/access-audit",
    label: "Acessos",
    icon: Activity,
    roles: ["admin"],
    breadcrumb: ["Admin", "Acessos"],
  },
  {
    path: "/admin/teams",
    label: "Equipes",
    icon: UsersRound,
    roles: ["admin", "leader"],
    breadcrumb: ["Admin", "Equipes"],
  },
];

/* =========================
   BREADCRUMBS
========================= */

function Breadcrumbs({ location }: { location: string }) {
  const currentNav = navItems.find((item) => item.path === location);
  if (!currentNav?.breadcrumb) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-6 py-3 bg-card border-b border-border">
      <Link href="/">
        <span className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
          <Home className="w-4 h-4" />
        </span>
      </Link>

      {currentNav.breadcrumb.map((crumb, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5" />
          <span
            className={
              idx === currentNav.breadcrumb!.length - 1
                ? "text-foreground font-medium"
                : ""
            }
          >
            {crumb}
          </span>
        </span>
      ))}
    </div>
  );
}

function getInitials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/* =========================
   LAYOUT
========================= */

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signOut, syncingProfile } = useAuth();
  const { data: profile } = useVolunteerProfile();
  const push = usePushNotifications();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const handleSignOut = async () => {
    await signOut();
    setLocation("/login");
  };

  useEffect(() => {
    if (typeof window === "undefined" || isPWAInstalled()) return;

    const handleInstallable = () => {
      setCanInstall(true);
    };

    window.addEventListener("pwa-installable", handleInstallable);
    return () => window.removeEventListener("pwa-installable", handleInstallable);
  }, []);

  const handleInstallClick = async () => {
    const installed = await showInstallPrompt();
    if (installed) setCanInstall(false);
  };

  const userRole = normalizeRole(profile?.accessLevel);
  const canManagePreachingSchedule = profile?.canManagePreachingSchedule ?? false;

  /**
   * Filtro DEFENSIVO:
   * - Enquanto profile carrega → mostra menu
   * - Quando profile chega → filtra por role
   */
  const filteredNav = navItems.filter((item) => {
    if (!item.roles && !item.requiresPreachingPermission) return true;
    if (!userRole) return true;
    if (item.requiresPreachingPermission && canManagePreachingSchedule) return true;
    if (item.roles && item.roles.includes(userRole)) return true;
    return false;
  });

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        {/* MOBILE HEADER */}
        <header className="lg:hidden bg-card border-b border-border sticky top-0 z-40 shadow-sm">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
              <img
                src="/brand/logo-192.png"
                alt="Logo – Gestor IASD"
                className="h-7 w-7"
                draggable={false}
              />
              <span className="font-display font-bold text-lg">
                Gestor IASD
              </span>
              {syncingProfile && (
                <span className="text-[11px] text-muted-foreground">Sincronizando...</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canInstall && (
                <Button size="sm" variant="outline" onClick={handleInstallClick}>
                  <Download className="w-4 h-4 mr-2" />
                  Instalar
                </Button>
              )}
              {push.pushSupported && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label="Notificações">
                      <Bell className={`w-5 h-5 ${push.pushEnabled ? "text-primary" : ""}`} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 p-3 !bg-background !text-foreground border-border shadow-xl !opacity-100 backdrop-blur-none"
                    align="end"
                  >
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold">Alertas</p>
                        <p className="text-xs text-muted-foreground">
                          Receba avisos quando novas escalas forem criadas.
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {push.pushPermission === "denied"
                          ? "Permissão bloqueada no navegador."
                          : push.pushEnabled
                            ? "Notificações ativadas neste dispositivo."
                            : "Notificações desativadas neste dispositivo."}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={push.handleTestPush}
                          disabled={!push.pushEnabled}
                        >
                          Testar alerta
                        </Button>
                        {push.pushEnabled ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={push.handleDisablePush}
                            disabled={push.pushLoading}
                          >
                            {push.pushLoading && (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Desativar alertas
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={push.handleEnablePush}
                            disabled={push.pushLoading || push.pushPermission === "denied"}
                          >
                            {push.pushLoading && (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Ativar alertas
                          </Button>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setDarkMode((prev) => !prev)}
                aria-label={darkMode ? "Modo claro" : "Modo escuro"}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleSignOut} aria-label="Sair">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* MOBILE OVERLAY */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* MOBILE MENU */}
        <nav
          className={`lg:hidden fixed left-0 top-14 bottom-0 w-64 bg-card border-r border-border z-30 transform transition-transform ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 space-y-1">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex">
          {/* DESKTOP SIDEBAR */}
          <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border min-h-screen sticky top-0">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src="/brand/logo-192.png"
                      alt="Logo – Gestor IASD"
                      className="h-7 w-7"
                      draggable={false}
                    />
                    <span className="font-display font-bold text-lg block">
                      Gestor IASD
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {profile?.organization?.name || "Igreja"}
                  </span>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-3 space-y-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <button
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-[22px] h-[22px]" />
                      {item.label}
                    </button>
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-border">
              <div className="px-3 py-2 mb-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile?.accessLevel || "voluntário"}
                </p>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </aside>

          {/* MAIN */}
          <main className="flex-1 min-h-screen flex flex-col">
            <header className="hidden lg:flex items-center justify-end px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-3">
                {syncingProfile && (
                  <span className="text-xs text-muted-foreground">Sincronizando...</span>
                )}
                {canInstall && (
                  <Button size="sm" variant="outline" onClick={handleInstallClick}>
                    <Download className="w-4 h-4 mr-2" />
                    Instalar app
                  </Button>
                )}
                {push.pushSupported && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label="Notificações">
                        <Bell className={`w-4 h-4 ${push.pushEnabled ? "text-primary" : ""}`} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-80 p-3 !bg-background !text-foreground border-border shadow-xl !opacity-100 backdrop-blur-none"
                      align="end"
                    >
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold">Alertas</p>
                          <p className="text-xs text-muted-foreground">
                            Receba avisos quando novas escalas forem criadas.
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {push.pushPermission === "denied"
                            ? "Permissão bloqueada no navegador."
                            : push.pushEnabled
                              ? "Notificações ativadas neste dispositivo."
                              : "Notificações desativadas neste dispositivo."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={push.handleTestPush}
                            disabled={!push.pushEnabled}
                          >
                            Testar alerta
                          </Button>
                          {push.pushEnabled ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={push.handleDisablePush}
                              disabled={push.pushLoading}
                            >
                              {push.pushLoading && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              )}
                              Desativar alertas
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={push.handleEnablePush}
                              disabled={push.pushLoading || push.pushPermission === "denied"}
                            >
                              {push.pushLoading && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              )}
                              Ativar alertas
                            </Button>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDarkMode((prev) => !prev)}
                  aria-label={darkMode ? "Modo claro" : "Modo escuro"}
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {getInitials(profile?.name)}
                </div>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </header>
            <Breadcrumbs location={location} />
            <div className="flex-1">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
