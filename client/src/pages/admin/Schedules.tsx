import { useMemo, useState } from "react";
import {
  useVolunteerProfile,
  useVolunteers,
  useEventTypes,
  useServices,
} from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Service, ServiceAssignment } from "@shared/schema";

/* =====================================================
   COMPONENT
   ===================================================== */

export default function Schedules() {
  /* =======================
     DATA
  ======================= */
  const { data: profile } = useVolunteerProfile();
  const { data: services } = useServices(profile?.organizationId);
  const { data: volunteers } = useVolunteers(profile?.organizationId);
  const { data: eventTypes } = useEventTypes(profile?.organizationId);
  const { toast } = useToast();

  /* =======================
     STATE
  ======================= */
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // criação
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newEventTypeId, setNewEventTypeId] = useState("");
  const [newCustomName, setNewCustomName] = useState("");
  const [recurrenceType, setRecurrenceType] =
    useState<"none" | "daily" | "weekly">("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  // gestão de voluntários
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState("");
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  // RSVP recusa
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const isAdmin = profile?.accessLevel === "admin";
  const isLeader = profile?.accessLevel === "leader";
  const isAdminOrLeader = isAdmin || isLeader;

  /* =======================
     CAMADA 3 — LÍDER (MINISTÉRIOS QUE ELE LIDERA)
     Observação: ministryAssignments / ministryAssignments dos voluntários são JSONB,
     então tratamos com "any" para não depender de tipos/tabelas.
  ======================= */
  const leaderMinistryIds = useMemo(() => {
    const mas = (profile as any)?.ministryAssignments as any[] | undefined;
    if (!mas || !Array.isArray(mas)) return [];
    return mas.filter(ma => ma?.isLeader).map(ma => ma?.ministryId).filter(Boolean);
  }, [profile]);

  const canDeleteService = (service: Service): boolean => {
    // Admin sempre pode
    if (isAdmin) return true;

    // Só líder daqui pra baixo
    if (!isLeader) return false;

    const assignments = (service.assignments || []) as ServiceAssignment[];

    // Regra 1: escala vazia
    if (assignments.length === 0) return true;

    // Líder sem ministérios -> não exclui escala com voluntários
    if (leaderMinistryIds.length === 0) return false;

    // Regra 2: todos os voluntários devem pertencer a ministérios que o líder lidera
    return assignments.every(a => {
      const v = volunteers?.find(vol => vol.id === a.volunteerId);
      const vMas = (v as any)?.ministryAssignments as any[] | undefined;
      if (!vMas || !Array.isArray(vMas)) return false;

      return vMas.some(ma => leaderMinistryIds.includes(ma?.ministryId));
    });
  };

  /* =======================
     HELPERS
  ======================= */
  const getVolunteerName = (id?: string) =>
    volunteers?.find(v => v.id === id)?.name || "—";

  const getServiceTitle = (service: Service) => {
    if (service.title?.trim()) return service.title;

    const eventType = eventTypes?.find(e => e.id === service.eventTypeId);
    if (eventType) return eventType.name;

    return format(parseISO(service.date), "EEEE dd/MM", { locale: ptBR });
  };

  /* =======================
     CAMADA 2 — ESTATÍSTICAS
  ======================= */
  const getServiceStats = (service: Service) => {
    const assignments = (service.assignments || []) as ServiceAssignment[];
    const total = assignments.length;
    const confirmed = assignments.filter(a => a.status === "confirmed").length;
    const declined = assignments.filter(a => a.status === "declined").length;
    return { total, confirmed, declined };
  };

  const getServiceSummaryBadge = (service: Service) => {
    const { total, confirmed } = getServiceStats(service);

    if (total === 0) {
      return (
        <Badge className="bg-slate-100 text-slate-700 border">
          Sem voluntários
        </Badge>
      );
    }

    if (confirmed === total) {
      return (
        <Badge className="bg-green-100 text-green-800 border">
          Escala completa
        </Badge>
      );
    }

    if (confirmed > 0) {
      return (
        <Badge className="bg-amber-100 text-amber-800 border">
          Parcial ({confirmed}/{total})
        </Badge>
      );
    }

    return (
      <Badge className="bg-slate-100 text-slate-700 border">
        Pendente
      </Badge>
    );
  };

  const getStatusBadge = (status?: string) => {
    if (status === "confirmed")
      return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>;
    if (status === "declined")
      return <Badge className="bg-red-100 text-red-800">Recusou</Badge>;
    return <Badge className="bg-slate-100 text-slate-700">Pendente</Badge>;
  };

  const myAssignment = (service: Service) =>
    service.assignments?.find(a => a.volunteerId === (profile as any)?.id);

  const isPastService = (service: Service) =>
    isBefore(parseISO(service.date), new Date());

  /* =======================
     RECORRÊNCIA
  ======================= */
  const getMinEndDate = () => {
    if (!newDate) return "";
    const start = new Date(newDate);
    if (recurrenceType === "daily") return format(addDays(start, 1), "yyyy-MM-dd");
    if (recurrenceType === "weekly") return format(addWeeks(start, 1), "yyyy-MM-dd");
    return "";
  };

  const getMaxEndDate = () => {
    if (!newDate) return "";
    const start = new Date(newDate);
    if (recurrenceType === "daily") return format(addDays(start, 15), "yyyy-MM-dd");
    if (recurrenceType === "weekly") return format(addMonths(start, 3), "yyyy-MM-dd");
    return "";
  };

  /* =======================
     ACTIONS
  ======================= */
  const resetCreateForm = () => {
    setNewDate("");
    setNewEventTypeId("");
    setNewCustomName("");
    setRecurrenceType("none");
    setRecurrenceEndDate("");
  };

  const handleCreateService = async () => {
  if (!isAdminOrLeader) return;
  if (!newDate) {
    toast({ variant: "destructive", title: "Informe a data" });
    return;
  }

  if (!newEventTypeId && !newCustomName.trim()) {
    toast({ variant: "destructive", title: "Informe um tipo ou nome" });
    return;
  }

  const title =
    newCustomName.trim() ||
    eventTypes?.find(e => e.id === newEventTypeId)?.name ||
    "Evento";

  setIsSavingCreate(true);

  try {
    const baseDate = parseISO(newDate); // 🔑 FIX CRÍTICO
    const dates: string[] = [newDate];

    if (recurrenceType !== "none" && recurrenceEndDate) {
      const end = parseISO(recurrenceEndDate);
      let cursor = baseDate;

      while (true) {
        cursor =
          recurrenceType === "daily"
            ? addDays(cursor, 1)
            : addWeeks(cursor, 1); // ✅ mantém o mesmo dia da semana

        if (cursor > end) break;

        dates.push(format(cursor, "yyyy-MM-dd"));
      }
    }

    const payload = dates.map(date => ({
      id_uuid: crypto.randomUUID(),
      date,
      title,
      event_type_id: newEventTypeId || null,
      organization_id: profile?.organizationId,
      assignments: [],
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("services").insert(payload);
    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ["services"] });
    toast({ title: "Escala criada com sucesso" });
    setCreateDialogOpen(false);
    resetCreateForm();
  } catch (err: any) {
    toast({
      variant: "destructive",
      title: "Erro ao criar escala",
      description: err?.message || "Tente novamente.",
    });
  } finally {
    setIsSavingCreate(false);
  }
};


  const handleDeleteService = async (service: Service) => {
  if (!canDeleteService(service)) {
    toast({
      variant: "destructive",
      title: "Permissão negada",
      description:
        "Você só pode excluir escalas vazias ou escalas onde todos os voluntários pertençam a ministérios que você lidera.",
    });
    return;
  }

  if (!confirm("Deseja excluir esta escala?")) return;

  const { error } = await supabase.rpc("delete_service_if_allowed", {
    p_service_id: service.id_uuid,
  });

  if (error) {
    toast({
      variant: "destructive",
      title: "Erro ao excluir",
      description: error.message,
    });
    return;
  }

  queryClient.invalidateQueries({ queryKey: ["services"] });
  toast({ title: "Escala excluída com sucesso" });
};


  /* =======================
     ASSIGN / REMOVE
  ======================= */
  const openManageDialog = (service: Service) => {
    setSelectedService(service);
    setSelectedVolunteerId("");
    setAssignDialogOpen(true);
  };

  const handleAddVolunteer = async () => {
    if (!selectedService || !selectedVolunteerId) return;
    setIsSavingAssign(true);

    try {
      const current = (selectedService.assignments || []) as ServiceAssignment[];
      const already = current.some(a => a.volunteerId === selectedVolunteerId);
      if (already) {
        toast({
          variant: "destructive",
          title: "Voluntário já está na escala",
        });
        return;
      }

      const updated: ServiceAssignment[] = [
        ...current,
        { volunteerId: selectedVolunteerId, status: "pending" },
      ];

      const { error } = await supabase
        .from("services")
        .update({ assignments: updated })
        .eq("id_uuid", selectedService.id_uuid);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["services"] });
      setSelectedService({ ...selectedService, assignments: updated });
      setSelectedVolunteerId("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar voluntário",
        description: err?.message || "Tente novamente.",
      });
    } finally {
      setIsSavingAssign(false);
    }
  };

  const handleRemoveVolunteer = async (volunteerId: string) => {
    if (!selectedService) return;
    setIsSavingAssign(true);

    try {
      const updated = ((selectedService.assignments || []) as ServiceAssignment[]).filter(
        a => a.volunteerId !== volunteerId
      );

      const { error } = await supabase
        .from("services")
        .update({ assignments: updated })
        .eq("id_uuid", selectedService.id_uuid);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["services"] });
      setSelectedService({ ...selectedService, assignments: updated });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover voluntário",
        description: err?.message || "Tente novamente.",
      });
    } finally {
      setIsSavingAssign(false);
    }
  };

  /* =======================
     RSVP
  ======================= */
  const handleRSVPConfirm = async (service: Service) => {
    const updated = (service.assignments || []).map(a =>
      a.volunteerId === (profile as any)?.id ? { ...a, status: "confirmed" } : a
    );

    const { error } = await supabase
      .from("services")
      .update({ assignments: updated })
      .eq("id_uuid", service.id_uuid);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao confirmar",
        description: error.message,
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["services"] });
  };

  const openDeclineDialog = (service: Service) => {
    setSelectedService(service);
    setDeclineReason("");
    setDeclineDialogOpen(true);
  };

  const handleRSVPDecline = async () => {
    if (!selectedService) return;

    const updated = (selectedService.assignments || []).map(a =>
      a.volunteerId === (profile as any)?.id
        ? { ...a, status: "declined", note: declineReason }
        : a
    );

    const { error } = await supabase
      .from("services")
      .update({ assignments: updated })
      .eq("id_uuid", selectedService.id_uuid);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao recusar",
        description: error.message,
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["services"] });
    setDeclineDialogOpen(false);
  };

  /* =======================
     CALENDAR
  ======================= */
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth));
    const end = endOfWeek(endOfMonth(calendarMonth));
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const servicesForDay = (day: Date) =>
    services?.filter(s => isSameDay(parseISO(s.date), day)) || [];

  /* =======================
     JSX
  ======================= */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6" />
            Escalas
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie escalas e confirmações
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4 mr-1" /> Lista
          </Button>

          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            onClick={() => setViewMode("calendar")}
          >
            <CalendarDays className="w-4 h-4 mr-1" /> Calendário
          </Button>

          {isAdminOrLeader && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nova Escala
            </Button>
          )}
        </div>
      </div>

      {/* LISTA */}
      {viewMode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services?.map(service => {
            const my = myAssignment(service);
            const assignments = (service.assignments || []) as ServiceAssignment[];

            return (
              <Card key={service.id_uuid}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {getServiceTitle(service)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(service.date), "dd/MM/yyyy")}
                      </p>
                      <div className="mt-2">{getServiceSummaryBadge(service)}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isAdminOrLeader && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openManageDialog(service)}
                          title="Gerenciar voluntários"
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                      )}

                      {canDeleteService(service) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteService(service)}
                          title="Excluir escala"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* LISTA DE VOLUNTÁRIOS NO CARD */}
                  {assignments.length > 0 ? (
                    <div className="space-y-1 text-sm">
                      {assignments.map((a, idx) => (
                        <div
                          key={`${service.id_uuid}-${idx}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate">
                            {getVolunteerName(a.volunteerId)}
                          </span>
                          {getStatusBadge(a.status)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhum voluntário adicionado
                    </p>
                  )}

                  {/* RSVP DO USUÁRIO LOGADO */}
                  {my && !isPastService(service) && my.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => handleRSVPConfirm(service)}>
                        <Check className="w-4 h-4 mr-1" /> Confirmar
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDeclineDialog(service)}
                      >
                        <X className="w-4 h-4 mr-1" /> Recusar
                      </Button>
                    </div>
                  )}

                  {my?.status === "confirmed" && (
                    <Badge className="bg-green-100 text-green-800 border border-green-200">
                      Presença confirmada
                    </Badge>
                  )}

                  {my?.status === "declined" && (
                    <Badge className="bg-red-100 text-red-800 border border-red-200">
                      Recusado: {(my as any).note || "—"}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CALENDÁRIO */}
      {viewMode === "calendar" && (
        <div className="border rounded-xl overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
            >
              <ChevronLeft />
            </Button>

            <h3 className="font-semibold capitalize">
              {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
            </h3>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
            >
              <ChevronRight />
            </Button>
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                className={`border p-2 min-h-[100px] ${
                  !isSameMonth(day, calendarMonth) ? "bg-slate-50" : ""
                }`}
              >
                <div className="text-xs text-right">
                  {format(day, "d")}
                </div>

                {servicesForDay(day).map(s => (
                  <div
                    key={s.id_uuid}
                    className="text-xs bg-primary/10 rounded p-1 mt-1 truncate"
                    title={getServiceTitle(s)}
                  >
                    {getServiceTitle(s)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DIALOG NOVA ESCALA */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Escala</DialogTitle>
            <DialogDescription>Crie uma nova escala</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="date"
                value={newDate}
                onChange={e => {
                  setNewDate(e.target.value);
                  setRecurrenceEndDate("");
                }}
              />
            </div>

            <div className="space-y-1">
              <Label>Tipo de evento</Label>
              <Select value={newEventTypeId} onValueChange={setNewEventTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tipo" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes?.map(et => (
                    <SelectItem key={et.id} value={et.id}>
                      {et.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-1">
              <Label>Nome personalizado</Label>
              <Input
                placeholder="Ex: Reunião Especial"
                value={newCustomName}
                onChange={e => setNewCustomName(e.target.value)}
              />
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label>Recorrência</Label>
              </div>

              <RadioGroup
                value={recurrenceType}
                onValueChange={v => {
                  setRecurrenceType(v as any);
                  setRecurrenceEndDate("");
                }}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="none" id="r-none" />
                  <Label htmlFor="r-none">Única</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="daily" id="r-daily" />
                  <Label htmlFor="r-daily">Diária</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="weekly" id="r-weekly" />
                  <Label htmlFor="r-weekly">Semanal</Label>
                </div>
              </RadioGroup>

              {recurrenceType !== "none" && (
                <div className="space-y-1">
                  <Label>Até quando?</Label>
                  <Input
                    type="date"
                    min={getMinEndDate()}
                    max={getMaxEndDate()}
                    value={recurrenceEndDate}
                    onChange={e => setRecurrenceEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetCreateForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateService} disabled={isSavingCreate}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG GESTÃO DE VOLUNTÁRIOS */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar voluntários</DialogTitle>
            <DialogDescription>
              {selectedService ? getServiceTitle(selectedService) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* LISTAGEM ATUAL */}
            <div className="space-y-2">
              <Label>Voluntários escalados</Label>

              {(selectedService?.assignments || []).length > 0 ? (
                <div className="space-y-2">
                  {(selectedService?.assignments || []).map((a, idx) => (
                    <div
                      key={`sel-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getVolunteerName(a.volunteerId)}
                        </p>
                        <div className="mt-1">{getStatusBadge(a.status)}</div>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleRemoveVolunteer(a.volunteerId || "")}
                        disabled={isSavingAssign}
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum voluntário adicionado
                </p>
              )}
            </div>

            {/* ADICIONAR */}
            <div className="space-y-2 pt-2 border-t">
              <Label>Adicionar voluntário</Label>
              <Select value={selectedVolunteerId} onValueChange={setSelectedVolunteerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um voluntário" />
                </SelectTrigger>
                <SelectContent>
                  {volunteers?.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleAddVolunteer} disabled={isSavingAssign} className="w-full">
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG RECUSA RSVP */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Motivo da recusa</DialogTitle>
            <DialogDescription>
              Informe o motivo para recusar esta escala
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={declineReason}
            onChange={e => setDeclineReason(e.target.value)}
            placeholder="Ex: compromisso familiar, viagem, trabalho..."
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRSVPDecline}
              disabled={!declineReason.trim()}
            >
              Confirmar recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
