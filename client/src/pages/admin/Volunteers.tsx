import { useState } from "react";
import { useVolunteerProfile, useVolunteers, useCreateVolunteer } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Mail, Shield, UserCheck, UserCog, User, Plus, Loader2, Phone } from "lucide-react";

export default function Volunteers() {
  const { data: profile, isLoading: profileLoading } = useVolunteerProfile();
  const { data: volunteers, isLoading } = useVolunteers(profile?.organizationId);
  const createVolunteer = useCreateVolunteer();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    accessLevel: "volunteer",
  });

  const canSubmit = !!profile?.organizationId && !createVolunteer.isPending;

  const getAccessLevelBadge = (level: string | null) => {
    switch (level) {
      case "admin":
        return <Badge className="bg-purple-500/10 text-purple-700 border-purple-200"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case "leader":
        return <Badge className="bg-blue-500/10 text-blue-700 border-blue-200"><UserCog className="w-3 h-3 mr-1" />Líder</Badge>;
      default:
        return <Badge variant="secondary"><UserCheck className="w-3 h-3 mr-1" />Voluntário</Badge>;
    }
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
      await createVolunteer.mutateAsync({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        accessLevel: formData.accessLevel,
        organizationId: profile.organizationId,
      });

      toast({
        title: "Sucesso",
        description: "Voluntário cadastrado com sucesso!",
      });

      setFormData({ name: "", email: "", phone: "", accessLevel: "volunteer" });
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
            <Users className="w-6 h-6 text-primary" />
            Voluntários
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os voluntários da sua organização
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {volunteers?.length || 0} cadastrados
          </Badge>
          <Button 
            onClick={() => setDialogOpen(true)} 
            disabled={profileLoading || !profile?.organizationId}
            data-testid="button-add-volunteer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Voluntário
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : volunteers && volunteers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {volunteers.map((volunteer) => (
            <Card key={volunteer.id} data-testid={`card-volunteer-${volunteer.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{volunteer.name}</CardTitle>
                      {volunteer.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {volunteer.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between gap-2">
                  {getAccessLevelBadge(volunteer.accessLevel)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-base font-medium text-foreground">Nenhum voluntário encontrado</p>
            <p className="text-muted-foreground text-sm">Adicione voluntários à sua organização.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Voluntário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
                data-testid="input-volunteer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="pl-10"
                  data-testid="input-volunteer-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="pl-10"
                  data-testid="input-volunteer-phone"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessLevel">Nível de Acesso</Label>
              <Select
                value={formData.accessLevel}
                onValueChange={(value) => setFormData({ ...formData, accessLevel: value })}
              >
                <SelectTrigger data-testid="select-volunteer-access">
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteer">Voluntário</SelectItem>
                  <SelectItem value="leader">Líder</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSubmit} data-testid="button-submit-volunteer">
                {createVolunteer.isPending ? (
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
