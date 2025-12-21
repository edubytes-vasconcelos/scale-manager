import { useState } from "react";
import { useVolunteerProfile, useVolunteers } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Mail, Shield, UserCheck, UserCog, User, Loader2, Edit2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import type { Volunteer } from "@shared/schema";

export default function Volunteers() {
  const { data: profile, isLoading: profileLoading } = useVolunteerProfile();
  const { data: volunteers, isLoading } = useVolunteers(profile?.organizationId);
  const { toast } = useToast();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [newAccessLevel, setNewAccessLevel] = useState("volunteer");
  const [isSaving, setIsSaving] = useState(false);
  
  const [newVolunteerName, setNewVolunteerName] = useState("");
  const [newVolunteerEmail, setNewVolunteerEmail] = useState("");
  const [newVolunteerAccessLevel, setNewVolunteerAccessLevel] = useState("volunteer");

  const isAdmin = profile?.accessLevel === "admin";

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

  const handleEditClick = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setNewAccessLevel(volunteer.accessLevel || "volunteer");
    setEditDialogOpen(true);
  };

  const handleSaveAccessLevel = async () => {
    if (!selectedVolunteer) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("volunteers")
        .update({ access_level: newAccessLevel })
        .eq("id", selectedVolunteer.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Nível de acesso atualizado!",
      });

      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
      setEditDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVolunteer = async () => {
    if (!newVolunteerEmail.trim()) {
      toast({
        title: "E-mail obrigatório",
        description: "Informe o e-mail do voluntário.",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.organizationId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("volunteers")
        .insert({
          id: crypto.randomUUID(),
          name: newVolunteerName.trim() || newVolunteerEmail.split("@")[0],
          email: newVolunteerEmail.trim().toLowerCase(),
          access_level: newVolunteerAccessLevel,
          organization_id: profile.organizationId,
        });

      if (error) throw error;

      toast({
        title: "Voluntário adicionado",
        description: "Quando a pessoa se cadastrar com este e-mail, será vinculada automaticamente.",
      });

      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
      setAddDialogOpen(false);
      setNewVolunteerName("");
      setNewVolunteerEmail("");
      setNewVolunteerAccessLevel("volunteer");
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-sm">
            {volunteers?.length || 0} cadastrados
          </Badge>
          {isAdmin && (
            <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-volunteer">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          )}
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
                  {isAdmin && (
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => handleEditClick(volunteer)}
                      data-testid={`button-edit-volunteer-${volunteer.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between gap-2">
                  {getAccessLevelBadge(volunteer.accessLevel)}
                  {!volunteer.authUserId && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                      Pendente
                    </Badge>
                  )}
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
            <p className="text-muted-foreground text-sm text-center mt-1">
              {isAdmin ? "Adicione voluntários pelo botão acima." : "Os voluntários aparecem aqui após se registrarem."}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Voluntário</DialogTitle>
            <DialogDescription>
              Altere o nível de acesso de {selectedVolunteer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nível de Acesso</label>
              <Select
                value={newAccessLevel}
                onValueChange={setNewAccessLevel}
              >
                <SelectTrigger data-testid="select-edit-access">
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteer">Voluntário</SelectItem>
                  <SelectItem value="leader">Líder</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAccessLevel} disabled={isSaving} data-testid="button-save-access">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Voluntário</DialogTitle>
            <DialogDescription>
              Cadastre um voluntário pelo e-mail. Quando ele se registrar, será vinculado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                placeholder="voluntario@email.com"
                value={newVolunteerEmail}
                onChange={(e) => setNewVolunteerEmail(e.target.value)}
                data-testid="input-new-volunteer-email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome (opcional)</label>
              <Input
                type="text"
                placeholder="Nome do voluntário"
                value={newVolunteerName}
                onChange={(e) => setNewVolunteerName(e.target.value)}
                data-testid="input-new-volunteer-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nível de Acesso</label>
              <Select
                value={newVolunteerAccessLevel}
                onValueChange={setNewVolunteerAccessLevel}
              >
                <SelectTrigger data-testid="select-new-access">
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteer">Voluntário</SelectItem>
                  <SelectItem value="leader">Líder</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddVolunteer} disabled={isSaving} data-testid="button-save-new-volunteer">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Adicionar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
