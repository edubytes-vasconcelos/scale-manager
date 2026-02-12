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
import { X, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format, isAfter, addDays, parseISO, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { normalizeAssignments } from "@/lib/assignments";
import { usePushNotifications } from "@/hooks/use-push-notifications";

import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { NextScheduleCard } from "@/components/dashboard/NextScheduleCard";
import { PendingAlert } from "@/components/dashboard/PendingAlert";
import { PushNotificationSection } from "@/components/dashboard/PushNotificationSection";
import { MySchedulesList } from "@/components/dashboard/MySchedulesList";
import { UnavailabilitySection } from "@/components/dashboard/UnavailabilitySection";
import { UpcomingServices } from "@/components/dashboard/UpcomingServices";

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

  const push = usePushNotifications();

  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineNote, setDeclineNote] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<"all" | "pending" | "confirmed">("all");

  const firstName = volunteer?.name?.split(" ")[0] || "Voluntário";

  const getMyStatus = (service: any) => {
    if (!service.assignments || !volunteer?.id) return null;
    const { volunteers } = normalizeAssignments(service.assignments);
    const assignment = volunteers.find((a: any) => a.volunteerId === volunteer.id);
    return assignment?.status || null;
  };

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

  const nextWeekSchedules = useMemo(() => {
    if (!mySchedules) return [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 7);
    return mySchedules.filter((schedule) => {
      const date = parseISO(schedule.date);
      return date >= start && date <= end;
    });
  }, [mySchedules]);

  const nextWeekStats = useMemo(() => {
    const pending = nextWeekSchedules.filter((s) => getMyStatus(s) === "pending").length;
    const confirmed = nextWeekSchedules.filter((s) => getMyStatus(s) === "confirmed").length;
    return { pending, confirmed };
  }, [nextWeekSchedules, volunteer?.id]);

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
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar sua confirmação.",
        variant: "destructive",
      });
    }
  };

  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

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

  const handleAddUnavailability = async (data: { startDate: string; endDate: string; reason: string }) => {
    if (!volunteer?.organizationId || !volunteer?.id) return;
    if (!data.startDate || !data.endDate) {
      toast({
        title: "Período obrigatório",
        description: "Informe a data inicial e final.",
        variant: "destructive",
      });
      return;
    }

    if (data.endDate < data.startDate) {
      toast({
        title: "Período inválido",
        description: "A data final deve ser igual ou maior que a inicial.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createUnavailability.mutateAsync({
        organizationId: volunteer.organizationId,
        volunteerId: volunteer.id,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason.trim() || null,
      });
      toast({
        title: "Indisponibilidade registrada",
        description: "Período adicionado com sucesso.",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível salvar sua indisponibilidade.",
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
        description: "Não foi possível remover.",
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

  const formatScheduleDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return `Hoje, ${format(date, "dd/MM", { locale: ptBR })}`;
    }
    if (isTomorrow(date)) {
      return `Amanhã, ${format(date, "dd/MM", { locale: ptBR })}`;
    }
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  const filteredSchedules = useMemo(() => {
    if (!mySchedules) return [];
    if (scheduleFilter === "pending") {
      return mySchedules.filter((s) => getMyStatus(s) === "pending");
    }
    if (scheduleFilter === "confirmed") {
      return mySchedules.filter((s) => getMyStatus(s) === "confirmed");
    }
    return mySchedules;
  }, [mySchedules, scheduleFilter, volunteer?.id]);

  const nextScheduleEventType = nextSchedule
    ? eventTypes?.find((e) => e.id === nextSchedule.eventTypeId)
    : null;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <DashboardHero
          firstName={firstName}
          organizationName={volunteer?.organization?.name || ""}
          isLoading={loadingProfile}
        />

        <DashboardStats
          pendingCount={pendingSchedules.length}
          confirmedCount={confirmedSchedules.length}
          totalCount={mySchedules?.length || 0}
          nextWeekStats={nextWeekStats}
          hasNextWeekSchedules={nextWeekSchedules.length > 0}
          onConfirmClick={() => pendingSchedules[0] && setSelectedScheduleId(pendingSchedules[0].id)}
        />

        {nextSchedule && (
          <NextScheduleCard
            title={nextSchedule.title}
            date={nextSchedule.date}
            eventTypeName={nextScheduleEventType?.name}
            statusBadge={getStatusBadge(nextSchedule)}
            formatDate={formatScheduleDate}
          />
        )}

        <PendingAlert count={pendingSchedules.length} />

        <PushNotificationSection
          pushSupported={push.pushSupported}
          pushEnabled={push.pushEnabled}
          pushLoading={push.pushLoading}
          pushPermission={push.pushPermission}
          onEnable={push.handleEnablePush}
          onDisable={push.handleDisablePush}
          onTest={push.handleTestPush}
        />

        <MySchedulesList
          schedules={filteredSchedules}
          eventTypes={eventTypes}
          filter={scheduleFilter}
          onFilterChange={setScheduleFilter}
          onConfirm={(id) => handleConfirm(id, "confirmed")}
          onDecline={openDeclineDialog}
          isLoading={loadingMySchedules}
          getStatus={getMyStatus}
          getStatusBadge={getStatusBadge}
          formatDate={formatScheduleDate}
        />

        <UnavailabilitySection
          entries={myUnavailability}
          onAdd={handleAddUnavailability}
          onDelete={handleDeleteUnavailability}
          isAdding={createUnavailability.isPending}
          isDeleting={deleteUnavailability.isPending}
        />

        <UpcomingServices
          services={futureServices}
          eventTypes={eventTypes}
          volunteerId={volunteer?.id}
          isLoading={loadingServices}
        />
      </div>

      {/* Decline Dialog */}
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
