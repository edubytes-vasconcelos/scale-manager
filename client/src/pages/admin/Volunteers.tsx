import { useMemo, useRef, useState } from "react";
import {
  useVolunteerProfile,
  useVolunteers,
  useMinistries,
  useVolunteerUnavailability,
  useCreateVolunteerUnavailability,
  useDeleteVolunteerUnavailability,
} from "@/hooks/use-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserCheck,
  Plus,
  Star,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { auditEvent } from "@/lib/audit";
import type { Volunteer, MinistryAssignment } from "@shared/schema";

/* =========================================================
   HELPERS
========================================================= */

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function maskWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function renderMinistryIcon(icon: string | null | undefined): React.ReactNode {
  if (!icon) return null;
  return null;
}

const accessLevelLabels: Record<string, string> = {
  admin: "Admin",
  leader: "Líder",
  volunteer: "Voluntário",
};

const accessLevelClasses: Record<string, string> = {
  admin:
    "!bg-emerald-100 !text-emerald-800 !border-emerald-200 dark:!bg-emerald-900/55 dark:!text-emerald-100 dark:!border-emerald-700",
  leader:
    "!bg-sky-100 !text-sky-800 !border-sky-200 dark:!bg-sky-900/55 dark:!text-sky-100 dark:!border-sky-700",
  volunteer:
    "!bg-slate-100 !text-slate-700 !border-slate-200 dark:!bg-slate-800 dark:!text-slate-100 dark:!border-slate-600",
};

function getAccessLevelBadge(accessLevel?: string | null) {
  const label = accessLevelLabels[accessLevel || "volunteer"] || "Voluntário";
  const className =
    accessLevelClasses[accessLevel || "volunteer"] || "bg-muted text-foreground";
  return { label, className };
}

/* =========================================================
   Volunteers Page
========================================================= */

type FormMode = "add" | "edit";

export default function Volunteers() {
  const { data: profile } = useVolunteerProfile();
  const organizationId = profile?.organizationId;

  const { data: volunteers, isLoading } = useVolunteers(organizationId);
  const { data: ministries } = useMinistries(organizationId);
  const { data: unavailability } = useVolunteerUnavailability(organizationId);
  const createUnavailability = useCreateVolunteerUnavailability();
  const deleteUnavailability = useDeleteVolunteerUnavailability();
  const { toast } = useToast();

  const isAdmin = profile?.accessLevel === "admin";

  const leaderMinistryIds =
    profile?.ministryAssignments
      ?.filter((m) => m.isLeader)
      .map((m) => m.ministryId) || [];

  const isLeader = leaderMinistryIds.length > 0;
  const canManageVolunteerRecords = isAdmin || isLeader;

  const availableMinistries = isAdmin
    ? ministries
    : ministries?.filter((m) => leaderMinistryIds.includes(m.id));

  const visibleVolunteers = (isAdmin
    ? volunteers
    : volunteers?.filter((v) =>
        v.ministryAssignments?.some((a) =>
          leaderMinistryIds.includes(a.ministryId)
        )
      )
  )?.slice();

  /* =========================
     FORM STATE
  ========================= */

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("add");
  const [currentVolunteer, setCurrentVolunteer] =
    useState<Volunteer | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formAssignments, setFormAssignments] =
    useState<MinistryAssignment[]>([]);
  const [formCanManagePreaching, setFormCanManagePreaching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ministryError, setMinistryError] = useState(false);
  const ministryBlockRef = useRef<HTMLDivElement | null>(null);
  const [unavailabilityStart, setUnavailabilityStart] = useState("");
  const [unavailabilityEnd, setUnavailabilityEnd] = useState("");
  const [unavailabilityReason, setUnavailabilityReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAccessLevel, setFilterAccessLevel] = useState("all");
  const [filterMinistry, setFilterMinistry] = useState("all");

  const currentUnavailability = useMemo(() => {
    if (!currentVolunteer?.id) return [];
    return (unavailability || []).filter(
      (entry) => entry.volunteerId === currentVolunteer.id
    );
  }, [unavailability, currentVolunteer?.id]);

  const filteredVolunteers = useMemo(() => {
    const list = visibleVolunteers || [];
    const term = searchTerm.trim().toLowerCase();
    return list.filter((vol) => {
      if (filterAccessLevel !== "all" && vol.accessLevel !== filterAccessLevel) {
        return false;
      }

      if (filterMinistry !== "all") {
        const hasMinistry = vol.ministryAssignments?.some(
          (a) => a.ministryId === filterMinistry
        );
        if (!hasMinistry) return false;
      }

      if (!term) return true;
      const haystack = `${vol.name} ${vol.email || ""} ${vol.whatsapp || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [visibleVolunteers, searchTerm, filterAccessLevel, filterMinistry]);

  /* =========================
     DELETE STATE
  ========================= */

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [volunteerToDelete, setVolunteerToDelete] =
    useState<Volunteer | null>(null);

  function canDeleteVolunteer(v: Volunteer) {
    if (v.accessLevel === "admin") return false;
    if (isAdmin) return true;
    if (!isLeader) return false;

    return v.ministryAssignments?.some(
      (a) => !a.isLeader && leaderMinistryIds.includes(a.ministryId)
    );
  }

  /* =========================
     OPEN FORMS
  ========================= */

  const openAddForm = () => {
    setFormMode("add");
    setCurrentVolunteer(null);
    setFormName("");
    setFormEmail("");
    setFormWhatsapp("");
    setFormCanManagePreaching(false);
    setUnavailabilityStart("");
    setUnavailabilityEnd("");
    setUnavailabilityReason("");
    setFormAssignments(
      !isAdmin && isLeader && leaderMinistryIds.length === 1
        ? [{ ministryId: leaderMinistryIds[0], isLeader: false }]
        : []
    );
    setFormOpen(true);
  };

  const openEditForm = (v: Volunteer) => {
    setFormMode("edit");
    setCurrentVolunteer(v);
    setFormName(v.name);
    setFormEmail(v.email || "");
    setFormWhatsapp(v.whatsapp || "");
    setFormCanManagePreaching(!!v.canManagePreachingSchedule);
    setFormAssignments(v.ministryAssignments || []);
    setUnavailabilityStart("");
    setUnavailabilityEnd("");
    setUnavailabilityReason("");
    setFormOpen(true);
  };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit = async () => {
    if (!organizationId) return;

    if (!formName.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    const hasEmail = !!formEmail.trim();
    const hasWhatsapp = !!formWhatsapp.trim();

    if (!hasEmail && !hasWhatsapp) {
      toast({
        title: "Contato obrigatório",
        description: "Informe um e-mail ou WhatsApp.",
        variant: "destructive",
      });
      return;
    }

    const requiresMinistry = !isAdmin || !formCanManagePreaching;
    if (requiresMinistry && formAssignments.length === 0) {
      setMinistryError(true);
      setTimeout(() => {
        ministryBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      toast({
        title: "Ministério obrigatório",
        description: "Selecione ao menos um ministerio.",
        variant: "destructive",
      });
      return;
    }

    setMinistryError(false);

const safeAssignments = isAdmin
      ? formAssignments
      : formAssignments.map((a) => ({ ...a, isLeader: false }));

    const canManagePreachingValue = isAdmin
      ? formCanManagePreaching
      : currentVolunteer?.canManagePreachingSchedule ?? false;

    setSaving(true);
    try {
      if (formMode === "add") {
        const createdVolunteerId = crypto.randomUUID();
        const { error } = await supabase.from("volunteers").insert({
          id: createdVolunteerId,
          name: formName,
          email: hasEmail ? formEmail.trim().toLowerCase() : null,
          whatsapp: formWhatsapp || null,
          organization_id: organizationId,
          access_level: "volunteer",
          ministry_assignments: safeAssignments,
          can_manage_preaching_schedule: canManagePreachingValue,
                });
        if (error) throw error;
        await auditEvent({
          organizationId,
          actorVolunteerId: profile?.id,
          action: "volunteer.create",
          entityType: "volunteer",
          entityId: createdVolunteerId,
          metadata: {
            name: formName,
            hasEmail,
            hasWhatsapp,
            ministryAssignments: safeAssignments,
            canManagePreachingSchedule: canManagePreachingValue,
          },
        });
      } else if (currentVolunteer) {
        const updateData: Record<string, any> = {
          name: formName,
          whatsapp: formWhatsapp || null,
          ministry_assignments: safeAssignments,
          can_manage_preaching_schedule: canManagePreachingValue,
        };
        if (!currentVolunteer.email && hasEmail) {
          updateData.email = formEmail.trim().toLowerCase();
        }

        const { error } = await supabase
          .from("volunteers")
          .update(updateData)
          .eq("id", currentVolunteer.id);
        if (error) throw error;
        await auditEvent({
          organizationId,
          actorVolunteerId: profile?.id,
          action: "volunteer.update",
          entityType: "volunteer",
          entityId: currentVolunteer.id,
          metadata: {
            name: formName,
            hasWhatsapp,
            ministryAssignments: safeAssignments,
            canManagePreachingSchedule: canManagePreachingValue,
          },
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["volunteers", organizationId],
      });

      setFormOpen(false);
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddUnavailability = async () => {
    if (!organizationId || !currentVolunteer?.id) return;
    if (!unavailabilityStart || !unavailabilityEnd) {
      toast({
        title: "Período obrigatório",
        description: "Informe a data inicial e final.",
        variant: "destructive",
      });
      return;
    }

    if (unavailabilityEnd < unavailabilityStart) {
      toast({
        title: "Período inválido",
        description: "A data final deve ser igual ou maior que a inicial.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createUnavailability.mutateAsync({
        organizationId,
        volunteerId: currentVolunteer.id,
        startDate: unavailabilityStart,
        endDate: unavailabilityEnd,
        reason: unavailabilityReason.trim() || null,
      });
      await auditEvent({
        organizationId,
        actorVolunteerId: profile?.id,
        action: "volunteer.unavailability.create",
        entityType: "volunteer",
        entityId: currentVolunteer.id,
        metadata: {
          startDate: unavailabilityStart,
          endDate: unavailabilityEnd,
          reason: unavailabilityReason.trim() || null,
        },
      });

      setUnavailabilityStart("");
      setUnavailabilityEnd("");
      setUnavailabilityReason("");
      toast({
        title: "Indisponibilidade registrada",
        description: "Periodo adicionado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUnavailability = async (id: string) => {
    if (!organizationId) return;
    try {
      await deleteUnavailability.mutateAsync({ id, organizationId });
      await auditEvent({
        organizationId,
        actorVolunteerId: profile?.id,
        action: "volunteer.unavailability.delete",
        entityType: "volunteer_unavailability",
        entityId: id,
      });
      toast({
        title: "Indisponibilidade removida",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  /* =========================
     DELETE
  ========================= */

  const handleDeleteVolunteer = async () => {
    if (!volunteerToDelete || !organizationId) return;

    const today = new Date().toISOString();

    const { data } = await supabase
      .from("services")
      .select("id")
      .gte("date", today)
      .contains("assignments", [{ volunteer_id: volunteerToDelete.id }])
      .eq("organization_id", organizationId);

    if (data?.length) {
      toast({
        title: "Não é possível excluir",
        description: "Este voluntário possui escalas futuras.",
        variant: "destructive",
      });
      return;
    }

    await supabase
      .from("volunteers")
      .delete()
      .eq("id", volunteerToDelete.id);
    await auditEvent({
      organizationId,
      actorVolunteerId: profile?.id,
      action: "volunteer.delete",
      entityType: "volunteer",
      entityId: volunteerToDelete.id,
      metadata: {
        name: volunteerToDelete.name,
      },
    });

    queryClient.invalidateQueries({
      queryKey: ["volunteers", organizationId],
    });

    setDeleteOpen(false);
    setVolunteerToDelete(null);
  };

  const requiresMinistry = !isAdmin || !formCanManagePreaching;
  const hasMinistry = formAssignments.length > 0;

  const toggleMinistry = (ministryId: string) => {
    setFormAssignments((prev) => {
      const exists = prev.some((a) => a.ministryId === ministryId);
      if (exists) return prev.filter((a) => a.ministryId !== ministryId);
      return [...prev, { ministryId, isLeader: false }];
    });
  };

  const toggleMinistryLeader = (ministryId: string, isLeader: boolean) => {
    setFormAssignments((prev) =>
      prev.map((a) =>
        a.ministryId === ministryId ? { ...a, isLeader } : a
      )
    );
  };

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground dark:text-slate-100 flex items-center gap-2">
          <Users className="w-6 h-6" /> Voluntários
        </h1>

        {canManageVolunteerRecords && (
          <Button onClick={openAddForm}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        )}
      </div>

      {!canManageVolunteerRecords && (
        <p className="text-xs text-muted-foreground">
          Você tem acesso somente de leitura.
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Buscar por nome, email ou WhatsApp"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
          <Select value={filterAccessLevel} onValueChange={setFilterAccessLevel}>
            <SelectTrigger className="w-full sm:w-40 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="leader">Líder</SelectItem>
              <SelectItem value="volunteer">Voluntário</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterMinistry} onValueChange={setFilterMinistry}>
            <SelectTrigger className="w-full sm:w-52 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100">
              <SelectValue placeholder="Ministério" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ministérios</SelectItem>
              {availableMinistries?.map((ministry) => (
                <SelectItem key={ministry.id} value={ministry.id}>
                  {ministry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
          {filteredVolunteers.length} voluntários
        </Badge>
      </div>

      {!isLoading && (!filteredVolunteers || filteredVolunteers.length === 0) ? (
        <Card className="border-dashed border-border bg-card">
          <CardContent className="py-8 text-center space-y-3">
            <p className="font-medium">
              {searchTerm || filterAccessLevel !== "all" || filterMinistry !== "all"
                ? "Nenhum voluntário encontrado"
                : "Nenhum voluntário cadastrado"}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || filterAccessLevel !== "all" || filterMinistry !== "all"
                ? "Tente ajustar os filtros para ver mais resultados."
                : "Cadastre o primeiro voluntário para começar a montar as escalas."}
            </p>
            {canManageVolunteerRecords && (
              <Button onClick={openAddForm}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar voluntário
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVolunteers?.map((v) => {
          const isActive = !!v.authUserId;
          const isVolunteerLeader = v.ministryAssignments?.some(
            (a) => a.isLeader
          );
          const effectiveAccessLevel =
            v.accessLevel === "admin"
              ? "admin"
              : isVolunteerLeader || v.accessLevel === "leader"
                ? "leader"
                : "volunteer";
          const accessBadge = getAccessLevelBadge(effectiveAccessLevel);
          const accessBadgeLabel =
            isVolunteerLeader
              ? "Líder de ministério"
              : accessBadge.label;

          return (
            <Card
              key={v.id}
              className="group rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden transition hover:shadow-md focus-within:shadow-md dark:bg-slate-900/70 dark:border-slate-700/70 dark:hover:border-slate-600"
            >
              <CardHeader className="flex flex-row gap-3 pb-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                    {getInitials(v.name)}
                  </div>

                  {isVolunteerLeader && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="absolute -bottom-1 -right-1 bg-background border rounded-full p-0.5">
                          <Star className="w-3 h-3 opacity-70" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Líder de ministério</TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate text-foreground dark:text-slate-200" title={v.name}>
                    {v.name}
                  </CardTitle>
                  <p
                    className="text-sm text-muted-foreground dark:text-slate-300 truncate"
                    title={v.email || undefined}
                  >
                    {v.email}
                  </p>
                </div>

                <div className="flex gap-1">
                  {canManageVolunteerRecords && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                          onClick={() => openEditForm(v)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>
                  )}

                  {canDeleteVolunteer(v) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition text-destructive"
                          onClick={() => {
                            setVolunteerToDelete(v);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={accessBadge.className}>
                    <UserCheck className="w-3 h-3 mr-1" />
                    {accessBadgeLabel}
                  </Badge>

                  <Badge
                    variant="outline"
                    className={
                      isActive
                        ? "!bg-green-100 !text-green-800 !border-green-200 dark:!bg-emerald-900/55 dark:!text-emerald-100 dark:!border-emerald-700"
                        : "!bg-yellow-100 !text-yellow-800 !border-yellow-200 dark:!bg-amber-900/55 dark:!text-amber-100 dark:!border-amber-700"
                    }
                  >
                    {isActive ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Ativo
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 mr-1" />
                        Aguardando
                      </>
                    )}
                  </Badge>
                </div>

                {v.canManagePreachingSchedule && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="!bg-indigo-100 !text-indigo-800 !border-indigo-200 dark:!bg-violet-900/55 dark:!text-violet-100 dark:!border-violet-700">
                        Gerencia pregação
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Permite cadastrar e editar pregadores, além de montar escalas
                      de pregação.
                    </TooltipContent>
                  </Tooltip>
                )}

                <div className="flex flex-wrap gap-1">
                  {v.ministryAssignments?.map((a) => {
                    const ministry = ministries?.find(
                      (m) => m.id === a.ministryId
                    );
                    if (!ministry) return null;

                    return (
                      <Badge
                        key={a.ministryId}
                        variant="outline"
                        className="text-xs flex items-center gap-1 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                      >
                        {renderMinistryIcon(ministry.icon)}
                        {ministry.name}
                        {a.isLeader && (
                          <Star className="w-3 h-3 opacity-60 ml-1" />
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}

      {/* DELETE */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir voluntário
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteVolunteer}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FORM */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === "add"
                ? "Adicionar voluntário"
                : "Editar voluntário"}
            </DialogTitle>
            <DialogDescription>
              {formMode === "add"
                ? "Preencha os dados do novo voluntário"
                : "Atualize os dados do voluntário"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Nome completo <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ex: João da Silva"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                E-mail
              </label>
              <Input
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                disabled={formMode === "edit" && !!formEmail}
              />
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado após o cadastro. Se estiver vazio,
                você poderá informar depois.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">WhatsApp</label>
              <Input
                placeholder="(11) 91234-5678"
                value={formWhatsapp}
                onChange={(e) =>
                  setFormWhatsapp(maskWhatsapp(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">
                Informe ao menos e-mail ou WhatsApp.
              </p>
            </div>

            {isAdmin && (
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={formCanManagePreaching}
                  onCheckedChange={(checked) =>
                    setFormCanManagePreaching(!!checked)
                  }
                />
                <div>
                  <p className="text-sm font-medium">
                    Pode gerenciar escala de pregadores
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permite cadastrar e editar pregadores, além de montar escalas
                    de pregação.
                  </p>
                </div>
              </div>
            )}


            <div
              ref={ministryBlockRef}
              className={[
                "space-y-2 rounded-lg border p-3",
                requiresMinistry && !hasMinistry ? "border-destructive bg-destructive/5" : "",
                ministryError ? "ring-1 ring-destructive/60" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Ministérios {requiresMinistry && <span className="text-destructive">*</span>}
                </label>
                {requiresMinistry && !hasMinistry && (
                  <span className="text-xs text-destructive">Obrigatório</span>
                )}
              </div>

              {availableMinistries && availableMinistries.length > 0 ? (
                <div className="space-y-2">
                  {availableMinistries.map((ministry) => {
                    const isSelected = formAssignments.some(
                      (a) => a.ministryId === ministry.id
                    );
                    const isLeaderAssignment =
                      formAssignments.find((a) => a.ministryId === ministry.id)
                        ?.isLeader || false;

                    return (
                      <div
                        key={ministry.id}
                        className={[
                          "flex items-start justify-between gap-3 rounded-md border p-2",
                          ministryError && requiresMinistry && !hasMinistry
                            ? "border-destructive/60 bg-destructive/5"
                            : isSelected
                            ? "border-primary/40 bg-primary/5"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => { setMinistryError(false); toggleMinistry(ministry.id); }}
                          />
                          <div>
                            <p className="text-sm font-medium flex items-center gap-2">
                              {renderMinistryIcon(ministry.icon)}
                              {ministry.name}
                            </p>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Checkbox
                              checked={isLeaderAssignment}
                              disabled={!isSelected}
                              onCheckedChange={(checked) =>
                                toggleMinistryLeader(ministry.id, !!checked)
                              }
                            />
                            <span>Lider</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhum ministerio cadastrado.
                </p>
              )}
            </div>

            {formMode === "edit" && currentVolunteer && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Indisponibilidades</label>
                  <Badge variant="outline" className="text-xs">
                    {currentUnavailability.length}
                  </Badge>
                </div>

                {currentUnavailability.length > 0 ? (
                  <div className="space-y-2">
                    {currentUnavailability.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {format(parseISO(String(entry.startDate)), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}{" "}
                            -{" "}
                            {format(parseISO(String(entry.endDate)), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
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
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma indisponibilidade registrada.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Inicio</label>
                    <Input
                      type="date"
                      value={unavailabilityStart}
                      onChange={(e) => setUnavailabilityStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Fim</label>
                    <Input
                      type="date"
                      value={unavailabilityEnd}
                      onChange={(e) => setUnavailabilityEnd(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Motivo</label>
                    <Input
                      placeholder="Ex: Viagem"
                      value={unavailabilityReason}
                      onChange={(e) => setUnavailabilityReason(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="button"
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
            )}

          </div>

          <DialogFooter>
            <Button disabled={saving} onClick={handleSubmit}>
              {saving && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


