import { useState } from "react";
import { useVolunteerProfile, useMinistries, useCreateMinistry, useUpdateMinistry } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Church, Music, Heart, BookOpen, Users, Mic2, Hand, Coffee, Baby, Sparkles, Plus, Loader2, Pencil } from "lucide-react";

const iconOptions = [
  { value: "church", label: "Igreja", Icon: Church },
  { value: "music", label: "Música", Icon: Music },
  { value: "heart", label: "Coração", Icon: Heart },
  { value: "book", label: "Livro", Icon: BookOpen },
  { value: "users", label: "Pessoas", Icon: Users },
  { value: "mic", label: "Microfone", Icon: Mic2 },
  { value: "hand", label: "Mão", Icon: Hand },
  { value: "coffee", label: "Café", Icon: Coffee },
  { value: "baby", label: "Bebê", Icon: Baby },
  { value: "sparkles", label: "Estrelas", Icon: Sparkles },
];

const iconMap: Record<string, any> = {
  music: Music,
  heart: Heart,
  book: BookOpen,
  users: Users,
  mic: Mic2,
  hand: Hand,
  coffee: Coffee,
  baby: Baby,
  sparkles: Sparkles,
  church: Church,
};

export default function Ministries() {
  const { data: profile, isLoading: profileLoading } = useVolunteerProfile();
  const { data: ministries, isLoading } = useMinistries(profile?.organizationId);
  const createMinistry = useCreateMinistry();
  const updateMinistry = useUpdateMinistry();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingMinistryId, setEditingMinistryId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    icon: "church",
  });

  const isSaving = createMinistry.isPending || updateMinistry.isPending;
  const canSubmit = !!profile?.organizationId && !isSaving;

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Church;
    return iconMap[iconName.toLowerCase()] || Church;
  };

  const openCreateDialog = () => {
    setFormMode("create");
    setEditingMinistryId(null);
    setFormData({ name: "", icon: "church" });
    setDialogOpen(true);
  };

  const openEditDialog = (ministry: { id: string; name: string; icon?: string | null }) => {
    setFormMode("edit");
    setEditingMinistryId(ministry.id);
    setFormData({
      name: ministry.name,
      icon: ministry.icon || "church",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.organizationId) return;
    if (!formData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (formMode === "edit" && editingMinistryId) {
        await updateMinistry.mutateAsync({
          id: editingMinistryId,
          name: formData.name.trim(),
          icon: formData.icon,
          organizationId: profile.organizationId,
        });
      } else {
        await createMinistry.mutateAsync({
          name: formData.name.trim(),
          icon: formData.icon,
          organizationId: profile.organizationId,
        });
      }

      toast({
        title: "Sucesso",
        description:
          formMode === "edit"
            ? "Ministério atualizado com sucesso!"
            : "Ministério cadastrado com sucesso!",
      });

      setFormData({ name: "", icon: "church" });
      setDialogOpen(false);
      setEditingMinistryId(null);
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
            <Church className="w-6 h-6 text-primary" />
            Ministérios
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os ministérios da sua igreja
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {ministries?.length || 0} ministérios
          </Badge>
          <Button 
            onClick={openCreateDialog} 
            disabled={profileLoading || !profile?.organizationId}
            data-testid="button-add-ministry"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Ministério
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : ministries && ministries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ministries.map((ministry) => {
            const Icon = getIcon(ministry.icon);
            return (
              <Card key={ministry.id} data-testid={`card-ministry-${ministry.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <CardTitle className="text-base">{ministry.name}</CardTitle>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(ministry)}
                      title="Editar ministério"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Church className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-base font-medium text-foreground">Nenhum ministério encontrado</p>
            <p className="text-muted-foreground text-sm">Adicione ministérios à sua organização.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formMode === "edit" ? "Editar Ministério" : "Novo Ministério"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Louvor, Recepção, Infantil..."
                data-testid="input-ministry-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Ícone</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger data-testid="select-ministry-icon">
                  <SelectValue placeholder="Selecione um ícone" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.Icon className="w-4 h-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSubmit} data-testid="button-submit-ministry">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  formMode === "edit" ? "Salvar alterações" : "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
