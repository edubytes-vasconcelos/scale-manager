import { useState } from "react";
import { useVolunteerProfile, useEventTypes, useCreateEventType } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Sun, Moon, Star, Heart, Music, BookOpen, Users, Sparkles, Church, PartyPopper, Plus, Loader2 } from "lucide-react";

const iconOptions = [
  { value: "calendar", label: "Calendário", Icon: Calendar },
  { value: "sun", label: "Sol", Icon: Sun },
  { value: "moon", label: "Lua", Icon: Moon },
  { value: "star", label: "Estrela", Icon: Star },
  { value: "heart", label: "Coração", Icon: Heart },
  { value: "music", label: "Música", Icon: Music },
  { value: "book", label: "Livro", Icon: BookOpen },
  { value: "users", label: "Pessoas", Icon: Users },
  { value: "sparkles", label: "Brilho", Icon: Sparkles },
  { value: "church", label: "Igreja", Icon: Church },
  { value: "party", label: "Festa", Icon: PartyPopper },
];

const colorOptions = [
  { value: "#3b82f6", label: "Azul" },
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Amarelo" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#06b6d4", label: "Ciano" },
  { value: "#f97316", label: "Laranja" },
];

const iconMap: Record<string, any> = {
  sun: Sun,
  moon: Moon,
  star: Star,
  heart: Heart,
  music: Music,
  book: BookOpen,
  users: Users,
  sparkles: Sparkles,
  church: Church,
  party: PartyPopper,
  calendar: Calendar,
};

export default function EventTypes() {
  const { data: profile, isLoading: profileLoading } = useVolunteerProfile();
  const { data: eventTypes, isLoading } = useEventTypes(profile?.organizationId);
  const createEventType = useCreateEventType();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    icon: "calendar",
    color: "#3b82f6",
  });

  const canSubmit = !!profile?.organizationId && !createEventType.isPending;

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Calendar;
    return iconMap[iconName.toLowerCase()] || Calendar;
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
      await createEventType.mutateAsync({
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color,
        organizationId: profile.organizationId,
      });

      toast({
        title: "Sucesso",
        description: "Tipo de evento cadastrado com sucesso!",
      });

      setFormData({ name: "", icon: "calendar", color: "#3b82f6" });
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar",
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
            onClick={() => setDialogOpen(true)} 
            disabled={profileLoading || !profile?.organizationId}
            data-testid="button-add-event-type"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Tipo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : eventTypes && eventTypes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventTypes.map((eventType) => {
            const Icon = getIcon(eventType.icon);
            return (
              <Card key={eventType.id} data-testid={`card-event-type-${eventType.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ 
                        backgroundColor: eventType.color ? `${eventType.color}20` : 'hsl(var(--primary) / 0.1)',
                      }}
                    >
                      <Icon 
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
                          />
                          <span className="text-xs text-muted-foreground">{eventType.color}</span>
                        </div>
                      )}
                    </div>
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
            <DialogTitle>Novo Tipo de Evento</DialogTitle>
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
              <Label htmlFor="icon">Ícone</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger data-testid="select-event-type-icon">
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
                  {colorOptions.map((option) => (
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
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSubmit} data-testid="button-submit-event-type">
                {createEventType.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
