import { useState } from "react";
import { useVolunteerProfile, useEventTypes, useCreateEventType, useUpdateEventType } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Loader2, Pencil } from "lucide-react";

const colorFamilies = [
  {
    label: "Azuis",
    options: [
      { value: "#3b82f6", label: "Azul" },
      { value: "#0ea5e9", label: "Azul claro" },
      { value: "#1d4ed8", label: "Azul escuro" },
    ],
  },
  {
    label: "Verdes",
    options: [
      { value: "#22c55e", label: "Verde" },
      { value: "#10b981", label: "Verde água" },
      { value: "#14b8a6", label: "Turquesa" },
      { value: "#84cc16", label: "Lima" },
    ],
  },
  {
    label: "Quentes",
    options: [
      { value: "#f59e0b", label: "Amarelo" },
      { value: "#f97316", label: "Laranja" },
      { value: "#ef4444", label: "Vermelho" },
      { value: "#e11d48", label: "Rosa escuro" },
      { value: "#ec4899", label: "Rosa" },
    ],
  },
  {
    label: "Neutros",
    options: [
      { value: "#64748b", label: "Cinza" },
      { value: "#0f172a", label: "Grafite" },
    ],
  },
  {
    label: "Roxos",
    options: [
      { value: "#8b5cf6", label: "Roxo" },
      { value: "#7c3aed", label: "Violeta" },
    ],
  },
  {
    label: "Cianos",
    options: [
      { value: "#06b6d4", label: "Ciano" },
    ],
  },
];

const colorOptions = colorFamilies.flatMap((family) => family.options);
export default function EventTypes() {
  const { data: profile, isLoading: profileLoading } = useVolunteerProfile();
  const { data: eventTypes, isLoading } = useEventTypes(profile?.organizationId);
  const createEventType = useCreateEventType();
  const updateEventType = useUpdateEventType();
  const { toast } = useToast();

  const canManageEventTypes =
    !!profile && (profile.accessLevel === "admin" || profile.canManagePreachingSchedule);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingEventTypeId, setEditingEventTypeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
  });
  const [customColor, setCustomColor] = useState("");

  const isSaving = createEventType.isPending || updateEventType.isPending;
  const canSubmit = canManageEventTypes && !!profile?.organizationId && !isSaving;

  const normalizeName = (value: string) => value.trim().toLowerCase();
  const normalizeHex = (value: string) => {
    const raw = value.trim();
    if (!raw) return "";
    const withoutHash = raw.replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(withoutHash)) return "";
    return `#${withoutHash.toLowerCase()}`;
  };
  const isPresetColor = (value: string) =>
    !!colorOptions.find((option) => option.value === value);
  const resolvedCustomColor =
    normalizeHex(customColor) || (!isPresetColor(formData.color) ? formData.color : "");

  const openCreateDialog = () => {
    setFormMode("create");
    setEditingEventTypeId(null);
    setFormData({ name: "", color: "#3b82f6" });
    setCustomColor("");
    setDialogOpen(true);
  };

  const openEditDialog = (eventType: { id: string; name: string; color?: string | null }) => {
    const colorValue = eventType.color || "#3b82f6";
    setFormMode("edit");
    setEditingEventTypeId(eventType.id);
    setFormData({
      name: eventType.name,
      color: colorValue,
    });
    setCustomColor(isPresetColor(colorValue) ? "" : colorValue);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.organizationId) return;

    const normalizedName = normalizeName(formData.name);
    if (!normalizedName) {
      toast({
        title: "Campo obrigatorio",
        description: "O nome eh obrigatorio.",
        variant: "destructive",
      });
      return;
    }

    const normalizedColor = normalizeHex(formData.color) || formData.color;
    if (!normalizedColor) {
      toast({
        title: "Cor invalida",
        description: "Informe uma cor valida no formato #RRGGBB.",
        variant: "destructive",
      });
      return;
    }

    const nameConflict = eventTypes?.some((et) => {
      if (editingEventTypeId && et.id === editingEventTypeId) return false;
      return normalizeName(et.name) === normalizedName;
    });

    if (nameConflict) {
      toast({
        title: "Nome ja utilizado",
        description: "Escolha um nome diferente para o tipo de evento.",
        variant: "destructive",
      });
      return;
    }

    const colorConflict = eventTypes?.some((et) => {
      if (editingEventTypeId && et.id === editingEventTypeId) return false;
      return et.color === normalizedColor;
    });

    if (colorConflict) {
      toast({
        title: "Cor ja utilizada",
        description: "Escolha outra cor para diferenciar os tipos de evento.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (formMode === "edit" && editingEventTypeId) {
        await updateEventType.mutateAsync({
          id: editingEventTypeId,
          name: formData.name.trim(),
          color: normalizedColor,
          organizationId: profile.organizationId,
        });
      } else {
        await createEventType.mutateAsync({
          name: formData.name.trim(),
          color: normalizedColor,
          organizationId: profile.organizationId,
        });
      }

      toast({
        title: "Sucesso",
        description:
          formMode === "edit"
            ? "Tipo de evento atualizado com sucesso!"
            : "Tipo de evento cadastrado com sucesso!",
      });

      setFormData({ name: "", color: "#3b82f6" });
      setCustomColor("");
      setDialogOpen(false);
      setEditingEventTypeId(null);
      setFormMode("create");
    } catch (error: any) {
      toast({
        title: formMode === "edit" ? "Erro ao atualizar" : "Erro ao cadastrar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Tipos de Evento
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os tipos de culto e eventos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {eventTypes?.length || 0} tipos
          </Badge>
          <Button 
            onClick={openCreateDialog} 
            disabled={profileLoading || !profile?.organizationId || !canManageEventTypes}
            data-testid="button-add-event-type"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Tipo
          </Button>
        </div>
      </div>

      {!profileLoading && profile && !canManageEventTypes && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Voce nao tem permissao para criar ou editar tipos de evento.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : eventTypes && eventTypes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventTypes.map((eventType) => (
            <Card key={eventType.id} data-testid={`card-event-type-${eventType.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ 
                        backgroundColor: eventType.color ? `${eventType.color}20` : 'hsl(var(--primary) / 0.1)',
                      }}
                    >
                      <Calendar 
                        className="w-5 h-5" 
                        style={{ color: eventType.color || 'hsl(var(--primary))' }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{eventType.name}</CardTitle>
                      {eventType.color && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: eventType.color }}
                            title={eventType.color}
                            aria-label={`Cor: ${colorOptions.find(c => c.value === eventType.color)?.label || eventType.color}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {colorOptions.find(c => c.value === eventType.color)?.label || "Personalizado"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(eventType)}
                    disabled={!canManageEventTypes}
                    title="Editar tipo"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Calendar className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-base font-medium text-foreground">Nenhum tipo de evento encontrado</p>
            <p className="text-muted-foreground text-sm">Adicione tipos de evento à sua organização.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formMode === "edit" ? "Editar Tipo de Evento" : "Novo Tipo de Evento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Culto Matutino, Culto Vespertino..."
                data-testid="input-event-type-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger data-testid="select-event-type-color">
                  <SelectValue placeholder="Selecione uma cor" />
                </SelectTrigger>
                <SelectContent>
                  {resolvedCustomColor && !isPresetColor(resolvedCustomColor) && (
                    <SelectItem value={resolvedCustomColor}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: resolvedCustomColor }}
                        />
                        Personalizada ({resolvedCustomColor})
                      </div>
                    </SelectItem>
                  )}
                  {colorFamilies.map((family) => (
                    <SelectGroup key={family.label}>
                      <SelectLabel>{family.label}</SelectLabel>
                      {family.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: option.value }}
                            />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customColor">Cor personalizada (hex)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="customColor"
                  value={customColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomColor(value);
                    const normalized = normalizeHex(value);
                    if (normalized) {
                      setFormData({ ...formData, color: normalized });
                    }
                  }}
                  placeholder="#1f2937"
                />
                <input
                  type="color"
                  aria-label="Selecionar cor personalizada"
                  className="h-9 w-9 rounded-md border border-input bg-background p-1"
                  value={resolvedCustomColor || "#000000"}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomColor(value);
                    setFormData({ ...formData, color: value });
                  }}
                />
                <div
                  className="w-8 h-8 rounded-md border"
                  style={{ backgroundColor: resolvedCustomColor || "transparent" }}
                  title={resolvedCustomColor || "Sem cor"}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use o formato #RRGGBB. Se valido, ele sera aplicado automaticamente.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSubmit} data-testid="button-submit-event-type">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  formMode === "edit" ? "Salvar alteracoes" : "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
