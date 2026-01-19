import { useState, useMemo } from "react";
import {
  useVolunteerProfile,
  useVolunteers,
  useEventTypes,
  useServices,
  usePreachers,
  useUpsertPreacher,
  useUpdatePreacher,
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
  Pencil,
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
import type {
  Service,
  ServiceAssignment,
  Preacher,
  ServiceAssignmentsPayload,
} from "@shared/schema";
import {
  buildAssignmentsPayload,
  normalizeAssignments,
} from "@/lib/assignments";

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
  canManagePreachingSchedule?: boolean;
};

/* =====================================================
   COMPONENT
===================================================== */

export default function Schedules() {
  const { data: profileRaw } = useVolunteerProfile();
  const profile = profileRaw as VolunteerProfileExtended | undefined;

  const { data: services } = useServices(profile?.organizationId);
  const { data: volunteers } = useVolunteers(profile?.organizationId);
  const { data: preachers } = usePreachers(profile?.organizationId);
  const { data: eventTypes } = useEventTypes(profile?.organizationId);
  const { toast } = useToast();
  const upsertPreacher = useUpsertPreacher();
  const updatePreacher = useUpdatePreacher();

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
  const [preacherSearch, setPreacherSearch] = useState("");
  const [preacherType, setPreacherType] = useState<
    "interno" | "convidado"
  >("interno");
  const [preacherChurch, setPreacherChurch] = useState("");
  const [preacherNotes, setPreacherNotes] = useState("");
  const [isSavingPreacher, setIsSavingPreacher] = useState(false);
  const [editPreacherOpen, setEditPreacherOpen] = useState(false);
  const [preacherToEdit, setPreacherToEdit] = useState<Preacher | null>(null);
  const [editPreacherName, setEditPreacherName] = useState("");
  const [editPreacherType, setEditPreacherType] = useState<
    "interno" | "convidado"
  >("interno");
  const [editPreacherChurch, setEditPreacherChurch] = useState("");
  const [editPreacherNotes, setEditPreacherNotes] = useState("");

  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [dayPickOpen, setDayPickOpen] = useState(false);
  const [dayPickServices, setDayPickServices] = useState<Service[]>([]);
  const [declineReason, setDeclineReason] = useState("");

  const isAdmin = profile?.accessLevel === "admin";
  const isLeader = profile?.accessLevel === "leader";
  const isAdminOrLeader = isAdmin || isLeader;
  const canManagePreaching = isAdmin || !!profile?.canManagePreachingSchedule;
  const canManageSchedules = isAdminOrLeader || canManagePreaching;
  const canManageVolunteers = isAdminOrLeader;

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

    const { volunteers: assignments } = getNormalizedAssignments(service);

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
    volunteers?.find((v) => v.id === id)?.name || "-";

  const getPreacherName = (id?: string) =>
    preachers?.find((p) => p.id === id)?.name || "-";

  const normalizeSearch = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const getNormalizedAssignments = (service?: Service | null) =>
    normalizeAssignments(
      (service?.assignments as ServiceAssignmentsPayload | undefined) ?? null
    );

  const getServiceTitle = (service: Service) => {
    if (service.title?.trim()) return service.title;
    const eventType = eventTypes?.find((e) => e.id === service.eventTypeId);
    if (eventType) return eventType.name;
    return format(parseISO(service.date), "EEEE dd/MM", { locale: ptBR });
  };

  const getServiceStats = (service: Service) => {
    const { volunteers: assignments } = getNormalizedAssignments(service);
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
    getNormalizedAssignments(service).volunteers.find(
      (a) => a.volunteerId === profile?.id
    );

  const isPastService = (service: Service) =>
    isBefore(parseISO(service.date), new Date());

  const openAssignDialog = (service: Service) => {
    setSelectedService(service);
    setSelectedVolunteerId("");
    resetPreacherForm();
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

  const resetPreacherForm = () => {
    setPreacherSearch("");
    setPreacherType("interno");
    setPreacherChurch("");
    setPreacherNotes("");
  };

  const normalizedPreacherSearch = useMemo(
    () => normalizeSearch(preacherSearch),
    [preacherSearch]
  );

  const filteredPreachers = useMemo(() => {
    if (!preachers) return [];
    if (!normalizedPreacherSearch) return preachers;
    return preachers.filter((p) =>
      (p.nameNormalized || normalizeSearch(p.name)).includes(
        normalizedPreacherSearch
      )
    );
  }, [preachers, normalizedPreacherSearch]);

  const exactPreacherMatch = useMemo(() => {
    if (!normalizedPreacherSearch || !preachers) return null;
    return preachers.find(
      (p) =>
        (p.nameNormalized || normalizeSearch(p.name)) === normalizedPreacherSearch
    );
  }, [normalizedPreacherSearch, preachers]);

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
      const { volunteers: assignments } = getNormalizedAssignments(service);
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
      const { volunteers: assignments } = getNormalizedAssignments(s);
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
    if (!canManageSchedules || !profile || !newDate) return;

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
        assignments: buildAssignmentsPayload({ volunteers: [], preachers: [] }),
        created_at: new Date().toISOString(),
      }));

      let createdService: any = null;

      if (payload.length === 1) {
        const { data, error } = await supabase
          .from("services")
          .insert(payload[0])
          .select()
          .single();
        if (error) throw error;
        createdService = data;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
      setCreateDialogOpen(false);
      resetCreateForm();

      toast({
        title: "Escala criada!",
        description: `${dates.length} evento(s) criado(s).`,
      });

      if (createdService) {
        openAssignDialog(createdService as Service);
      }
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

    const serviceId = (service as any).id_uuid ?? service.id;
    const { error } = await supabase.rpc("delete_service_if_allowed", {
      p_service_id: serviceId,
    });

    if (!error) {
      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
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
    return normalizeAssignments(
      (data.assignments as ServiceAssignmentsPayload | null) ?? null
    );
  };

  const handleAddVolunteer = async () => {
    if (!selectedService || !selectedVolunteerId) return;
    if (!canManageVolunteers) return;
    setIsSavingAssign(true);

    try {
      const current = await fetchAssignments(selectedService.id_uuid);
      if (current.volunteers.some((a) => a.volunteerId === selectedVolunteerId)) return;

      const updated = {
        ...current,
        volunteers: [
          ...current.volunteers,
          { volunteerId: selectedVolunteerId, status: "pending" },
        ],
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", selectedService.id_uuid);
      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
      setSelectedService({
        ...selectedService,
        assignments: buildAssignmentsPayload(updated),
      });
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
    if (!canManageVolunteers) return;
    setIsSavingAssign(true);

    try {
      const current = await fetchAssignments(selectedService.id_uuid);
      const updated = {
        ...current,
        volunteers: current.volunteers.filter((a) => a.volunteerId !== volunteerId),
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", selectedService.id_uuid);
      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
      setSelectedService({
        ...selectedService,
        assignments: buildAssignmentsPayload(updated),
      });
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
     PREGADORES (SAFE)
  ======================= */

  const handleAddPreacher = async (preacher: Preacher) => {
    if (!selectedService || !profile) return;
    setIsSavingPreacher(true);

    try {
      const current = await fetchAssignments(selectedService.id_uuid);
      if (current.preachers.some((p) => p.preacherId === preacher.id)) return;

      const updated = {
        ...current,
        preachers: [
          ...current.preachers,
          { preacherId: preacher.id, name: preacher.name, role: "pregador" },
        ],
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", selectedService.id_uuid);
      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
      setSelectedService({
        ...selectedService,
        assignments: buildAssignmentsPayload(updated),
      });
      resetPreacherForm();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao adicionar pregador",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreacher(false);
    }
  };

  const handleRemovePreacher = async (preacherId: string) => {
    if (!selectedService || !profile) return;
    setIsSavingPreacher(true);

    try {
      const current = await fetchAssignments(selectedService.id_uuid);
      const updated = {
        ...current,
        preachers: current.preachers.filter((p) => p.preacherId !== preacherId),
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", selectedService.id_uuid);
      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
      setSelectedService({
        ...selectedService,
        assignments: buildAssignmentsPayload(updated),
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao remover pregador",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreacher(false);
    }
  };

  const handleCreatePreacher = async () => {
    if (!profile) return;
    if (!preacherSearch.trim()) {
      toast({
        title: "Nome obrigat¢rio",
        description: "Informe o nome do pregador.",
        variant: "destructive",
      });
      return;
    }

    if (exactPreacherMatch) {
      toast({
        title: "Este pregador já está cadastrado nesta organização.",
        variant: "destructive",
      });
      await handleAddPreacher(exactPreacherMatch);
      return;
    }

    setIsSavingPreacher(true);
    try {
      const created = await upsertPreacher.mutateAsync({
        organizationId: profile.organizationId,
        name: preacherSearch.trim(),
        type: preacherType,
        church: preacherChurch.trim() || undefined,
        notes: preacherNotes.trim() || undefined,
      });

      await handleAddPreacher(created);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao cadastrar pregador",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreacher(false);
    }
  };

  const openEditPreacher = (preacher: Preacher) => {
    setPreacherToEdit(preacher);
    setEditPreacherName(preacher.name);
    setEditPreacherType(preacher.type);
    setEditPreacherChurch(preacher.church || "");
    setEditPreacherNotes(preacher.notes || "");
    setEditPreacherOpen(true);
  };

  const handleUpdatePreacher = async () => {
    if (!profile || !preacherToEdit) return;
    if (!editPreacherName.trim()) {
      toast({
        title: "Nome obrigat¢rio",
        description: "Informe o nome do pregador.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPreacher(true);
    try {
      const updated = await updatePreacher.mutateAsync({
        id: preacherToEdit.id,
        organizationId: profile.organizationId,
        name: editPreacherName.trim(),
        type: editPreacherType,
        church: editPreacherChurch.trim() || undefined,
        notes: editPreacherNotes.trim() || undefined,
      });

      if (selectedService) {
        const current = await fetchAssignments(selectedService.id_uuid);
        const next = {
          ...current,
          preachers: current.preachers.map((p) =>
            p.preacherId === updated.id ? { ...p, name: updated.name } : p
          ),
        };
        const { error } = await supabase
          .from("services")
          .update({ assignments: buildAssignmentsPayload(next) })
          .eq("id_uuid", selectedService.id_uuid);
        if (error) throw error;
        setSelectedService({
          ...selectedService,
          assignments: buildAssignmentsPayload(next),
        });
      }

      setEditPreacherOpen(false);
      setPreacherToEdit(null);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao atualizar pregador",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreacher(false);
    }
  };

  /* =======================
     RSVP
  ======================= */

  const handleRSVPConfirm = async (service: Service) => {
    if (!profile) return;

    try {
      const current = await fetchAssignments(service.id_uuid);
      const updated = {
        ...current,
        volunteers: current.volunteers.map((a) =>
          a.volunteerId === profile.id ? { ...a, status: "confirmed" } : a
        ),
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", service.id_uuid);
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });

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
      const updated = {
        ...current,
        volunteers: current.volunteers.map((a) =>
          a.volunteerId === profile.id
            ? { ...a, status: "declined", note: declineReason }
            : a
        ),
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", selectedService.id_uuid);
      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
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

  const handleDayClick = (day: Date) => {
    if (!canManageSchedules) return;

    const dayServices = servicesForDay(day);
    if (dayServices.length === 0) {
      setNewDate(format(day, "yyyy-MM-dd"));
      setCreateDialogOpen(true);
      return;
    }

    if (dayServices.length === 1) {
      openAssignDialog(dayServices[0]);
      return;
    }

    setDayPickServices(dayServices);
    setDayPickOpen(true);
  };

  const selectedAssignments = getNormalizedAssignments(selectedService);

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

          {canManageSchedules && (
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
            const { volunteers: assignments, preachers: preacherAssignments } =
              getNormalizedAssignments(service);

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
                      {canManageSchedules && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openAssignDialog(service)}
                          title="Gerenciar escala"
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

                  {preacherAssignments.length > 0 && (
                    <div className="pt-2 border-t space-y-1 text-sm">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Pregadores
                      </p>
                      {preacherAssignments.map((p, idx) => (
                        <div
                          key={`${service.id_uuid}-preacher-${idx}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate">
                            {getPreacherName(p.preacherId) || p.name}
                          </span>
                          <Badge className="bg-indigo-100 text-indigo-800">
                            Pregador
                          </Badge>
                        </div>
                      ))}
                    </div>
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

          <div className="grid grid-cols-7 bg-slate-100 border-b">
            {Array.from({ length: 7 }).map((_, idx) => {
              const label = format(addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), idx), "EEE", {
                locale: ptBR,
              });
              return (
                <div key={`weekday-${idx}`} className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {label}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                className={`border p-2 min-h-[100px] ${
                  !isSameMonth(day, calendarMonth) ? "bg-slate-50" : ""
                } ${canManageSchedules ? "cursor-pointer hover:bg-slate-50" : ""}`}
                onClick={() => handleDayClick(day)}
              >
                <div className="text-xs text-right">{format(day, "d")}</div>

                {servicesForDay(day).map((s) => (
                  (() => {
                    const { preachers } = getNormalizedAssignments(s);
                    const preacherNames = preachers
                      .map((p) => getPreacherName(p.preacherId) || p.name)
                      .filter((name) => name && name !== "-")
                      .join(", ");

                    return (
                  <div
                    key={s.id_uuid}
                    className="text-xs bg-primary/10 rounded p-1 mt-1 truncate"
                    title={getServiceTitle(s)}
                  >
                    {getServiceTitle(s)}
                    {preachers.length > 0 && (
                      <span className="block text-[10px] text-muted-foreground truncate">
                        Pregador: {preacherNames || "Definido"}
                      </span>
                    )}
                  </div>
                    );
                  })()
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
            <DialogTitle>Gerenciar escala</DialogTitle>
            <DialogDescription>
              {selectedService ? getServiceTitle(selectedService) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* LISTAGEM ATUAL */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Voluntários escalados</Label>

                {selectedAssignments.volunteers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAssignments.volunteers.map((a, idx) => (
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
                          disabled={!canManageVolunteers || isSavingAssign}
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

              <div className="space-y-2">
                <Label>Pregadores escalados</Label>

                {selectedAssignments.preachers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAssignments.preachers.map((p, idx) => {
                      const preacherRecord = preachers?.find(
                        (preacher) => preacher.id === p.preacherId
                      );
                      const preacherName =
                        preacherRecord?.name || p.name || "-";

                      return (
                        <div
                          key={`preacher-${idx}`}
                          className="flex items-center justify-between gap-2 rounded-md border p-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {preacherName}
                            </p>
                            <p className="text-xs text-muted-foreground">Pregador</p>
                          </div>

                          {canManagePreaching && preacherRecord && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditPreacher(preacherRecord)}
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleRemovePreacher(p.preacherId)}
                                disabled={isSavingPreacher}
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum pregador adicionado
                  </p>
                )}
              </div>

              {!canManagePreaching && (
                <p className="text-xs text-muted-foreground">
                  Você não tem permissão para editar pregadores.
                </p>
              )}
            </div>

            {canManageVolunteers && (
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
            )}

            {canManagePreaching && (
              <div className="space-y-3 pt-2 border-t">
                <Label>Adicionar pregador</Label>
                <Input
                  placeholder="Buscar ou cadastrar pregador"
                  value={preacherSearch}
                  onChange={(e) => setPreacherSearch(e.target.value)}
                />

                {preacherSearch.trim() && (
                  <div className="space-y-2">
                    {filteredPreachers.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto rounded-md border">
                        {filteredPreachers.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 border-b last:border-b-0"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.type === "interno" ? "Interno" : "Convidado"}
                                {p.church ? ` • ${p.church}` : ""}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddPreacher(p)}
                              disabled={isSavingPreacher}
                            >
                              Adicionar
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nenhum pregador encontrado. Cadastre abaixo.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid gap-2">
                  <Select
                    value={preacherType}
                    onValueChange={(v) => setPreacherType(v as "interno" | "convidado")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de pregador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interno">Interno</SelectItem>
                      <SelectItem value="convidado">Convidado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Igreja (opcional)"
                    value={preacherChurch}
                    onChange={(e) => setPreacherChurch(e.target.value)}
                  />

                  <Textarea
                    placeholder="Observações (opcional)"
                    value={preacherNotes}
                    onChange={(e) => setPreacherNotes(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleCreatePreacher}
                  disabled={isSavingPreacher}
                  className="w-full"
                >
                  Cadastrar e adicionar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editPreacherOpen}
        onOpenChange={(open) => {
          setEditPreacherOpen(open);
          if (!open) setPreacherToEdit(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar pregador</DialogTitle>
            <DialogDescription>
              Atualize os dados do pregador selecionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={editPreacherName}
                onChange={(e) => setEditPreacherName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={editPreacherType}
                onValueChange={(v) =>
                  setEditPreacherType(v as "interno" | "convidado")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="convidado">Convidado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Igreja</Label>
              <Input
                value={editPreacherChurch}
                onChange={(e) => setEditPreacherChurch(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                value={editPreacherNotes}
                onChange={(e) => setEditPreacherNotes(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditPreacherOpen(false);
                setPreacherToEdit(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdatePreacher} disabled={isSavingPreacher}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dayPickOpen} onOpenChange={setDayPickOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escolha a escala</DialogTitle>
            <DialogDescription>
              Este dia possui mais de uma escala. Selecione qual deseja editar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {dayPickServices.map((service) => (
              <div
                key={service.id_uuid}
                className="flex items-center justify-between gap-2 rounded-md border p-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{getServiceTitle(service)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(service.date), "dd/MM/yyyy")}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setDayPickOpen(false);
                    openAssignDialog(service);
                  }}
                >
                  Editar
                </Button>
              </div>
            ))}
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
