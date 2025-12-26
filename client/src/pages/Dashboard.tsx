import { useState, useMemo } from "react";
import { useVolunteerProfile, useServices, useMySchedules, useUpdateAssignmentStatus } from "@/hooks/use-data";
import { ServiceCard } from "@/components/ServiceCard";
import { CalendarDays, User, Building2, ClipboardCheck, Check, X, Loader2, Clock, AlertCircle, Calendar, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";

export default function Dashboard() {
  const { toast } = useToast();
  const { data: volunteer, isLoading: loadingProfile } = useVolunteerProfile();
  const { data: services, isLoading: loadingServices } = useServices(volunteer?.organizationId);
  const { data: mySchedules, isLoading: loadingMySchedules } = useMySchedules(volunteer?.id, volunteer?.organizationId);
  const updateStatus = useUpdateAssignmentStatus();
  
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineNote, setDeclineNote] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  const firstName = volunteer?.name?.split(" ")[0] || "Voluntário";
  
  const pendingSchedules = useMemo(() => {
    if (!mySchedules || !volunteer?.id) return [];
    return mySchedules.filter(schedule => {
      const assignment = schedule.assignments?.find((a: any) => a.volunteerId === volunteer.id);
      return assignment?.status === "pending";
    });
  }, [mySchedules, volunteer?.id]);
  
  const confirmedSchedules = useMemo(() => {
    if (!mySchedules || !volunteer?.id) return [];
    return mySchedules.filter(schedule => {
      const assignment = schedule.assignments?.find((a: any) => a.volunteerId === volunteer.id);
      return assignment?.status === "confirmed";
    });
  }, [mySchedules, volunteer?.id]);
  
  const nextSchedule = useMemo(() => {
    if (!mySchedules || mySchedules.length === 0) return null;
    const today = new Date();
    const futureSchedules = mySchedules
      .filter(s => isAfter(new Date(s.date), addDays(today, -1)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return futureSchedules[0] || null;
  }, [mySchedules]);
  
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
        organizationId: volunteer.organizationId!,
        status 
      });
      toast({
        title: status === "confirmed" ? "Presença confirmada!" : "Presença recusada",
        description: status === "confirmed" 
          ? "Você confirmou sua participação neste evento."
          : "Você recusou participar deste evento.",
      });
      setDeclineDialogOpen(false);
      setDeclineNote("");
      setSelectedScheduleId(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar sua confirmação.",
        variant: "destructive",
      });
    }
  };
  
  const openDeclineDialog = (scheduleId: string) => {
    setSelectedScheduleId(scheduleId);
    setDeclineNote("");
    setDeclineDialogOpen(true);
  };
  
  const handleDeclineWithNote = async () => {
    if (!selectedScheduleId || !volunteer?.id) return;
    
    try {
      await updateStatus.mutateAsync({ 
        serviceId: selectedScheduleId, 
        volunteerId: volunteer.id, 
        organizationId: volunteer.organizationId!,
        status: "declined",
        note: declineNote.trim() || undefined
      });
      toast({
        title: "Presença recusada",
        description: "Você recusou participar deste evento.",
      });
      setDeclineDialogOpen(false);
      setDeclineNote("");
      setSelectedScheduleId(null);
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
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-300" aria-label="Status: Confirmado">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            Confirmado
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300" aria-label="Status: Pendente">
            <Clock className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            Pendente
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300" aria-label="Status: Recusado">
            <X className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            Recusado
          </Badge>
        );
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

        {/* Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-amber-500" data-testid="card-pending-count">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingSchedules.length}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500" data-testid="card-confirmed-count">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{confirmedSchedules.length}</p>
                <p className="text-sm text-muted-foreground">Confirmadas</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500" data-testid="card-total-count">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{mySchedules?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Escalas</p>
              </div>
            </CardContent>
          </Card>
          
          {nextSchedule && (
            <Card className="border-l-4 border-l-primary bg-primary/5" data-testid="card-next-schedule">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-primary uppercase mb-1">Próximo Compromisso</p>
                <p className="font-semibold text-foreground truncate">{nextSchedule.title}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(nextSchedule.date), "d 'de' MMM", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Notification Banner for Pending */}
        {pendingSchedules.length > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4" data-testid="banner-pending">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                Você tem {pendingSchedules.length} escala{pendingSchedules.length > 1 ? 's' : ''} aguardando confirmação
              </p>
              <p className="text-sm text-amber-700">
                Confirme ou recuse sua participação para ajudar os líderes a organizar os eventos.
              </p>
            </div>
          </section>
        )}

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
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:self-center flex-wrap">
                    {getMyStatus(schedule) === "pending" ? (
                      <>
                        <Button
                          variant="default"
                          className="bg-green-600 hover:bg-green-700 min-h-[44px] px-6"
                          onClick={() => handleConfirm(schedule.id, "confirmed")}
                          disabled={updateStatus.isPending}
                          data-testid={`button-confirm-${schedule.id}`}
                        >
                          {updateStatus.isPending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-5 h-5 mr-2" />
                              Confirmar Presença
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50 min-h-[44px] px-6"
                          onClick={() => openDeclineDialog(schedule.id)}
                          disabled={updateStatus.isPending}
                          data-testid={`button-decline-${schedule.id}`}
                        >
                          <X className="w-5 h-5 mr-2" />
                          Não Poderei Ir
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
                <ServiceCard key={service.id} service={service} volunteerId={volunteer?.id} />
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

      {/* Decline Dialog with Note */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Ausência</DialogTitle>
            <DialogDescription>
              Informe ao líder o motivo pelo qual você não poderá participar deste evento.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ex: Estarei viajando nesta data... (opcional)"
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-decline-note"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeclineDialogOpen(false)}
              data-testid="button-cancel-decline"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineWithNote}
              disabled={updateStatus.isPending}
              data-testid="button-confirm-decline"
            >
              {updateStatus.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Confirmar Ausência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
