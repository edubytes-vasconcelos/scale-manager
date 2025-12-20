import { useAuth } from "@/providers/AuthProvider";
import { useVolunteerProfile, useServices } from "@/hooks/use-data";
import { ServiceCard } from "@/components/ServiceCard";
import { LogOut, LayoutGrid, CalendarDays, User, Building2 } from "lucide-react";

export default function Dashboard() {
  const { signOut } = useAuth();
  const { data: volunteer, isLoading: loadingProfile } = useVolunteerProfile();
  const { data: services, isLoading: loadingServices } = useServices();

  const firstName = volunteer?.name?.split(" ")[0] || "Voluntário";

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg hidden sm:block">
              Gestor IASD Bosque
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-blue-600 text-white shadow-xl shadow-primary/20 p-8 md:p-10">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-xs font-semibold">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Gestão de Escalas</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight">
                Olá, {loadingProfile ? "..." : firstName}
              </h1>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-white/90 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 opacity-75" />
                  {loadingProfile ? "Carregando..." : (volunteer?.name || "Perfil não encontrado")}
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 opacity-75" />
                  {loadingProfile ? "Carregando..." : (volunteer?.organization?.name || "Sem organização")}
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 rounded-full bg-black/10 blur-3xl pointer-events-none" />
        </section>

        {/* Services List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              Próximos Cultos e Eventos
              <span className="text-xs font-normal text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                {services?.length || 0}
              </span>
            </h2>
          </div>

          {loadingServices ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : services && services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <CalendarDays className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-lg font-medium text-foreground">Nenhum evento encontrado</p>
              <p className="text-muted-foreground text-sm">Não há escalas agendadas no momento.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
