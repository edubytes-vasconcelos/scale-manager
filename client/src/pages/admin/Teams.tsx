import { useState } from "react";
import { useVolunteerProfile, useTeams, useVolunteers, useCreateTeam, useDeleteTeam } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { UsersRound, User, Plus, Loader2, Trash2 } from "lucide-react";

export default function Teams() {
  const { data: profile, isLoading: profileLoading } = useVolunteerProfile();
  const { data: teams, isLoading } = useTeams(profile?.organizationId);
  const { data: volunteers } = useVolunteers(profile?.organizationId);
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    memberIds: [] as string[],
  });

  const canSubmit = !!profile?.organizationId && !createTeam.isPending && formData.name.trim() !== "";

  const getMemberNames = (memberIds: any) => {
    if (!memberIds || !Array.isArray(memberIds) || !volunteers) return [];
    return memberIds
      .map(id => volunteers.find(v => v.id === id)?.name)
      .filter(Boolean);
  };

  const handleMemberToggle = (volunteerId: string) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(volunteerId)
        ? prev.memberIds.filter(id => id !== volunteerId)
        : [...prev.memberIds, volunteerId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.organizationId) return;
    if (!formData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome da equipe é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTeam.mutateAsync({
        name: formData.name.trim(),
        memberIds: formData.memberIds,
        organizationId: profile.organizationId,
      });

      toast({
        title: "Sucesso",
        description: "Equipe criada com sucesso!",
      });

      setFormData({ name: "", memberIds: [] });
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao criar equipe",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (teamId: string, teamName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a equipe "${teamName}"?`)) return;
    
    try {
      await deleteTeam.mutateAsync(teamId);
      toast({
        title: "Equipe excluída",
        description: "A equipe foi removida com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
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
            <UsersRound className="w-6 h-6 text-primary" />
            Equipes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as equipes de voluntários
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {teams?.length || 0} equipes
          </Badge>
          <Button 
            onClick={() => setDialogOpen(true)} 
            disabled={profileLoading || !profile?.organizationId}
            data-testid="button-add-team"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Equipe
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => {
            const memberNames = getMemberNames(team.memberIds);
            return (
              <Card key={team.id} data-testid={`card-team-${team.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <UsersRound className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{team.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {memberNames.length} membros
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(team.id, team.name)}
                      data-testid={`button-delete-team-${team.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                {memberNames.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      {memberNames.slice(0, 5).map((name, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <User className="w-2.5 h-2.5 mr-1" />
                          {name}
                        </Badge>
                      ))}
                      {memberNames.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{memberNames.length - 5} mais
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <UsersRound className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-base font-medium text-foreground">Nenhuma equipe encontrada</p>
            <p className="text-muted-foreground text-sm">Crie equipes para organizar seus voluntários.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Equipe</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nome da Equipe *</Label>
              <Input
                id="team-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Equipe de Louvor, Recepção..."
                data-testid="input-team-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Membros da Equipe</Label>
              <p className="text-xs text-muted-foreground">
                Selecione os voluntários que farão parte desta equipe
              </p>
              <ScrollArea className="h-48 border rounded-md p-3">
                {volunteers && volunteers.length > 0 ? (
                  <div className="space-y-2">
                    {volunteers.map((volunteer) => (
                      <label
                        key={volunteer.id}
                        className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                        data-testid={`checkbox-volunteer-${volunteer.id}`}
                      >
                        <Checkbox
                          checked={formData.memberIds.includes(volunteer.id)}
                          onCheckedChange={() => handleMemberToggle(volunteer.id)}
                        />
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{volunteer.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum voluntário cadastrado
                  </p>
                )}
              </ScrollArea>
              {formData.memberIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formData.memberIds.length} voluntário(s) selecionado(s)
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSubmit} data-testid="button-submit-team">
                {createTeam.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Equipe"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
