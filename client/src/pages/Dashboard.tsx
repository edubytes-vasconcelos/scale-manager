import { useState, useMemo } from "react";
import {
  useVolunteerProfile,
  useServices,
  useMySchedules,
  useUpdateAssignmentStatus,
  useEventTypes,
  useVolunteerUnavailability,
  useCreateVolunteerUnavailability,
  useDeleteVolunteerUnavailability,
} from "@/hooks/use-data";
import { ServiceCard } from "@/components/ServiceCard";
import {
  CalendarDays,
  User,
  Building2,
  ClipboardCheck,
  Check,
  X,
  Loader2,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format, isAfter, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { normalizeAssignments } from "@/lib/assignments";

export default function Dashboard() {
  const { toast } = useToast();
  const { data: volunteer, isLoading: loadingProfile } =
    useVolunteerProfile();
  const { data: services, isLoading: loadingServices } = useServices(
    volunteer?.organizationId
  );
  const { data: eventTypes } = useEventTypes(volunteer?.organizationId);
  const { data: unavailability } = useVolunteerUnavailability(volunteer?.organizationId);
  const createUnavailability = useCreateVolunteerUnavailability();
  const deleteUnavailability = useDeleteVolunteerUnavailability();
  const { data: mySchedules, isLoading: loadingMySchedules } =
    useMySchedules(volunteer?.id, volunteer?.organizationId);
  const updateStatus = useUpdateAssignmentStatus();

  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineNote, setDeclineNote] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null
  );
  const [unavailabilityStart, setUnavailabilityStart] = useState("");
  const [unavailabilityEnd, setUnavailabilityEnd] = useState("");
  const [unavailabilityReason, setUnavailabilityReason] = useState("");

  const firstName = volunteer?.name?.split(" ")[0] || "Voluntário";

  const pendingSchedules = useMemo(() => {
    if (!mySchedules || !volunteer?.id) return [];
    return mySchedules.filter((schedule) => {
      const { volunteers } = normalizeAssignments(schedule.assignments);
      const assignment = volunteers.find((a: any) => a.volunteerId === volunteer.id);
      return assignment?.status === "pending";
    });
  }, [mySchedules, volunteer?.id]);

  const confirmedSchedules = useMemo(() => {
    if (!mySchedules || !volunteer?.id) return [];
    return mySchedules.filter((schedule) => {
      const { volunteers } = normalizeAssignments(schedule.assignments);
      const assignment = volunteers.find((a: any) => a.volunteerId === volunteer.id);
      return assignment?.status === "confirmed";
    });
  }, [mySchedules, volunteer?.id]);

  const myUnavailability = useMemo(() => {
    if (!unavailability || !volunteer?.id) return [];
    return unavailability.filter((entry) => entry.volunteerId === volunteer.id);
  }, [unavailability, volunteer?.id]);

  const nextSchedule = useMemo(() => {
    if (!mySchedules || mySchedules.length === 0) return null;
    const today = new Date();
    const futureSchedules = mySchedules
      .filter((s) => isAfter(parseISO(s.date), addDays(today, -1)))
      .sort(
        (a, b) =>
          parseISO(a.date).getTime() - parseISO(b.date).getTime()
      );
    return futureSchedules[0] || null;
  }, [mySchedules]);

  const futureServices = useMemo(() => {
    if (!services) return [];
    const today = new Date();
    return services.filter((service) =>
      isAfter(parseISO(service.date), addDays(today, -1))
    );
  }, [services]);

  const getMyStatus = (service: any) => {
    if (!service.assignments || !volunteer?.id) return null;
    const { volunteers } = normalizeAssignments(service.assignments);
    const assignment = volunteers.find((a: any) => a.volunteerId === volunteer.id);
    return assignment?.status || null;
  };

  const handleConfirm = async (
    serviceId: string,
    status: "confirmed" | "declined"
  ) => {
    if (!volunteer?.id) return;

    try {
      await updateStatus.mutateAsync({
        serviceId,
        volunteerId: volunteer.id,
        organizationId: volunteer.organizationId || "",
        status,
      });
      toast({
        title:
          status === "confirmed"
            ? "Presença confirmada!"
            : "Presença recusada",
        description:
          status === "confirmed"
            ? "Sua participação foi confirmada."
            : "Você informou que não poderá participar.",
      });
      setDeclineDialogOpen(false);
      setDeclineNote("");
      setSelectedScheduleId(null);
    } catch {
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
        organizationId: volunteer.organizationId || "",
        status: "declined",
        note: declineNote.trim() || undefined,
      });
      toast({
        title: "Ausência confirmada",
        description: "O líder será avisado.",
      });
      setDeclineDialogOpen(false);
      setDeclineNote("");
      setSelectedScheduleId(null);
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar sua confirmação.",
        variant: "destructive",
      });
    }
  };

  const handleAddUnavailability = async () => {
    if (!volunteer?.organizationId || !volunteer?.id) return;
    if (!unavailabilityStart || !unavailabilityEnd) {
      toast({
        title: "Periodo obrigatorio",
        description: "Informe a data inicial e final.",
        variant: "destructive",
      });
      return;
    }

    if (unavailabilityEnd < unavailabilityStart) {
      toast({
        title: "Periodo invalido",
        description: "A data final deve ser igual ou maior que a inicial.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createUnavailability.mutateAsync({
        organizationId: volunteer.organizationId,
        volunteerId: volunteer.id,
        startDate: unavailabilityStart,
        endDate: unavailabilityEnd,
        reason: unavailabilityReason.trim() || null,
      });
      setUnavailabilityStart("");
      setUnavailabilityEnd("");
      setUnavailabilityReason("");
      toast({
        title: "Indisponibilidade registrada",
        description: "Periodo adicionado com sucesso.",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Nao foi possivel salvar sua indisponibilidade.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUnavailability = async (id: string) => {
    if (!volunteer?.organizationId) return;
    try {
      await deleteUnavailability.mutateAsync({
        id,
        organizationId: volunteer.organizationId,
      });
      toast({
        title: "Indisponibilidade removida",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Nao foi possivel remover.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (service: any) => {
    const status = getMyStatus(service);
    if (!status) return null;

    if (status === "confirmed")
      return (
        <Badge variant="success">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Confirmado
        </Badge>
      );

    if (status === "pending")
      return (
        <Badge variant="warning">
          <Clock className="w-3.5 h-3.5 mr-1" />
          Pendente
        </Badge>
      );

    if (status === "declined")
      return (
        <Badge variant="destructive">
          <X className="w-3.5 h-3.5 mr-1" />
          Recusado
        </Badge>
      );

    return null;
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-xl p-8 md:p-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
              <CalendarDays className="w-3.5 h-3.5" />
              Gestão de Escalas
            </div>

            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
              Olá, {loadingProfile ? "..." : firstName}
            </h1>

            <div className="flex flex-wrap gap-4 text-sm opacity-90">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {volunteer?.name || "—"}
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {volunteer?.organization?.name || "—"}
              </div>
            </div>
          </div>
        </section>

        {/* RESUMO */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={<Clock className="text-warning w-6 h-6" />}
            label="Pendentes"
            value={pendingSchedules.length}
            bg="bg-warning/10"
          />
          <SummaryCard
            icon={<CheckCircle2 className="text-success w-6 h-6" />}
            label="Confirmadas"
            value={confirmedSchedules.length}
            bg="bg-success/10"
          />
          <SummaryCard
            icon={<CalendarDays className="text-info w-6 h-6" />}
            label="Total"
            value={mySchedules?.length || 0}
            bg="bg-info/10"
          />
          {nextSchedule && (
            <Card className="rounded-2xl border">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-primary uppercase">
                  Próximo compromisso
                </p>
                <p className="font-semibold truncate">
                  {nextSchedule.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(nextSchedule.date), "d 'de' MMM", {
                    locale: ptBR,
                  })}
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ALERTA */}
        {pendingSchedules.length > 0 && (
          <section className="rounded-xl border border-warning/30 bg-warning/10 p-4 flex gap-3">
            <AlertCircle className="text-warning w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">
                Você tem {pendingSchedules.length} escala(s) aguardando confirmação
              </p>
              <p className="text-sm text-muted-foreground">
                Confirme ou recuse para ajudar na organização.
              </p>
            </div>
          </section>
        )}

        {/* MINHAS ESCALAS */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Minhas Escalas
          </h2>

          {loadingMySchedules ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : mySchedules && mySchedules.length > 0 ? (
            <div className="space-y-3">
              {mySchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="rounded-xl border bg-background p-4 flex flex-wrap justify-between gap-4 transition hover:shadow-sm hover:border-primary/30"
                >
                  <div>
                    <p className="font-semibold">{schedule.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(schedule.date), "EEEE, d 'de' MMMM", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2 items-center">
                    {getMyStatus(schedule) === "pending" ? (
                      <>
                        <Button
                          variant="success"
                          onClick={() =>
                            handleConfirm(schedule.id, "confirmed")
                          }
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Confirmar
                        </Button>
                        <Button
                          variant="destructive-outline"
                          onClick={() => openDeclineDialog(schedule.id)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Não irei
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
            <div className="py-12 rounded-2xl border border-dashed text-center">
              <p className="font-medium">
                Nenhuma escala atribuída ainda
              </p>
              <p className="text-sm text-muted-foreground">
                Quando houver um evento, ele aparecerá aqui.
              </p>
            </div>
          )}
        </section>

        {/* MINHA INDISPONIBILIDADE */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Minha indisponibilidade
          </h2>

          <div className="rounded-2xl border bg-background p-4 space-y-4">
            {myUnavailability.length > 0 ? (
              <div className="space-y-2">
                {myUnavailability.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">
                        {format(parseISO(String(entry.startDate)), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}{" "}
                        -{" "}
                        {format(parseISO(String(entry.endDate)), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {entry.reason?.trim() || "Sem motivo informado"}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDeleteUnavailability(entry.id)}
                      disabled={deleteUnavailability.isPending}
                      title="Remover"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma indisponibilidade registrada.
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Inicio</Label>
                <Input
                  type="date"
                  value={unavailabilityStart}
                  onChange={(e) => setUnavailabilityStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Fim</Label>
                <Input
                  type="date"
                  value={unavailabilityEnd}
                  onChange={(e) => setUnavailabilityEnd(e.target.value)}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs font-medium">Motivo</Label>
                <Input
                  placeholder="Ex: Viagem, compromisso familiar"
                  value={unavailabilityReason}
                  onChange={(e) => setUnavailabilityReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={handleAddUnavailability}
                disabled={createUnavailability.isPending}
              >
                {createUnavailability.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Adicionar indisponibilidade
              </Button>
            </div>
          </div>
        </section>

        {/* SERVIÇOS */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">
            Próximos Cultos e Eventos
          </h2>

          {loadingServices ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : futureServices.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {futureServices.map((service) => (
                (() => {
                  const eventType = eventTypes?.find(
                    (type) => type.id === service.eventTypeId
                  );
                  return (
                <ServiceCard
                  key={service.id}
                  service={service}
                  volunteerId={volunteer?.id}
                  showActions={false}
                  eventTypeName={eventType?.name}
                  eventTypeColor={eventType?.color}
                />
                  );
                })()
              ))}
            </div>
          ) : (
            <div className="py-16 rounded-3xl border border-dashed text-center">
              <p className="font-medium">
                Nenhum evento encontrado
              </p>
              <p className="text-sm text-muted-foreground">
                As próximas escalas aparecerão aqui.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* DIALOG */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar ausência</DialogTitle>
            <DialogDescription>
              Se quiser, informe o motivo para o líder.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Ex: Estarei viajando..."
            value={declineNote}
            onChange={(e) => setDeclineNote(e.target.value)}
            className="min-h-[100px]"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeclineDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineWithNote}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirmar ausência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

/* ----------------- */

function SummaryCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
}) {
  return (
    <Card className="rounded-2xl border">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
