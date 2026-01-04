import { useState, useMemo } from "react";
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
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import {
  format,
  parseISO,
  isBefore,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addDays,
  addWeeks,
  isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Service, ServiceAssignment } from "@shared/schema";

/* =====================================================
   TIPOS LOCAIS
===================================================== */

type MinistryAssignment = {
  ministryId: string;
  isLeader?: boolean;
};

type VolunteerProfileExtended = {
  id: string;
  accessLevel: "admin" | "leader" | "volunteer";
  organizationId: string;
  ministryAssignments?: MinistryAssignment[];
};

/* =====================================================
   COMPONENT
===================================================== */

export default function Schedules() {
  const { data: profileRaw } = useVolunteerProfile();
  const profile = profileRaw as VolunteerProfileExtended | undefined;

  const { data: services } = useServices(profile?.organizationId);
  const { data: volunteers } = useVolunteers(profile?.organizationId);
  const { data: eventTypes } = useEventTypes(profile?.organizationId);
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // ✅ filtros
  const [filterSearch, setFilterSearch] = useState("");
  const [filterMineOnly, setFilterMineOnly] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "confirmed" | "declined"
  >("all");
  const [filterTime, setFilterTime] = useState<"all" | "future" | "past">(
    "future"
  );
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterEventType, setFilterEventType] = useState("all");
  const [quickChip, setQuickChip] = useState<
    "none" | "myPending" | "today" | "week"
  >("none");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newEventTypeId, setNewEventTypeId] = useState("");
  const [newCustomName, setNewCustomName] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<
    "none" | "daily" | "weekly"
  >("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState("");
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const isAdmin = profile?.accessLevel === "admin";
  const isLeader = profile?.accessLevel === "leader";
  const isAdminOrLeader = isAdmin || isLeader;

  /* =======================
     CAMADA 3 — LÍDER
  ======================= */

  const leaderMinistryIds = useMemo(() => {
    if (!profile?.ministryAssignments) return [];
    return profile.ministryAssignments
      .filter((m) => m.isLeader)
      .map((m) => m.ministryId);
  }, [profile]);

  const canDeleteService = (service: Service): boolean => {
    if (isAdmin) return true;
    if (!isLeader) return false;
    if (!volunteers) return false;

    const assignments = (service.assignments || []) as ServiceAssignment[];

    if (assignments.length === 0) return true;
    if (leaderMinistryIds.length === 0) return false;

    return assignments.every((a) => {
      const v = volunteers.find((vol) => vol.id === a.volunteerId);
      if (!v) return false;

      const vMas = (v as any).ministryAssignments as
        | MinistryAssignment[]
        | undefined;
      if (!vMas) return false;

      return vMas.some((ma) => leaderMinistryIds.includes(ma.ministryId));
    });
  };

  /* =======================
     HELPERS
  ======================= */

  const getVolunteerName = (id?: string) =>
    volunteers?.find((v) => v.id === id)?.name || "—";

  const getServiceTitle = (service: Service) => {
    if (service.title?.trim()) return service.title;
    const eventType = eventTypes?.find((e) => e.id === service.eventTypeId);
    if (eventType) return eventType.name;
    return format(parseISO(service.date), "EEEE dd/MM", { locale: ptBR });
  };

  const getServiceStats = (service: Service) => {
    const assignments = (service.assignments || []) as ServiceAssignment[];
    const total = assignments.length;
    const confirmed = assignments.filter((a) => a.status === "confirmed").length;
    return { total, confirmed };
  };

  const getServiceSummaryBadge = (service: Service) => {
    const { total, confirmed } = getServiceStats(service);

    if (total === 0)
      return <Badge className="bg-slate-100 text-slate-700">Sem voluntários</Badge>;

    if (confirmed === total)
      return <Badge className="bg-green-100 text-green-800">Escala completa</Badge>;

    if (confirmed > 0)
      return (
        <Badge className="bg-amber-100 text-amber-800">
          Parcial ({confirmed}/{total})
        </Badge>
      );

    return <Badge className="bg-slate-100 text-slate-700">Pendente</Badge>;
  };

  const getStatusBadge = (status?: string) => {
    if (status === "confirmed")
      return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>;
    if (status === "declined")
      return <Badge className="bg-red-100 text-red-800">Recusou</Badge>;
    return <Badge className="bg-slate-100 text-slate-700">Pendente</Badge>;
  };

  const myAssignment = (service: Service) =>
    service.assignments?.find((a) => a.volunteerId === profile?.id);

  const isPastService = (service: Service) =>
    isBefore(parseISO(service.date), new Date());

  const openAssignDialog = (service: Service) => {
    setSelectedService(service);
    setSelectedVolunteerId("");
    setAssignDialogOpen(true);
  };

  const openDeclineDialog = (service: Service) => {
    setSelectedService(service);
    setDeclineReason("");
    setDeclineDialogOpen(true);
  };

  const resetCreateForm = () => {
    setNewDate("");
    setNewEventTypeId("");
    setNewCustomName("");
    setRecurrenceType("none");
    setRecurrenceEndDate("");
  };

  /* =======================
     FILTROS
  ======================= */

  const clearFilters = () => {
    setFilterSearch("");
    setFilterMineOnly(false);
    setFilterStatus("all");
    setFilterTime("future");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterEventType("all");
    setQuickChip("none");
  };

  const hasActiveFilters = !!(
    filterSearch.trim() ||
    filterMineOnly ||
    filterStatus !== "all" ||
    filterTime !== "future" ||
    filterDateFrom ||
    filterDateTo ||
    filterEventType !== "all" ||
    quickChip !== "none"
  );

  const applyQuickChip = (chip: "myPending" | "today" | "week") => {
    // toggle
    if (quickChip === chip) {
      setQuickChip("none");
      return;
    }

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const today = parseISO(todayStr);

    setQuickChip(chip);

    if (chip === "myPending") {
      setFilterMineOnly(true);
      setFilterStatus("pending");
      setFilterTime("future");
      setFilterDateFrom("");
      setFilterDateTo("");
      return;
    }

    if (chip === "today") {
      setFilterSearch("");
      setFilterMineOnly(false);
      setFilterStatus("all");
      setFilterTime("all");
      setFilterDateFrom(todayStr);
      setFilterDateTo(todayStr);
      return;
    }

    // week
    const start = startOfWeek(today, { weekStartsOn: 0 });
    const end = endOfWeek(today, { weekStartsOn: 0 });
    setFilterSearch("");
    setFilterMineOnly(false);
    setFilterStatus("all");
    setFilterTime("all");
    setFilterDateFrom(format(start, "yyyy-MM-dd"));
    setFilterDateTo(format(end, "yyyy-MM-dd"));
  };

  const filteredServices = useMemo(() => {
    if (!services) return [];

    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const today = parseISO(todayStr);

    const startWeek = startOfWeek(today, { weekStartsOn: 0 });
    const endWeek = endOfWeek(today, { weekStartsOn: 0 });

    return services.filter((service) => {
      const serviceDate = parseISO(service.date);
      const assignments = (service.assignments || []) as ServiceAssignment[];
      const my = profile?.id
        ? assignments.find((a) => a.volunteerId === profile.id)
        : undefined;

      // 🔍 busca por texto (título)
      if (filterSearch.trim()) {
        const text = getServiceTitle(service).toLowerCase();
        if (!text.includes(filterSearch.trim().toLowerCase())) return false;
      }

      // 🏷️ tipo de evento
      if (filterEventType !== "all" && service.eventTypeId !== filterEventType)
        return false;

      // 📅 time (passadas/futuras/todas)
      if (filterTime === "future" && isBefore(serviceDate, now)) return false;
      if (filterTime === "past" && !isBefore(serviceDate, now)) return false;

      // 📅 intervalo manual (from/to)
      if (filterDateFrom && isBefore(serviceDate, parseISO(filterDateFrom)))
        return false;
      if (filterDateTo && isBefore(parseISO(filterDateTo), serviceDate))
        return false;

      // 🧩 chips rápidos (today/week)
      if (quickChip === "today") {
        if (!isSameDay(serviceDate, today)) return false;
      }
      if (quickChip === "week") {
        if (isBefore(serviceDate, startWeek) || isBefore(endWeek, serviceDate))
          return false;
      }

      // 👤 somente minhas escalas
      if (filterMineOnly && !my) return false;

      // ✅ status pessoal (minha resposta)
      if (filterStatus !== "all") {
        if (!my || my.status !== filterStatus) return false;
      }

      // 🧩 chip "minhas pendentes" (atalho)
      if (quickChip === "myPending") {
        if (!my || my.status !== "pending") return false;
      }

      return true;
    });
  }, [
    services,
    profile?.id,
    filterSearch,
    filterMineOnly,
    filterStatus,
    filterTime,
    filterDateFrom,
    filterDateTo,
    filterEventType,
    quickChip,
    eventTypes,
  ]);

  /* =======================
     CONTADORES (CHIPS)
  ======================= */
  const chipCounts = useMemo(() => {
    if (!services || !profile?.id) return { myPending: 0, today: 0, week: 0 };

    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const today = parseISO(todayStr);

    const startWeek = startOfWeek(today, { weekStartsOn: 0 });
    const endWeek = endOfWeek(today, { weekStartsOn: 0 });

    let myPending = 0;
    let todayCount = 0;
    let weekCount = 0;

    for (const s of services) {
      const d = parseISO(s.date);
      const assignments = (s.assignments || []) as ServiceAssignment[];
      const my = assignments.find((a) => a.volunteerId === profile.id);

      if (my?.status === "pending" && !isBefore(d, now)) myPending += 1;
      if (isSameDay(d, today)) todayCount += 1;
      if (!isBefore(d, startWeek) && !isBefore(endWeek, d)) weekCount += 1;
    }

    return { myPending, today: todayCount, week: weekCount };
  }, [services, profile?.id]);

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
     CREATE
  ======================= */

  const handleCreateService = async () => {
    if (!isAdminOrLeader || !profile || !newDate) return;

    const title =
      newCustomName.trim() ||
      eventTypes?.find((e) => e.id === newEventTypeId)?.name ||
      "Evento";

    setIsSavingCreate(true);

    try {
      const baseDate = parseISO(newDate);
      const dates: string[] = [newDate];

      if (recurrenceType !== "none" && recurrenceEndDate) {
        let cursor = baseDate;
        const end = parseISO(recurrenceEndDate);

        while (true) {
          cursor = recurrenceType === "daily" ? addDays(cursor, 1) : addWeeks(cursor, 1);
          if (cursor > end) break;
          dates.push(format(cursor, "yyyy-MM-dd"));
        }
      }

      const payload = dates.map((date) => ({
        id_uuid: crypto.randomUUID(),
        date,
        title,
        event_type_id: newEventTypeId || null,
        organization_id: profile.organizationId,
        assignments: [],
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("services").insert(payload);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["services"] });
      setCreateDialogOpen(false);
      resetCreateForm();

      toast({
        title: "Escala criada!",
        description: `${dates.length} evento(s) criado(s).`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao criar escala",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCreate(false);
    }
  };

  /* =======================
     DELETE
  ======================= */

  const handleDeleteService = async (service: Service) => {
    if (!canDeleteService(service)) return;
    if (!confirm("Deseja excluir esta escala?")) return;

    const { error } = await supabase.rpc("delete_service_if_allowed", {
      p_service_id: service.id_uuid,
    });

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Escala excluída" });
    } else {
      toast({
        title: "Não foi possível excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  /* =======================
     ASSIGNMENTS (SAFE)
  ======================= */

  const fetchAssignments = async (id: string) => {
    const { data, error } = await supabase
      .from("services")
      .select("assignments")
      .eq("id_uuid", id)
      .single();

    if (error) throw error;
    return (data.assignments || []) as ServiceAssignment[];
  };

  const handleAddVolunteer = async () => {
    if (!selectedService || !selectedVolunteerId) return;
    setIsSavingAssign(true);

    try {
      const current = await fetchAssignments(selectedService.id_uuid);
      if (current.some((a) => a.volunteerId === selectedVolunteerId)) return;

      const updated = [...current, { volunteerId: selectedVolunteerId, status: "pending" }];

      await supabase
        .from("services")
        .update({ assignments: updated })
        .eq("id_uuid", selectedService.id_uuid);

      queryClient.invalidateQueries({ queryKey: ["services"] });
      setSelectedService({ ...selectedService, assignments: updated });
      setSelectedVolunteerId("");
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao adicionar voluntário",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAssign(false);
    }
  };

  const handleRemoveVolunteer = async (volunteerId: string) => {
    if (!selectedService) return;
    setIsSavingAssign(true);

    try {
      const current = await fetchAssignments(selectedService.id_uuid);
      const updated = current.filter((a) => a.volunteerId !== volunteerId);

      await supabase
        .from("services")
        .update({ assignments: updated })
        .eq("id_uuid", selectedService.id_uuid);

      queryClient.invalidateQueries({ queryKey: ["services"] });
      setSelectedService({ ...selectedService, assignments: updated });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao remover voluntário",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAssign(false);
    }
  };

  /* =======================
     RSVP
  ======================= */

  const handleRSVPConfirm = async (service: Service) => {
    if (!profile) return;

    try {
      const current = await fetchAssignments(service.id_uuid);
      const updated = current.map((a) =>
        a.volunteerId === profile.id ? { ...a, status: "confirmed" } : a
      );

      await supabase.from("services").update({ assignments: updated }).eq("id_uuid", service.id_uuid);
      queryClient.invalidateQueries({ queryKey: ["services"] });

      toast({ title: "Confirmado!", description: "Sua presença foi confirmada." });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao confirmar",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRSVPDecline = async () => {
    if (!selectedService || !profile) return;

    try {
      const current = await fetchAssignments(selectedService.id_uuid);
      const updated = current.map((a) =>
        a.volunteerId === profile.id
          ? { ...a, status: "declined", note: declineReason }
          : a
      );

      await supabase
        .from("services")
        .update({ assignments: updated })
        .eq("id_uuid", selectedService.id_uuid);

      queryClient.invalidateQueries({ queryKey: ["services"] });
      setDeclineDialogOpen(false);

      toast({ title: "Recusa registrada", description: "Obrigado por avisar." });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao recusar",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    }
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
    services?.filter((s) => isSameDay(parseISO(s.date), day)) || [];

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
          <p className="text-sm text-muted-foreground">Gerencie escalas e confirmações</p>
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

      {/* Filters Section */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chips rápidos */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={quickChip === "myPending" ? "default" : "outline"}
              onClick={() => applyQuickChip("myPending")}
              className={`transition-all duration-200 ${
                quickChip === "myPending" ? "scale-[1.02] shadow-sm" : ""
              }`}
            >
              Minhas pendentes ({chipCounts.myPending})
            </Button>

            <Button
              type="button"
              variant={quickChip === "today" ? "default" : "outline"}
              onClick={() => applyQuickChip("today")}
              className={`transition-all duration-200 ${
                quickChip === "today" ? "scale-[1.02] shadow-sm" : ""
              }`}
            >
              Hoje ({chipCounts.today})
            </Button>

            <Button
              type="button"
              variant={quickChip === "week" ? "default" : "outline"}
              onClick={() => applyQuickChip("week")}
              className={`transition-all duration-200 ${
                quickChip === "week" ? "scale-[1.02] shadow-sm" : ""
              }`}
            >
              Esta semana ({chipCounts.week})
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="ml-auto">
                Limpar
              </Button>
            )}
          </div>

          {/* Filtros detalhados */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input
              placeholder="Buscar por título..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />

            <Select value={filterEventType} onValueChange={setFilterEventType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {eventTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Meu status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Meu status (todos)</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="declined">Recusado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTime} onValueChange={(v) => setFilterTime(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="future">Futuras</SelectItem>
                <SelectItem value="past">Passadas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant={filterMineOnly ? "default" : "outline"}
              onClick={() => setFilterMineOnly((v) => !v)}
              className="transition-all duration-200"
            >
              Minhas escalas
            </Button>

            <div className="space-y-1 md:col-span-2">
              <Label>De</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label>Até</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Toggle */}
      {viewMode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServices.map((service) => {
            const my = myAssignment(service);
            const assignments = (service.assignments || []) as ServiceAssignment[];

            return (
              <Card key={service.id_uuid}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{getServiceTitle(service)}</CardTitle>
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
                          onClick={() => openAssignDialog(service)}
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
                          <span className="truncate">{getVolunteerName(a.volunteerId)}</span>
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

                      <Button size="sm" variant="outline" onClick={() => openDeclineDialog(service)}>
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
                <div className="text-xs text-right">{format(day, "d")}</div>

                {servicesForDay(day).map((s) => (
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
                onChange={(e) => {
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
                  {eventTypes?.map((et) => (
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
                onChange={(e) => setNewCustomName(e.target.value)}
              />
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label>Recorrência</Label>
              </div>

              <RadioGroup
                value={recurrenceType}
                onValueChange={(v) => {
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
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
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
              <Select
                value={selectedVolunteerId}
                onValueChange={setSelectedVolunteerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um voluntário" />
                </SelectTrigger>
                <SelectContent>
                  {volunteers?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleAddVolunteer}
                disabled={isSavingAssign}
                className="w-full"
              >
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
            onChange={(e) => setDeclineReason(e.target.value)}
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
