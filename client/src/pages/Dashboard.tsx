import { useVolunteerProfile, useServices, useMySchedules, useUpdateAssignmentStatus } from "@/hooks/use-data";
import { ServiceCard } from "@/components/ServiceCard";
import { CalendarDays, User, Building2, ClipboardCheck, Check, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";

export default function Dashboard() {
  const { toast } = useToast();
  const { data: volunteer, isLoading: loadingProfile } = useVolunteerProfile();
  const { data: services, isLoading: loadingServices } = useServices(volunteer?.organizationId);
  const { data: mySchedules, isLoading: loadingMySchedules } = useMySchedules(volunteer?.id, volunteer?.organizationId);
  const updateStatus = useUpdateAssignmentStatus();

  const firstName = volunteer?.name?.split(" ")[0] || "Voluntário";
  
  const getMyRole = (service: any) => {
    if (!service.assignments || !volunteer?.id) return null;
    const assignment = service.assignments.find((a: any) => a.volunteerId === volunteer.id);
    return assignment?.role || null;
  };
  
  const getMyStatus = (service: any) => {
    if (!service.assignments || !volunteer?.id) return null;
    const assignment = service.assignments.find((a: any) => a.volunteerId === volunteer.id);
    return assignment?.status || null;
  };
  
  const handleConfirm = async (serviceId: string, status: "confirmed" | "declined") => {
    if (!volunteer?.id) return;
    
    try {
      await updateStatus.mutateAsync({ 
        serviceId, 
        volunteerId: volunteer.id, 
        status 
      });
      toast({
        title: status === "confirmed" ? "Presença confirmada!" : "Presença recusada",
        description: status === "confirmed" 
          ? "Você confirmou sua participação neste evento."
          : "Você recusou participar deste evento.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar sua confirmação.",
        variant: "destructive",
      });
    }
  };
  
  const getStatusBadge = (service: any) => {
    if (!service.assignments || !volunteer?.id) return null;
    const assignment = service.assignments.find((a: any) => a.volunteerId === volunteer.id);
    if (!assignment) return null;
    
    switch (assignment.status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-200">Confirmado</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-200">Pendente</Badge>;
      case 'declined':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-700 border-red-200">Recusado</Badge>;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
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

        {/* My Schedules Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Minhas Escalas
              <span className="text-xs font-normal text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                {mySchedules?.length || 0}
              </span>
            </h2>
          </div>

          {loadingMySchedules ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : mySchedules && mySchedules.length > 0 ? (
            <div className="space-y-3">
              {mySchedules.map((schedule) => (
                <div 
                  key={schedule.id} 
                  className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  data-testid={`card-my-schedule-${schedule.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center min-w-[50px] py-2 px-3 bg-primary/5 rounded-lg text-center">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {format(new Date(schedule.date), "MMM", { locale: ptBR })}
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {format(new Date(schedule.date), "dd")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(schedule.date), "EEE", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold text-foreground">{schedule.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {format(new Date(schedule.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </p>
                      {getMyRole(schedule) && (
                        <p className="text-sm font-medium text-primary">
                          Função: {getMyRole(schedule)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:self-center flex-wrap">
                    {getMyStatus(schedule) === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleConfirm(schedule.id, "confirmed")}
                          disabled={updateStatus.isPending}
                          data-testid={`button-confirm-${schedule.id}`}
                        >
                          {updateStatus.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Confirmar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleConfirm(schedule.id, "declined")}
                          disabled={updateStatus.isPending}
                          data-testid={`button-decline-${schedule.id}`}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Recusar
                        </Button>
                      </>
                    ) : (
                      getStatusBadge(schedule)
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <ClipboardCheck className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-base font-medium text-foreground">Você não está escalado</p>
              <p className="text-muted-foreground text-sm">Não há compromissos agendados para você.</p>
            </div>
          )}
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
      </div>
    </AppLayout>
  );
}
