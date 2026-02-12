import { useState, useMemo, useEffect, useRef } from "react";
import {
  useVolunteerProfile,
  useVolunteers,
  useMinistries,
  useVolunteerUnavailability,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
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
  FileDown,
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
import { getReadableEventColor } from "@/lib/color";
import { auditEvent } from "@/lib/audit";
import { mapService } from "@/lib/mappers";

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

type AutoScheduleSuggestion = {
  ministryId: string;
  ministryName: string;
  requestedSlots: number;
  suggestedVolunteerIds: string[];
  missingSlots: number;
};

/* =====================================================
   COMPONENT
===================================================== */

export default function Schedules() {
  const { data: profileRaw } = useVolunteerProfile();
  const profile = profileRaw as VolunteerProfileExtended | undefined;

  const { data: services } = useServices(profile?.organizationId);
  const { data: volunteers } = useVolunteers(profile?.organizationId);
  const { data: ministries } = useMinistries(profile?.organizationId);
  const { data: preachers } = usePreachers(profile?.organizationId);
  const { data: eventTypes } = useEventTypes(profile?.organizationId);
  const { data: unavailability } = useVolunteerUnavailability(profile?.organizationId);
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
  const [shouldFocusAssign, setShouldFocusAssign] = useState(false);
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  const [editEventTypeId, setEditEventTypeId] = useState("");
  const [editEventTitle, setEditEventTitle] = useState("");
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [preacherSearch, setPreacherSearch] = useState("");
  const preacherSearchRef = useRef<HTMLInputElement | null>(null);
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
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<
    { volunteerId: string; volunteerName: string; services: string[] }[]
  >([]);

  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [dayPickOpen, setDayPickOpen] = useState(false);
  const [dayPickServices, setDayPickServices] = useState<Service[]>([]);
  const [declineReason, setDeclineReason] = useState("");
  const [autoMinistrySlots, setAutoMinistrySlots] = useState<Record<string, number>>({});
  const [autoSuggestions, setAutoSuggestions] = useState<AutoScheduleSuggestion[]>([]);
  const [isGeneratingAuto, setIsGeneratingAuto] = useState(false);
  const [isApplyingAuto, setIsApplyingAuto] = useState(false);

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

  const manageableMinistriesForAuto = useMemo(() => {
    if (!ministries || !volunteers) return [];

    const baseList = isAdmin
      ? ministries
      : isLeader
      ? ministries.filter((m) => leaderMinistryIds.includes(m.id))
      : [];

    // Mostra apenas ministerios com ao menos 1 voluntario vinculado.
    return baseList.filter((ministry) =>
      volunteers.some((volunteer) =>
        (volunteer.ministryAssignments || []).some(
          (assignment) => assignment.ministryId === ministry.id
        )
      )
    );
  }, [ministries, volunteers, isAdmin, isLeader, leaderMinistryIds]);

  const canDeleteService = (service: Service): boolean => {
    if (isAdmin) return true;
    if (canManagePreaching) return true;
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

  const isDateInRange = (date: string, start: string, end: string) =>
    date >= start && date <= end;

  const getVolunteerUnavailability = (volunteerId?: string, date?: string) => {
    if (!volunteerId || !date) return null;
    return unavailability?.find((entry) =>
      entry.volunteerId === volunteerId &&
      entry.startDate &&
      entry.endDate &&
      isDateInRange(date, String(entry.startDate), String(entry.endDate))
    ) || null;
  };

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
      return <Badge className="bg-muted text-foreground">Sem voluntários</Badge>;

    if (confirmed === total)
      return <Badge className="bg-green-100 text-green-800">Escala completa</Badge>;

    if (confirmed > 0)
      return (
        <Badge className="bg-amber-100 text-amber-800">
          Parcial ({confirmed}/{total})
        </Badge>
      );

    return <Badge className="bg-muted text-foreground">Pendente</Badge>;
  };

  const getStatusBadge = (status?: string) => {
    if (status === "confirmed")
      return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>;
    if (status === "declined")
      return <Badge className="bg-red-100 text-red-800">Recusou</Badge>;
    return <Badge className="bg-muted text-foreground">Pendente</Badge>;
  };

  const getStatusLabel = (status?: string) => {
    if (status == "confirmed") return "Confirmado";
    if (status == "declined") return "Recusado";
    return "Pendente";
  };

  const myAssignment = (service: Service) =>
    getNormalizedAssignments(service).volunteers.find(
      (a) => a.volunteerId === profile?.id
    );

  const isPastService = (service: Service) =>
    isBefore(parseISO(service.date), new Date());

  const openAssignDialog = (
    service: Service,
    options?: { focusPreacher?: boolean }
  ) => {
    const normalizedTitle = service.title?.trim();
    const directEventType = eventTypes?.find((et) => et.id === service.eventTypeId);
    const inferredEventType =
      !service.eventTypeId && normalizedTitle
        ? eventTypes?.find(
            (et) => et.name.trim().toLowerCase() === normalizedTitle.toLowerCase()
          )
        : undefined;
    const eventType = directEventType || inferredEventType;
    const eventTypeName = eventType?.name;
    const shouldClearTitle =
      !!eventTypeName && normalizedTitle === eventTypeName.trim();

    setSelectedService(service);
    setSelectedVolunteerId("");
    resetPreacherForm();
    setEditEventTypeId(eventType?.id || "");
    setEditEventTitle(shouldClearTitle ? "" : service.title || "");
    setShouldFocusAssign(!!options?.focusPreacher);
    setAutoMinistrySlots({});
    setAutoSuggestions([]);
    setAssignDialogOpen(true);

    if (services?.length) {
      const currentAssignments = getNormalizedAssignments(service).volunteers;
      const otherSameDay = services.filter(
        (s) => s.id !== service.id && s.date === service.date
      );
      if (currentAssignments.length > 0 && otherSameDay.length > 0) {
        const conflictsByVolunteer = new Map<string, Set<string>>();

        currentAssignments.forEach((assignment) => {
          if (!assignment.volunteerId) return;
          otherSameDay.forEach((other) => {
            const hasConflict = getNormalizedAssignments(other).volunteers.some(
              (a) => a.volunteerId === assignment.volunteerId
            );
            if (!hasConflict) return;
            const key = assignment.volunteerId!;
            const titles = conflictsByVolunteer.get(key) || new Set<string>();
            titles.add(getServiceTitle(other));
            conflictsByVolunteer.set(key, titles);
          });
        });

        if (conflictsByVolunteer.size > 0) {
          const details = Array.from(conflictsByVolunteer.entries()).map(
            ([volunteerId, titles]) => ({
              volunteerId,
              volunteerName: getVolunteerName(volunteerId),
              services: Array.from(titles),
            })
          );
          setConflictDetails(details);
          setConflictDialogOpen(true);

          const entries = Array.from(conflictsByVolunteer.entries());
          const preview = entries
            .slice(0, 3)
            .map(([volunteerId, titles]) => {
              const volunteerName = getVolunteerName(volunteerId);
              const titleList = Array.from(titles).slice(0, 2).join(", ");
              return `${volunteerName}: ${titleList}`;
            })
            .join(" • ");
          const suffix =
            entries.length > 3 ? ` e mais ${entries.length - 3} conflito(s)` : "";

          toast({
            title: "Conflitos de escala no mesmo dia",
            description: `${preview}${suffix}.`,
          });
        }
      }
    }
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

  useEffect(() => {
    if (!assignDialogOpen || !shouldFocusAssign) return;
    const timer = setTimeout(() => {
      preacherSearchRef.current?.focus();
      setShouldFocusAssign(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [assignDialogOpen, shouldFocusAssign]);

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

  const activeFiltersCount = [
    filterSearch.trim(),
    filterMineOnly,
    filterStatus !== "all",
    filterTime !== "future",
    filterDateFrom,
    filterDateTo,
    filterEventType !== "all",
    quickChip !== "none",
  ].filter(Boolean).length;

  const applyQuickChip = (chip: "myPending" | "today" | "week") => {
    // toggle
    if (quickChip === chip) {
      setQuickChip("none");
      if (chip === "myPending") {
        setFilterMineOnly(false);
        setFilterStatus("all");
        setFilterTime("future");
      } else {
        setFilterDateFrom("");
        setFilterDateTo("");
        setFilterTime("future");
      }
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
        const searchTerm = normalizeSearch(filterSearch);
        const title = normalizeSearch(getServiceTitle(service));
        const eventTypeName =
          eventTypes?.find((e) => e.id === service.eventTypeId)?.name || "";
        const eventTypeText = normalizeSearch(eventTypeName);
        const { preachers } = getNormalizedAssignments(service);

        const matchesTitle = title.includes(searchTerm);
        const matchesEventType = eventTypeText.includes(searchTerm);
        const matchesVolunteer = assignments.some((a) =>
          normalizeSearch(getVolunteerName(a.volunteerId)).includes(searchTerm)
        );
        const matchesPreacher = preachers.some((p) => {
          const name = getPreacherName(p.preacherId) || p.name || "";
          return normalizeSearch(name).includes(searchTerm);
        });

        if (!matchesTitle && !matchesEventType && !matchesVolunteer && !matchesPreacher)
          return false;
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

  const notifyNewSchedule = async (count: number) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      await supabase.functions.invoke("send-push", {
        body: {
          userId: user.id,
          title: "Nova escala criada",
          body: count > 1 ? `Foram criadas ${count} escalas.` : "Uma nova escala foi criada.",
        },
      });
    } catch {
      // ignore
    }
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

    const hasCustomTitle = !!newCustomName.trim();
    const title = hasCustomTitle
      ? newCustomName.trim()
      : newEventTypeId
        ? null
        : "Evento";

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
        createdService = mapService(data);
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });

      await notifyNewSchedule(dates.length);
      await auditEvent({
        organizationId: profile.organizationId,
        actorVolunteerId: profile.id,
        action: "schedule.create",
        entityType: "service",
        entityId: createdService?.id ?? null,
        metadata: {
          count: dates.length,
          dates,
          eventTypeId: newEventTypeId || null,
          title,
          recurrenceType,
        },
      });

      toast({
        title: "Escala criada!",
        description: `${dates.length} evento(s) criado(s).`,
      });

      if (createdService) {
        resetCreateForm();
        openAssignDialog(createdService as Service, { focusPreacher: true });
      } else {
        resetCreateForm();
        setAssignDialogOpen(false);
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

  const openQuickCreateDialog = (options?: {
    date?: string;
    focusPreacher?: boolean;
  }) => {
    if (!canManageSchedules) return;
    setSelectedService(null);
    setNewDate(options?.date || "");
    setNewEventTypeId("");
    setNewCustomName("");
    setRecurrenceType("none");
    setRecurrenceEndDate("");
    setAssignDialogOpen(true);
    if (options?.focusPreacher) {
      setTimeout(() => preacherSearchRef.current?.focus(), 120);
    }
  };

  /* =======================
     DELETE
  ======================= */

  const handleDeleteService = async (service: Service) => {
    if (!canDeleteService(service)) return;
    if (!confirm("Deseja excluir esta escala?")) return;

    const serviceId = service.id;
    const { error } = await supabase.rpc("delete_service_if_allowed", {
      p_service_id: serviceId,
    });

    if (!error) {
      queryClient.invalidateQueries({
        queryKey: ["services", profile?.organizationId],
      });
      if (profile?.organizationId) {
        await auditEvent({
          organizationId: profile.organizationId,
          actorVolunteerId: profile.id,
          action: "schedule.delete",
          entityType: "service",
          entityId: serviceId,
          metadata: {
            date: service.date,
            title: service.title || null,
          },
        });
      }
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

  const handleAutoSlotChange = (ministryId: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const nextValue = Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, 20)) : 0;
    setAutoMinistrySlots((prev) => ({ ...prev, [ministryId]: nextValue }));
  };

  const getVolunteerHistoryStats = (volunteerId: string, untilDate: string) => {
    if (!services?.length) {
      return {
        totalAssignments: 0,
        confirmedAssignments: 0,
        declinedAssignments: 0,
        recentAssignments8w: 0,
        daysSinceLastAssignment: 999,
      };
    }

    const until = parseISO(untilDate);
    const recentStart = addWeeks(until, -8);
    let totalAssignments = 0;
    let confirmedAssignments = 0;
    let declinedAssignments = 0;
    let recentAssignments8w = 0;
    let lastAssignmentDate: Date | null = null;

    for (const service of services) {
      const serviceDate = parseISO(service.date);
      if (!isBefore(serviceDate, until)) continue;
      const assignment = getNormalizedAssignments(service).volunteers.find(
        (a) => a.volunteerId === volunteerId
      );
      if (!assignment) continue;

      totalAssignments += 1;
      if (assignment.status === "confirmed") confirmedAssignments += 1;
      if (assignment.status === "declined") declinedAssignments += 1;
      if (!isBefore(serviceDate, recentStart)) recentAssignments8w += 1;

      if (!lastAssignmentDate || isBefore(lastAssignmentDate, serviceDate)) {
        lastAssignmentDate = serviceDate;
      }
    }

    const daysSinceLastAssignment = lastAssignmentDate
      ? Math.max(
          0,
          Math.floor((until.getTime() - lastAssignmentDate.getTime()) / (1000 * 60 * 60 * 24))
        )
      : 999;

    return {
      totalAssignments,
      confirmedAssignments,
      declinedAssignments,
      recentAssignments8w,
      daysSinceLastAssignment,
    };
  };

  const generateAutoSuggestions = async () => {
    if (!selectedService || !volunteers?.length || !services?.length) return;
    if (!canManageVolunteers) return;

    const slotsByMinistry = Object.entries(autoMinistrySlots)
      .filter(([_, slots]) => (slots || 0) > 0)
      .map(([ministryId, slots]) => ({ ministryId, slots }));

    if (slotsByMinistry.length === 0) {
      toast({
        title: "Informe as vagas por ministério",
        description: "Defina ao menos 1 vaga em um ministério para gerar sugestões.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAuto(true);
    try {
      const currentAssignments = getNormalizedAssignments(selectedService).volunteers;
      const alreadyAssignedIds = new Set(
        currentAssignments.map((a) => a.volunteerId).filter(Boolean) as string[]
      );
      const usedVolunteerIds = new Set<string>();

      const nextSuggestions: AutoScheduleSuggestion[] = [];

      for (const { ministryId, slots } of slotsByMinistry) {
        if (!isAdmin && !leaderMinistryIds.includes(ministryId)) continue;

        const ministry = ministries?.find((m) => m.id === ministryId);
        const ministryName = ministry?.name || "Ministério";

        const eligible = volunteers
          .filter((volunteer) => {
            const assignments = (volunteer as any).ministryAssignments as
              | MinistryAssignment[]
              | undefined;
            const belongsToMinistry = assignments?.some(
              (assignment) => assignment.ministryId === ministryId
            );
            if (!belongsToMinistry) return false;
            if (alreadyAssignedIds.has(volunteer.id)) return false;
            if (usedVolunteerIds.has(volunteer.id)) return false;
            if (getVolunteerUnavailability(volunteer.id, selectedService.date)) return false;

            const hasSameDayConflict = services.some((service) => {
              if (service.id === selectedService.id) return false;
              if (service.date !== selectedService.date) return false;
              return getNormalizedAssignments(service).volunteers.some(
                (assignment) => assignment.volunteerId === volunteer.id
              );
            });

            return !hasSameDayConflict;
          })
          .map((volunteer) => {
            const stats = getVolunteerHistoryStats(volunteer.id, selectedService.date);
            const reliabilityBase =
              stats.totalAssignments > 0
                ? (stats.confirmedAssignments / stats.totalAssignments) * 25
                : 12;
            const balanceScore = Math.max(0, 40 - stats.recentAssignments8w * 6);
            const recencyScore = Math.min(20, (stats.daysSinceLastAssignment / 60) * 20);
            const declinePenalty = Math.min(20, stats.declinedAssignments * 2);
            const totalScore = balanceScore + reliabilityBase + recencyScore - declinePenalty;

            return { volunteer, totalScore };
          })
          .sort((a, b) => b.totalScore - a.totalScore);

        const selected = eligible.slice(0, slots).map((entry) => entry.volunteer.id);
        selected.forEach((id) => usedVolunteerIds.add(id));

        nextSuggestions.push({
          ministryId,
          ministryName,
          requestedSlots: slots,
          suggestedVolunteerIds: selected,
          missingSlots: Math.max(0, slots - selected.length),
        });
      }

      setAutoSuggestions(nextSuggestions);

      const totalRequested = nextSuggestions.reduce(
        (sum, item) => sum + item.requestedSlots,
        0
      );
      const totalSuggested = nextSuggestions.reduce(
        (sum, item) => sum + item.suggestedVolunteerIds.length,
        0
      );

      toast({
        title: "Sugestões geradas",
        description: `${totalSuggested}/${totalRequested} vagas preenchidas automaticamente.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao gerar sugestões",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAuto(false);
    }
  };

  const applyAutoSuggestions = async () => {
    if (!selectedService || !profile) return;
    if (!canManageVolunteers) return;

    const allSuggestedIds = Array.from(
      new Set(autoSuggestions.flatMap((item) => item.suggestedVolunteerIds))
    );

    if (allSuggestedIds.length === 0) {
      toast({
        title: "Sem sugestões para aplicar",
        description: "Gere sugestões antes de aplicar.",
        variant: "destructive",
      });
      return;
    }

    setIsApplyingAuto(true);
    try {
      const current = await fetchAssignments(selectedService.id);
      const existingIds = new Set(
        current.volunteers.map((assignment) => assignment.volunteerId).filter(Boolean) as string[]
      );
      const toAdd = allSuggestedIds.filter((volunteerId) => !existingIds.has(volunteerId));

      if (toAdd.length === 0) {
        toast({
          title: "Nada para aplicar",
          description: "Todos os sugeridos já estão escalados neste evento.",
        });
        return;
      }

      const updated = {
        ...current,
        volunteers: [
          ...current.volunteers,
          ...toAdd.map((volunteerId) => ({
            volunteerId,
            status: "pending" as const,
            note: "auto_schedule",
          })),
        ],
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", selectedService.id);
      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
      setSelectedService({
        ...selectedService,
        assignments: buildAssignmentsPayload(updated),
      });
      await auditEvent({
        organizationId: profile.organizationId,
        actorVolunteerId: profile.id,
        action: "schedule.autoschedule.apply",
        entityType: "service",
        entityId: selectedService.id,
        metadata: {
          addedVolunteerIds: toAdd,
          suggestions: autoSuggestions.map((item) => ({
            ministryId: item.ministryId,
            requestedSlots: item.requestedSlots,
            suggestedVolunteerIds: item.suggestedVolunteerIds,
            missingSlots: item.missingSlots,
          })),
        },
      });

      toast({
        title: "Sugestões aplicadas",
        description: `${toAdd.length} voluntário(s) adicionados à escala.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao aplicar sugestões",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsApplyingAuto(false);
    }
  };

  const handleAddVolunteer = async (force = false) => {
    if (!selectedService || !selectedVolunteerId) return;
    if (!canManageVolunteers) return;
    setIsSavingAssign(true);

    try {
      if (!force && services?.length) {
        const conflicts = services.filter((service) => {
          if (service.id === selectedService.id) return false;
          if (service.date !== selectedService.date) return false;
          return getNormalizedAssignments(service).volunteers.some(
            (assignment) => assignment.volunteerId === selectedVolunteerId
          );
        });

        if (conflicts.length > 0) {
          const preview = conflicts
            .slice(0, 2)
            .map(
              (service) =>
                `${format(parseISO(service.date), "dd/MM")} - ${getServiceTitle(service)}`
            )
            .join("; ");
          const suffix =
            conflicts.length > 2
              ? ` e mais ${conflicts.length - 2} conflito(s)`
              : "";

          toast({
            title: "Conflito de escala no mesmo dia",
            description: `${preview}${suffix}.`,
            action: (
              <ToastAction
                altText="Adicionar mesmo assim"
                onClick={() => handleAddVolunteer(true)}
              >
                Adicionar mesmo assim
              </ToastAction>
            ),
          });
          return;
        }
      }

      const unavailabilityEntry = getVolunteerUnavailability(
        selectedVolunteerId,
        selectedService.date
      );
      if (unavailabilityEntry) {
        const reason = unavailabilityEntry.reason?.trim();
        const period = `${format(parseISO(String(unavailabilityEntry.startDate)), "dd/MM")} - ${format(
          parseISO(String(unavailabilityEntry.endDate)),
          "dd/MM"
        )}`;
        toast({
          title: "Voluntário indisponível",
          description: reason
            ? `${period}. Motivo: ${reason}`
            : `${period}.`,
          variant: "destructive",
        });
        return;
      }

      const current = await fetchAssignments(selectedService.id);
      if (current.volunteers.some((a) => a.volunteerId === selectedVolunteerId)) return;

      const updated = {
        ...current,
        volunteers: [
          ...current.volunteers,
          { volunteerId: selectedVolunteerId, status: "pending" as const },
        ],
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", selectedService.id);
      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
      setSelectedService({
        ...selectedService,
        assignments: buildAssignmentsPayload(updated),
      });
      await auditEvent({
        organizationId: profile.organizationId,
        actorVolunteerId: profile.id,
        action: "schedule.assignment.add",
        entityType: "service",
        entityId: selectedService.id,
        metadata: {
          volunteerId: selectedVolunteerId,
          source: force ? "force_conflict_override" : "manual",
        },
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
      const current = await fetchAssignments(selectedService.id);
      const updated = {
        ...current,
        volunteers: current.volunteers.filter((a) => a.volunteerId !== volunteerId),
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", selectedService.id);
      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
      setSelectedService({
        ...selectedService,
        assignments: buildAssignmentsPayload(updated),
      });
      if (profile) {
        await auditEvent({
          organizationId: profile.organizationId,
          actorVolunteerId: profile.id,
          action: "schedule.assignment.remove",
          entityType: "service",
          entityId: selectedService.id,
          metadata: { volunteerId },
        });
      }
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
     EVENTO (EDIT)
  ======================= */

  const handleUpdateServiceEvent = async () => {
    if (!selectedService || !canManageSchedules || !profile) return;
    setIsSavingEvent(true);

    try {
      const title = editEventTitle.trim();
      const { error } = await supabase
        .from("services")
        .update({
          title: title ? title : null,
          event_type_id: editEventTypeId || null,
        })
        .eq("id_uuid", selectedService.id);

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["services", profile?.organizationId],
      });

      setSelectedService({
        ...selectedService,
        title: title ? title : null,
        eventTypeId: editEventTypeId || null,
      } as Service);
      await auditEvent({
        organizationId: profile.organizationId,
        actorVolunteerId: profile.id,
        action: "schedule.update",
        entityType: "service",
        entityId: selectedService.id,
        metadata: {
          title: title ? title : null,
          eventTypeId: editEventTypeId || null,
        },
      });

      toast({
        title: "Evento atualizado",
        description: "As mudanças foram salvas.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao atualizar evento",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEvent(false);
    }
  };

  /* =======================
     PREGADORES (SAFE)
  ======================= */

  const handleAddPreacher = async (preacher: Preacher) => {
    if (!selectedService || !profile) return;
    setIsSavingPreacher(true);

    try {
      const current = await fetchAssignments(selectedService.id);
      if (current.preachers.some((p) => p.preacherId === preacher.id)) return;

      const updated = {
        ...current,
        preachers: [
          ...current.preachers,
          { preacherId: preacher.id, name: preacher.name, role: "pregador" as const },
        ],
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", selectedService.id);
      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
      setSelectedService({
        ...selectedService,
        assignments: buildAssignmentsPayload(updated),
      });
      await auditEvent({
        organizationId: profile.organizationId,
        actorVolunteerId: profile.id,
        action: "schedule.preacher.add",
        entityType: "service",
        entityId: selectedService.id,
        metadata: {
          preacherId: preacher.id,
          preacherName: preacher.name,
        },
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
      const current = await fetchAssignments(selectedService.id);
      const updated = {
        ...current,
        preachers: current.preachers.filter((p) => p.preacherId !== preacherId),
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", selectedService.id);
      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
      setSelectedService({
        ...selectedService,
        assignments: buildAssignmentsPayload(updated),
      });
      await auditEvent({
        organizationId: profile.organizationId,
        actorVolunteerId: profile.id,
        action: "schedule.preacher.remove",
        entityType: "service",
        entityId: selectedService.id,
        metadata: { preacherId },
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
        title: "Nome obrigatório",
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
        title: "Nome obrigatório",
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
        const current = await fetchAssignments(selectedService.id);
        const next = {
          ...current,
          preachers: current.preachers.map((p) =>
            p.preacherId === updated.id ? { ...p, name: updated.name } : p
          ),
        };
        const { error } = await supabase
          .from("services")
          .update({ assignments: buildAssignmentsPayload(next) })
          .eq("id_uuid", selectedService.id);
        if (error) throw error;
        setSelectedService({
          ...selectedService,
          assignments: buildAssignmentsPayload(next),
        });
        await auditEvent({
          organizationId: profile.organizationId,
          actorVolunteerId: profile.id,
          action: "schedule.preacher.update",
          entityType: "service",
          entityId: selectedService.id,
          metadata: {
            preacherId: updated.id,
            preacherName: updated.name,
          },
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
      const current = await fetchAssignments(service.id);
      const updated = {
        ...current,
        volunteers: current.volunteers.map((a) =>
          a.volunteerId === profile.id ? { ...a, status: "confirmed" as const } : a
        ),
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", service.id);
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
      await auditEvent({
        organizationId: profile.organizationId,
        actorVolunteerId: profile.id,
        action: "schedule.rsvp.confirm",
        entityType: "service",
        entityId: service.id,
      });

      toast({ title: "Confirmado!", description: "Sua presença foi confirmada." });
    } catch (error: any) {
      console.error(error);
      await auditEvent({
        organizationId: profile.organizationId,
        actorVolunteerId: profile.id,
        action: "system.error",
        entityType: "system",
        metadata: {
          area: "schedule_rsvp",
          operation: "confirm",
          serviceId: service.id,
          message: error?.message || "unknown_error",
        },
      });
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
      const current = await fetchAssignments(selectedService.id);
      const updated = {
        ...current,
        volunteers: current.volunteers.map((a) =>
          a.volunteerId === profile.id
            ? { ...a, status: "declined" as const, note: declineReason }
            : a
        ),
      };

      const { error } = await supabase
        .from("services")
        .update({ assignments: buildAssignmentsPayload(updated) })
        .eq("id_uuid", selectedService.id);
      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["services", profile.organizationId],
      });
      setDeclineDialogOpen(false);
      await auditEvent({
        organizationId: profile.organizationId,
        actorVolunteerId: profile.id,
        action: "schedule.rsvp.decline",
        entityType: "service",
        entityId: selectedService.id,
        metadata: {
          reason: declineReason || null,
        },
      });

      toast({ title: "Recusa registrada", description: "Obrigado por avisar." });
    } catch (error: any) {
      console.error(error);
      await auditEvent({
        organizationId: profile.organizationId,
        actorVolunteerId: profile.id,
        action: "system.error",
        entityType: "system",
        metadata: {
          area: "schedule_rsvp",
          operation: "decline",
          serviceId: selectedService.id,
          message: error?.message || "unknown_error",
        },
      });
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
      openQuickCreateDialog({ date: format(day, "yyyy-MM-dd"), focusPreacher: true });
      return;
    }

    if (dayServices.length === 1) {
      openAssignDialog(dayServices[0]);
      return;
    }

    setDayPickServices(dayServices);
    setDayPickOpen(true);
  };

  const handleExportPeriodPdf = () => {
    if (!filteredServices || filteredServices.length === 0) {
      toast({
        title: "Nada para exportar",
        description: "Aplique filtros ou escolha um periodo com escalas.",
        variant: "destructive",
      });
      return;
    }

    const sortedServices = [...filteredServices].sort(
      (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
    );

    const rows = sortedServices
      .map((service) => {
        const eventType = eventTypes?.find((e) => e.id === service.eventTypeId);
        const eventTypeName = eventType?.name || "-";
        const title = getServiceTitle(service);
        const dateLabel = format(parseISO(service.date), "dd/MM/yyyy");

        const { volunteers: assignments, preachers } = getNormalizedAssignments(service);
        const preacherNames = preachers
          .map((p) => getPreacherName(p.preacherId) || p.name)
          .filter((name) => name && name !== "-")
          .join(", ");

        const ministryGroups = {} as Record<string, { name: string; status: string }[]>;

        assignments.forEach((assignment) => {
          const volunteer = volunteers?.find((v) => v.id === assignment.volunteerId);
          const volunteerName = volunteer?.name || "Voluntário";
          const statusLabel = getStatusLabel(assignment.status);
          const ministryId = volunteer?.ministryAssignments?.[0]?.ministryId;
          const ministryName =
            ministries?.find((m) => m.id === ministryId)?.name || "Sem ministerio";

          if (!ministryGroups[ministryName]) {
            ministryGroups[ministryName] = [];
          }

          ministryGroups[ministryName].push({ name: volunteerName, status: statusLabel });
        });

        Object.values(ministryGroups).forEach((group) =>
          group.sort((a, b) => a.name.localeCompare(b.name))
        );

        const sortedMinistries = Object.keys(ministryGroups).sort((a, b) =>
          a.localeCompare(b)
        );

        const volunteerHtml =
          sortedMinistries.length > 0
            ? sortedMinistries
                .map((ministry) => {
                  const entries = ministryGroups[ministry]
                    .map((entry) => `<li>${entry.name} (${entry.status})</li>`)
                    .join("");

                  return `
                    <div class="ministry-block">
                      <strong>${ministry}</strong>
                      <ul>${entries}</ul>
                    </div>
                  `;
                })
                .join("")
            : `<span class="empty">Nenhum voluntario escalado.</span>`;

        const preacherHtml = preacherNames
          ? preacherNames
          : `<span class="empty">Nenhum pregador definido.</span>`;

        return `
          <tr>
            <td>
              <div class="cell-title">${title}</div>
              <div class="cell-sub">${dateLabel}</div>
            </td>
            <td>${eventTypeName}</td>
            <td>${preacherHtml}</td>
            <td>${volunteerHtml}</td>
          </tr>
        `;
      })
      .join("\n");

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Escalas</title>
          <style>
            @page { size: A4 landscape; margin: 16mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
            h1 { font-size: 18px; margin: 0 0 4px; }
            .subtitle { font-size: 12px; color: #475569; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; vertical-align: top; }
            th { background: #f8fafc; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
            .cell-title { font-weight: 600; }
            .cell-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
            .empty { color: #64748b; font-size: 11px; }
            .ministry-block { margin-bottom: 6px; }
            .ministry-block strong { display: block; font-size: 11px; color: #1e293b; }
            ul { margin: 4px 0 0 16px; padding: 0; }
            li { margin: 0 0 2px; }
            .footer { margin-top: 16px; font-size: 10px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <h1>Escalas do periodo</h1>
          <div class="subtitle">Periodo: ${filterDateFrom ? format(parseISO(filterDateFrom), "dd/MM/yyyy") : "Inicio"} - ${filterDateTo ? format(parseISO(filterDateTo), "dd/MM/yyyy") : "Hoje"} • Total: ${sortedServices.length}</div>
          <table>
            <thead>
              <tr>
                <th>Escala</th>
                <th>Tipo</th>
                <th>Pregador</th>
                <th>Voluntários</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="footer">Gerado pelo Gestor de Escalas</div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      toast({
        title: "Não foi possível gerar o PDF",
        description: "Tente novamente.",
        variant: "destructive",
      });
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    iframe.onload = () => {
      const contentWindow = iframe.contentWindow;
      if (!contentWindow) {
        document.body.removeChild(iframe);
        toast({
          title: "Não foi possível gerar o PDF",
          description: "Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      let didPrint = false;
      const fallbackTimer = window.setTimeout(() => {
        if (didPrint) return;
        toast({
          title: "Impressao bloqueada",
          description: "Clique para abrir o PDF em uma nova aba.",
          action: (
            <ToastAction
              altText="Abrir PDF"
              onClick={() => {
                const popup = window.open("", "_blank");
                if (!popup) return;
                popup.document.open();
                popup.document.write(html);
                popup.document.close();
              }}
            >
              Abrir PDF
            </ToastAction>
          ),
        });
      }, 1000);

      contentWindow.onbeforeprint = () => {
        didPrint = true;
        window.clearTimeout(fallbackTimer);
      };
      contentWindow.onafterprint = () => {
        window.clearTimeout(fallbackTimer);
        document.body.removeChild(iframe);
      };

      setTimeout(() => {
        contentWindow.focus();
        contentWindow.print();
      }, 100);
    };
  };

  const selectedAssignments = selectedService
    ? getNormalizedAssignments(selectedService)
    : { volunteers: [], preachers: [] };
  const eventTypeNameForSelected = selectedService
    ? eventTypes?.find((type) => type.id === selectedService.eventTypeId)?.name
    : null;
  const isCreateMode = !selectedService;
  const showCustomEventName =
    editEventTypeId === "" || !eventTypeNameForSelected;
  const isEventDirty =
    selectedService &&
    (editEventTitle.trim() !== (selectedService.title || "") ||
      (editEventTypeId || null) !== (selectedService.eventTypeId || null));

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
          {!canManageSchedules && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Você não tem permissão para editar o evento.
              </div>
            )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {viewMode === "list" && (
            <Button variant="outline" onClick={handleExportPeriodPdf}>
              <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
            </Button>
          )}
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
            <CalendarDays className="w-4 h-4 mr-1" /> Calendario
          </Button>

        {canManageSchedules && (
          <Button onClick={() => openQuickCreateDialog()}>
            <Plus className="w-4 h-4 mr-2" /> Nova Escala
          </Button>
        )}
        </div>
      </div>

      {viewMode === "list" && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={quickChip === "myPending" ? "default" : "outline"}
                onClick={() => applyQuickChip("myPending")}
              >
                Minhas pendentes ({chipCounts.myPending})
              </Button>
              <Button
                size="sm"
                variant={quickChip === "today" ? "default" : "outline"}
                onClick={() => applyQuickChip("today")}
              >
                Hoje ({chipCounts.today})
              </Button>
              <Button
                size="sm"
                variant={quickChip === "week" ? "default" : "outline"}
                onClick={() => applyQuickChip("week")}
              >
                Esta semana ({chipCounts.week})
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1 lg:col-span-2">
                <Label>Busca</Label>
                <Input
                  placeholder="Buscar por evento, pregador ou voluntario"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Tipo de evento</Label>
                <Select value={filterEventType} onValueChange={setFilterEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {eventTypes?.map((et) => (
                      <SelectItem key={et.id} value={et.id}>
                        {et.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Periodo</Label>
                <Select
                  value={filterTime}
                  onValueChange={(v) => setFilterTime(v as "all" | "future" | "past")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="future">Futuras</SelectItem>
                    <SelectItem value="past">Passadas</SelectItem>
                    <SelectItem value="all">Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Minha resposta</Label>
                <Select
                  value={filterStatus}
                  onValueChange={(v) =>
                    setFilterStatus(v as "all" | "pending" | "confirmed" | "declined")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="confirmed">Confirmadas</SelectItem>
                    <SelectItem value="declined">Recusadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>De</Label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Ate</Label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="filterMineOnly"
                  checked={filterMineOnly}
                  onCheckedChange={(value) => setFilterMineOnly(!!value)}
                />
                <Label htmlFor="filterMineOnly" className="text-sm">
                  Somente minhas escalas
                </Label>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-muted-foreground">
                {hasActiveFilters
                  ? `${activeFiltersCount} filtro(s) ativos`
                  : "Nenhum filtro ativo"}
              </p>
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Mode Toggle */}
      {viewMode === "list" && (
        filteredServices.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center space-y-3">
              <p className="font-medium">Nenhuma escala encontrada</p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Ajuste os filtros para encontrar escalas."
                  : "Crie uma escala para começar a organizar os eventos."}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : (
                canManageSchedules && (
                  <Button onClick={() => openQuickCreateDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar escala
                  </Button>
                )
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredServices.map((service) => {
              const my = myAssignment(service);
              const { volunteers: assignments, preachers: preacherAssignments } =
                getNormalizedAssignments(service);
              const eventType = eventTypes?.find((type) => type.id === service.eventTypeId);
              const eventTypeName = eventType?.name;
              const readableEventColor = getReadableEventColor(eventType?.color);
              const serviceTitle = getServiceTitle(service);
              const showEventType = !!eventTypeName && eventTypeName !== serviceTitle;

              return (
                <Card
                  key={service.id}
                  className="rounded-2xl border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md overflow-hidden"
                >
                <div className="h-1 bg-gradient-to-r from-primary/70 via-primary/30 to-transparent" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-2">
                      <CardTitle
                        className="text-xl font-semibold tracking-tight"
                        style={readableEventColor ? { color: readableEventColor } : undefined}
                      >
                        {serviceTitle}
                      </CardTitle>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                          {format(parseISO(service.date), "dd/MM/yyyy")}
                        </span>
                        {showEventType && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: eventType?.color || "#94a3b8" }}
                            />
                            {eventTypeName}
                          </span>
                        )}
                      </div>
                      <div>{getServiceSummaryBadge(service)}</div>
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
                          key={`${service.id}-${idx}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{getVolunteerName(a.volunteerId)}</span>
                          {getStatusBadge(a.status)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhum voluntario adicionado
                    </p>
                  )}

                  {preacherAssignments.length > 0 && (
                    <div className="pt-2 border-t space-y-1 text-sm">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Pregadores
                      </p>
                      {preacherAssignments.map((p, idx) => (
                        <div
                          key={`${service.id}-preacher-${idx}`}
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
        )
      )}

      {viewMode === "calendar" && (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2 p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
              >
                <ChevronLeft />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
                onClick={() => setCalendarMonth(new Date())}
              >
                Hoje
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Calendario</p>
              <h3 className="text-lg font-semibold capitalize text-foreground tracking-tight">
                {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
              </h3>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
            >
              <ChevronRight />
            </Button>
          </div>

          <div className="grid grid-cols-7 bg-muted/40 border-b border-border/60">
            {Array.from({ length: 7 }).map((_, idx) => {
              const baseDate = addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), idx);
              const labelShort = format(baseDate, "EEEEE", { locale: ptBR });
              const labelLong = format(baseDate, "EEE", { locale: ptBR });
              return (
                <div
                  key={`weekday-${idx}`}
                  className="px-1 sm:px-2 py-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground/80 text-center"
                >
                  <span className="sm:hidden">{labelShort}</span>
                  <span className="hidden sm:inline">{labelLong}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayServices = servicesForDay(day);
              const hasSchedules = dayServices.length > 0;
              const maxVisible = 3;
              const visible = dayServices.slice(0, maxVisible);
              const hiddenCount = dayServices.length - visible.length;

              return (
                <div
                  key={idx}
                  className={`border border-border/60 p-1 sm:p-2 min-h-[76px] sm:min-h-[120px] transition-colors ${
                    !isSameMonth(day, calendarMonth) ? "bg-muted/25 text-muted-foreground/45" : "bg-card"
                  } ${hasSchedules ? "shadow-inner shadow-primary/5" : ""} ${
                    isSameDay(day, new Date()) ? "ring-1 ring-primary/45 bg-primary/10" : ""
                  } ${canManageSchedules ? "cursor-pointer hover:bg-accent/40" : ""}`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] sm:text-xs font-semibold text-foreground">
                      {format(day, "d")}
                    </div>
                    {hasSchedules && (
                      <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                        {dayServices.length}
                      </span>
                    )}
                  </div>

                  <div className="hidden sm:block">
                    {visible.map((s) => {
                    const { preachers } = getNormalizedAssignments(s);
                    const preacherNames = preachers
                      .map((p) => getPreacherName(p.preacherId) || p.name)
                      .filter((name) => name && name !== "-")
                      .join(", ");
                    const eventType = eventTypes?.find((e) => e.id === s.eventTypeId);
                    const serviceTitle = getServiceTitle(s);
                    const eventTypeName = eventType?.name;
                    const readableEventColor = getReadableEventColor(eventType?.color);
                    const showEventType =
                      !!eventTypeName && eventTypeName !== serviceTitle;
                    const eventStyle = eventType?.color
                      ? {
                          borderLeftColor: eventType.color,
                          backgroundColor: `${eventType.color}10`,
                        }
                      : undefined;

                    return (
                      <div
                        key={s.id}
                        className="group relative text-[10px] sm:text-xs rounded-md px-2 py-1 mt-1 truncate border border-border/70 bg-background/65 shadow-[0_1px_4px_rgba(15,23,42,0.05)] border-l-2"
                        style={eventStyle}
                        title={getServiceTitle(s)}
                      >
                        {canDeleteService(s) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-0 top-0 h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteService(s);
                            }}
                            title="Excluir escala"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                        <span
                          className="block truncate font-medium"
                          style={readableEventColor ? { color: readableEventColor } : undefined}
                        >
                          {serviceTitle}
                        </span>
                        {showEventType && (
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] sm:text-[10px] text-muted-foreground">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: eventType?.color || "#94a3b8" }}
                            />
                            {eventTypeName}
                          </span>
                        )}
                        {preachers.length > 0 && (
                          <span className="block text-[9px] sm:text-[10px] text-muted-foreground truncate">
                            Pregador: {preacherNames || "Definido"}
                          </span>
                        )}
                      </div>
                    );
                    })}

                    {hiddenCount > 0 && (
                      <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        +{hiddenCount} escala{hiddenCount > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>

                  <div className="sm:hidden mt-1 space-y-1">
                    {visible.slice(0, 1).map((s) => {
                      const eventType = eventTypes?.find((e) => e.id === s.eventTypeId);
                      const readableEventColor = getReadableEventColor(eventType?.color);
                      return (
                        <div
                          key={s.id}
                          className="rounded-md px-1.5 py-1 text-[10px] font-medium truncate border border-border/70 bg-background/65"
                          style={readableEventColor ? { color: readableEventColor } : undefined}
                        >
                          {getServiceTitle(s)}
                        </div>
                      );
                    })}
                    {hiddenCount > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{hiddenCount} escala{hiddenCount > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DIALOG GESTÃO DE VOLUNTÁRIOS */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md w-[96vw] sm:w-[92vw] lg:w-[640px] max-h-[90dvh] overflow-hidden p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b bg-background">
            <DialogTitle>{isCreateMode ? "Nova escala" : "Gerenciar escala"}</DialogTitle>
            <DialogDescription>
              {selectedService ? (
                (() => {
                  const eventType = eventTypes?.find(
                    (type) => type.id === selectedService.eventTypeId
                  );
                  const readableEventColor = getReadableEventColor(eventType?.color);
                  return (
                    <span
                      style={readableEventColor ? { color: readableEventColor } : undefined}
                    >
                      {getServiceTitle(selectedService)}
                    </span>
                  );
                })()
              ) : newDate ? (
                <span className="text-muted-foreground">
                  {format(parseISO(newDate), "EEEE, dd/MM", { locale: ptBR })}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Defina a data e o evento para criar a escala.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[calc(90dvh-92px)] overflow-y-auto px-4 py-3">
            {isCreateMode ? (
              <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Evento
                </div>
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
                    placeholder="Ex: Reuniao Especial"
                    value={newCustomName}
                    onChange={(e) => setNewCustomName(e.target.value)}
                  />
                </div>

                <div className="space-y-2 border-t pt-2">
                  <div className="flex items-center justify-between">
                    <Label>Recorrencia</Label>
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
                      <Label htmlFor="r-none">Unica</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="daily" id="r-daily" />
                      <Label htmlFor="r-daily">Diaria</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="weekly" id="r-weekly" />
                      <Label htmlFor="r-weekly">Semanal</Label>
                    </div>
                  </RadioGroup>

                  {recurrenceType !== "none" && (
                    <div className="space-y-1">
                      <Label>Ate quando?</Label>
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

                <div className="flex justify-end">
                  <Button onClick={handleCreateService} disabled={isSavingCreate || !newDate}>
                    Criar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Evento
                </div>
                {canManageSchedules && (
                  <div className="space-y-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
                    <div className="space-y-1">
                      <Label>Tipo de evento</Label>
                      <Select value={editEventTypeId} onValueChange={setEditEventTypeId}>
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

                    {showCustomEventName && (
                      <div className="space-y-1">
                        <Label>Nome personalizado</Label>
                        <Input
                          placeholder="Ex: Reuniao Especial"
                          value={editEventTitle}
                          onChange={(e) => setEditEventTitle(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Deixe em branco para usar o tipo de evento.
                        </p>
                      </div>
                    )}

                    {isEventDirty && (
                      <Button onClick={handleUpdateServiceEvent} disabled={isSavingEvent}>
                        Salvar evento
                      </Button>
                    )}
                  </div>
                )}

                {!canManageSchedules && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Você não tem permissão para editar o evento.
                  </div>
                )}

                <Accordion
                  type="multiple"
                  defaultValue={
                    selectedAssignments.volunteers.length > 0 ||
                    selectedAssignments.preachers.length > 0
                      ? ["people"]
                      : []
                  }
                  className="rounded-2xl border border-border bg-card px-3 shadow-sm"
                >
                  <AccordionItem value="people" className="border-none">
                    <AccordionTrigger className="py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
                      Pessoas e atribuicoes
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                  <div className="space-y-2">
                    <Label>
                      Voluntários escalados ({selectedAssignments.volunteers.length})
                    </Label>

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
                        Nenhum voluntario adicionado
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Pregadores escalados ({selectedAssignments.preachers.length})
                    </Label>

                    {selectedAssignments.preachers.length > 0 ? (
                      <div className="space-y-2">
                        {selectedAssignments.preachers.map((p, idx) => {
                          const preacherRecord = preachers?.find(
                            (preacher) => preacher.id === p.preacherId
                          );
                          const preacherName = preacherRecord?.name || p.name || "-";

                          return (
                            <div
                              key={`preacher-${idx}`}
                              className="flex items-center justify-between gap-2 rounded-md border p-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{preacherName}</p>
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
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Você não tem permissão para editar pregadores.
                    </div>
                  )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {!canManageVolunteers && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Você não tem permissão para editar voluntários.
                  </div>
                )}

                {canManageVolunteers && (
                  <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Autoescala (beta)
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        Evento atual
                      </div>
                    </div>

                    {manageableMinistriesForAuto.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nenhum ministério disponível para geração automática.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {manageableMinistriesForAuto.map((ministry) => (
                          <div
                            key={`auto-slot-${ministry.id}`}
                            className="rounded-md border border-border p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">
                                {ministry.name}
                              </span>
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                value={autoMinistrySlots[ministry.id] ?? 0}
                                onChange={(e) =>
                                  handleAutoSlotChange(ministry.id, e.target.value)
                                }
                                className="h-8 w-20 text-center"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={generateAutoSuggestions}
                        disabled={isGeneratingAuto || manageableMinistriesForAuto.length === 0}
                      >
                        {isGeneratingAuto ? "Gerando..." : "Sugerir escala"}
                      </Button>
                      <Button
                        onClick={applyAutoSuggestions}
                        disabled={isApplyingAuto || autoSuggestions.length === 0}
                      >
                        {isApplyingAuto ? "Aplicando..." : "Aplicar sugestões"}
                      </Button>
                    </div>

                    {autoSuggestions.length > 0 && (
                      <div className="space-y-2 rounded-md border border-border p-2">
                        {autoSuggestions.map((suggestion) => (
                          <div
                            key={`auto-suggestion-${suggestion.ministryId}`}
                            className="rounded-md border border-border p-2"
                          >
                            <p className="text-sm font-medium">
                              {suggestion.ministryName} ({suggestion.suggestedVolunteerIds.length}/
                              {suggestion.requestedSlots})
                            </p>
                            {suggestion.suggestedVolunteerIds.length > 0 ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                {suggestion.suggestedVolunteerIds
                                  .map((volunteerId) => getVolunteerName(volunteerId))
                                  .join(", ")}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">
                                Nenhuma sugestão disponível.
                              </p>
                            )}
                            {suggestion.missingSlots > 0 && (
                              <p className="text-xs text-amber-600 mt-1">
                                {suggestion.missingSlots} vaga(s) sem preenchimento automático.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {canManageVolunteers && (
                  <div className="space-y-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Adicionar voluntario
                    </Label>
                    <Select value={selectedVolunteerId} onValueChange={setSelectedVolunteerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um voluntario" />
                      </SelectTrigger>
                      <SelectContent>
                        {volunteers?.map((v) => {
                          const unavailabilityEntry = getVolunteerUnavailability(
                            v.id,
                            selectedService?.date
                          );
                          const isUnavailable = !!unavailabilityEntry;
                          const reason = unavailabilityEntry?.reason?.trim();
                          const period = unavailabilityEntry
                            ? `${format(
                                parseISO(String(unavailabilityEntry.startDate)),
                                "dd/MM"
                              )} - ${format(
                                parseISO(String(unavailabilityEntry.endDate)),
                                "dd/MM"
                              )}`
                            : "";

                          return (
                            <SelectItem key={v.id} value={v.id} disabled={isUnavailable}>
                              <div className="flex flex-col">
                                <span className="text-sm">{v.name}</span>
                                {isUnavailable && (
                                  <span className="text-xs text-muted-foreground">
                                    Indisponivel ({period}
                                    {reason ? `: ${reason}` : ""})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={() => handleAddVolunteer()}
                      disabled={isSavingAssign}
                      className="w-full"
                    >
                      Adicionar
                    </Button>
                  </div>
                )}

                {canManagePreaching && (
                  <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Adicionar pregador
                    </Label>
                    <Input
                      placeholder="Buscar ou cadastrar pregador"
                      ref={preacherSearchRef}
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
                                className="flex items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0"
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
              </>
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
            {dayPickServices.map((service) => {
              const eventType = eventTypes?.find((type) => type.id === service.eventTypeId);
              const readableEventColor = getReadableEventColor(eventType?.color);
              const serviceTitle = getServiceTitle(service);
              const eventTypeName = eventType?.name;
              const showEventType = !!eventTypeName && eventTypeName !== serviceTitle;

              return (
              <div
                key={service.id}
                className="flex items-center justify-between gap-2 rounded-md border p-2"
              >
                <div className="min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={readableEventColor ? { color: readableEventColor } : undefined}
                  >
                    {serviceTitle}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(parseISO(service.date), "dd/MM/yyyy")}</span>
                    {showEventType && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: eventType?.color || "#94a3b8" }}
                        />
                        {eventTypeName}
                      </span>
                    )}
                  </div>
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
            )})}
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

