import { useState, useMemo, useEffect } from "react";
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
  Bell,
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
import { format, isAfter, addDays, parseISO, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import { urlBase64ToUint8Array } from "@/lib/push";
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
  const [showNotifications, setShowNotifications] = useState(true);
  const [showUnavailabilitySection, setShowUnavailabilitySection] = useState(true);

  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

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

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setPushSupported(supported);

    if (!supported) {
      setPushPermission("unsupported");
      return;
    }

    setPushPermission(Notification.permission);

    const checkExisting = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = registration
          ? await registration.pushManager.getSubscription()
          : null;
        if (subscription) setPushEnabled(true);

        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        const { data } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (data && data.length > 0) setPushEnabled(true);
      } catch {
        // ignore
      }
    };

    checkExisting();
  }, []);

  const handleTestPush = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      await supabase.functions.invoke("send-push", {
        body: {
          userId: user.id,
          title: "Teste de notificacao",
          body: "Se voce recebeu, esta tudo certo!",
        },
      });
      toast({
        title: "Teste enviado",
        description: "Verifique se a notificacao chegou.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Nao foi possivel enviar o teste.",
        variant: "destructive",
      });
    }
  };

  const handleDisablePush = async () => {
    if (!pushSupported) return;
    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;
      if (subscription) {
        await subscription.unsubscribe();
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user) {
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
      }

      setPushEnabled(false);
      toast({
        title: "Notificacoes desativadas",
        description: "Voce nao recebera alertas neste dispositivo.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Nao foi possivel desativar.",
        variant: "destructive",
      });
    } finally {
      setPushLoading(false);
    }
  };

  const handleEnablePush = async () => {
    if (!pushSupported) return;
    if (!vapidPublicKey) {
      toast({
        title: "VAPID nao configurado",
        description: "Defina VITE_VAPID_PUBLIC_KEY no ambiente.",
        variant: "destructive",
      });
      return;
    }

    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") {
        toast({
          title: "Permissao negada",
          description: "Ative as notificacoes no navegador.",
          variant: "destructive",
        });
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error("Usuario nao autenticado.");

      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("subscription", subscription as any)
        .limit(1);

      if (!existing || existing.length === 0) {
        const { error } = await supabase.from("push_subscriptions").insert({
          user_id: user.id,
          subscription,
        });
        if (error) throw error;
      }

      setPushEnabled(true);
      toast({
        title: "Notificacoes ativadas",
        description: "Voce recebera alertas de novas escalas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao ativar notificacoes",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPushLoading(false);
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

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground shadow-lg px-6 py-5 md:px-8 md:py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wide">
                <CalendarDays className="w-3.5 h-3.5" />
                Gestão de Escalas
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">
                Olá, {loadingProfile ? "..." : firstName}
              </h1>
              <div className="flex flex-wrap gap-3 text-xs md:text-sm opacity-90">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {volunteer?.organization?.name || "—"}
                </span>
              </div>
            </div>
            <div className="text-xs md:text-sm bg-white/15 px-3 py-2 rounded-xl">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </div>
          </div>
        </section>

        {/* RESUMO */}
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="warning">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Pendentes {pendingSchedules.length}
            </Badge>
            <Badge variant="success">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Confirmadas {confirmedSchedules.length}
            </Badge>
            <Badge variant="info">
              <CalendarDays className="w-3.5 h-3.5 mr-1" />
              Total {mySchedules?.length || 0}
            </Badge>
          </div>

          {pendingSchedules.length > 0 && (
            <Button size="sm" onClick={() => setSelectedScheduleId(pendingSchedules[0].id)}>
              Confirmar escalas
            </Button>
          )}
        </section>

        {nextSchedule && (
          <section>
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-primary uppercase">
                    Próximo compromisso
                  </p>
                  <p className="font-semibold truncate">
                    {nextSchedule.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatScheduleDate(nextSchedule.date)}
                  </p>
                </div>
                {getStatusBadge(nextSchedule)}
              </CardContent>
            </Card>
          </section>
        )}

        {/* ALERTA */}
        {pendingSchedules.length > 0 && (
          <section className="rounded-2xl border border-warning/30 bg-warning/10 p-4 flex gap-3 shadow-sm">
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

        {/* ALERTAS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Alertas</p>
                <p className="text-sm text-muted-foreground">
                  Receba avisos quando novas escalas forem criadas.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications((prev) => !prev)}
            >
              {showNotifications ? "Ocultar" : "Mostrar"}
            </Button>
          </div>

          {showNotifications && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 text-sm text-muted-foreground">
                {!pushSupported && (
                  <p>Seu navegador não suporta notificações push.</p>
                )}
                {pushPermission === "denied" && (
                  <p className="text-destructive">Permissão bloqueada no navegador.</p>
                )}
                {pushEnabled && <p>Notificações ativadas neste dispositivo.</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestPush}
                  disabled={!pushEnabled}
                >
                  Testar alerta
                </Button>

                {pushEnabled ? (
                  <Button
                    variant="outline"
                    onClick={handleDisablePush}
                    disabled={pushLoading}
                  >
                    {pushLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Desativar alertas
                  </Button>
                ) : (
                  <Button
                    onClick={handleEnablePush}
                    disabled={!pushSupported || pushLoading || pushEnabled || pushPermission === "denied"}
                    variant={pushEnabled ? "outline" : "default"}
                  >
                    {pushLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {pushEnabled ? "Alertas ativados" : "Ativar alertas"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>

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
                  className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap justify-between gap-4 transition hover:-translate-y-0.5 hover:shadow-md overflow-hidden"
                >
                  <div>
                    <p className="font-semibold">{schedule.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatScheduleDate(schedule.date)}
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
            <div className="py-12 rounded-2xl border border-dashed border-slate-200 text-center bg-white">
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Minha indisponibilidade
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUnavailabilitySection((prev) => !prev)}
            >
              {showUnavailabilitySection ? "Ocultar" : "Mostrar"}
            </Button>
          </div>

          {showUnavailabilitySection && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm overflow-hidden">
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
          )}
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
            <div className="py-16 rounded-3xl border border-dashed border-slate-200 text-center bg-white">
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
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
