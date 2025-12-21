import { useAuth } from "@/providers/AuthProvider";
import { useVolunteerProfile } from "@/hooks/use-data";
import { Link, useLocation } from "wouter";
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
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/schedules", label: "Escalas", icon: ClipboardList },
  { path: "/admin/volunteers", label: "Voluntários", icon: Users, adminOnly: true, breadcrumb: ["Admin", "Voluntários"] },
  { path: "/admin/ministries", label: "Ministérios", icon: Church, adminOnly: true, breadcrumb: ["Admin", "Ministérios"] },
  { path: "/admin/event-types", label: "Tipos de Evento", icon: Calendar, adminOnly: true, breadcrumb: ["Admin", "Tipos de Evento"] },
  { path: "/admin/teams", label: "Equipes", icon: UsersRound, adminOnly: true, breadcrumb: ["Admin", "Equipes"] },
];

function Breadcrumbs({ location }: { location: string }) {
  const currentNav = navItems.find(item => item.path === location);
  if (!currentNav?.breadcrumb) return null;
  
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-6 py-3 bg-white border-b">
      <Link href="/">
        <span className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
          <Home className="w-4 h-4" />
        </span>
      </Link>
      {currentNav.breadcrumb.map((crumb, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5" />
          <span className={idx === currentNav.breadcrumb!.length - 1 ? "text-foreground font-medium" : ""}>
            {crumb}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { data: profile } = useVolunteerProfile();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setLocation("/login");
  };

  const isAdmin = profile?.accessLevel === "admin" || profile?.accessLevel === "leader";
  
  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <span className="font-display font-bold text-lg">Gestor IASD</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSignOut}
            data-testid="button-logout-mobile"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <nav 
        className={`lg:hidden fixed left-0 top-14 bottom-0 w-64 bg-white border-r border-border z-30 transform transition-transform ${
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
                      : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                  }`}
                  data-testid={`nav-mobile-${item.path.replace(/\//g, "-")}`}
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
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-border min-h-screen sticky top-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-bold text-lg block">Gestor IASD</span>
                <span className="text-xs text-muted-foreground">{profile?.organization?.name || "Igreja"}</span>
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
                        : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                    }`}
                    data-testid={`nav-${item.path.replace(/\//g, "-")}`}
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
              <p className="text-sm font-medium text-foreground truncate">{profile?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.accessLevel || "voluntário"}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen flex flex-col">
          <Breadcrumbs location={location} />
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
