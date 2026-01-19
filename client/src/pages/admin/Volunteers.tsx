import { useState } from "react";
import {
  useVolunteerProfile,
  useVolunteers,
  useMinistries,
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
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
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

function renderMinistryIcon(icon: unknown) {
  if (!icon || typeof icon === "string") return null;
  return icon;
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
  const { toast } = useToast();

  const isAdmin = profile?.accessLevel === "admin";

  const leaderMinistryIds =
    profile?.ministryAssignments
      ?.filter((m) => m.isLeader)
      .map((m) => m.ministryId) || [];

  const isLeader = leaderMinistryIds.length > 0;

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
    setFormEmail(v.email);
    setFormWhatsapp(v.whatsapp || "");
    setFormCanManagePreaching(!!v.canManagePreachingSchedule);
    setFormAssignments(v.ministryAssignments || []);
    setFormOpen(true);
  };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit = async () => {
    if (!organizationId) return;

    if (!formName || !formEmail) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e e-mail são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (formAssignments.length === 0) {
      toast({
        title: "Ministério obrigatório",
        description: "Selecione ao menos um ministério.",
        variant: "destructive",
      });
      return;
    }

    const safeAssignments = isAdmin
      ? formAssignments
      : formAssignments.map((a) => ({ ...a, isLeader: false }));

    const canManagePreachingValue = isAdmin
      ? formCanManagePreaching
      : currentVolunteer?.canManagePreachingSchedule ?? false;

    setSaving(true);
    try {
      if (formMode === "add") {
        await supabase.from("volunteers").insert({
          id: crypto.randomUUID(),
          name: formName,
          email: formEmail.toLowerCase(),
          whatsapp: formWhatsapp || null,
          organization_id: organizationId,
          access_level: "volunteer",
          ministry_assignments: safeAssignments,
          can_manage_preaching_schedule: canManagePreachingValue,
        });
      } else if (currentVolunteer) {
        await supabase
          .from("volunteers")
          .update({
            name: formName,
            whatsapp: formWhatsapp || null,
            ministry_assignments: safeAssignments,
          })
          .eq("id", currentVolunteer.id);
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

    queryClient.invalidateQueries({
      queryKey: ["volunteers", organizationId],
    });

    setDeleteOpen(false);
    setVolunteerToDelete(null);
  };

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" /> Voluntários
        </h1>

        {(isAdmin || isLeader) && (
          <Button onClick={openAddForm}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleVolunteers?.map((v) => {
          const isActive = !!v.authUserId;
          const isVolunteerLeader = v.ministryAssignments?.some(
            (a) => a.isLeader
          );

          return (
            <Card
              key={v.id}
              className="group transition hover:shadow-md focus-within:shadow-md"
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
                  <CardTitle className="text-base truncate">
                    {v.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground truncate">
                    {v.email}
                  </p>
                </div>

                <div className="flex gap-1">
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
                  <Badge variant="secondary">
                    <UserCheck className="w-3 h-3 mr-1" />
                    Voluntário
                  </Badge>

                  <Badge
                    className={
                      isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
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
                  <Badge className="bg-indigo-100 text-indigo-800">
                    Gerencia prega‡Æo
                  </Badge>
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
                        className="text-xs flex items-center gap-1"
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
                E-mail <span className="text-destructive">*</span>
              </label>
              <Input
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                disabled={formMode === "edit"}
              />
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado após o cadastro.
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
                    Permite cadastrar e editar pregadores, al‚m de montar escalas de prega‡Æo.
                  </p>
                </div>
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

