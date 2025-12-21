import { useState, useMemo } from "react";
import { useVolunteerProfile, useVolunteers, useEventTypes, useServices, useTeams } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Plus, Loader2, Users, User, Check, X, Clock, Trash2, UsersRound, Repeat } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { format, addDays, addWeeks, isBefore, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Service, ServiceAssignment, MinistryAssignment, Team } from "@shared/schema";

export default function Schedules() {
  const { data: profile } = useVolunteerProfile();
  const { data: services, isLoading } = useServices(profile?.organizationId);
  const { data: volunteers } = useVolunteers(profile?.organizationId);
  const { data: eventTypes } = useEventTypes(profile?.organizationId);
  const { data: teams } = useTeams(profile?.organizationId);
  const { toast } = useToast();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newDate, setNewDate] = useState("");
  const [newEventTypeId, setNewEventTypeId] = useState("");
  const [newCustomName, setNewCustomName] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<"none" | "daily" | "weekly">("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  
  const [assignmentType, setAssignmentType] = useState<"volunteer" | "team">("volunteer");
  const [selectedVolunteerId, setSelectedVolunteerId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const isAdmin = profile?.accessLevel === "admin";
  
  const isLeaderInAnyMinistry = useMemo(() => {
    if (!profile?.ministryAssignments) return false;
    const assignments = profile.ministryAssignments as MinistryAssignment[];
    return assignments.some(a => a.isLeader);
  }, [profile?.ministryAssignments]);
  
  const isLeader = profile?.accessLevel === "leader" || isLeaderInAnyMinistry;
  const isAdminOrLeader = isAdmin || isLeader;

  const leaderMinistryIds = useMemo(() => {
    if (!profile?.ministryAssignments) return [];
    const assignments = profile.ministryAssignments as MinistryAssignment[];
    return assignments.filter(a => a.isLeader).map(a => a.ministryId);
  }, [profile?.ministryAssignments]);

  const filteredVolunteers = useMemo(() => {
    if (!volunteers) return [];
    if (isAdmin) return volunteers;
    
    if (isLeader && leaderMinistryIds.length > 0) {
      return volunteers.filter(v => {
        if (!v.ministryAssignments) return false;
        const vAssignments = v.ministryAssignments as MinistryAssignment[];
        return vAssignments.some(a => leaderMinistryIds.includes(a.ministryId));
      });
    }
    
    return [];
  }, [volunteers, isAdmin, isLeader, leaderMinistryIds]);

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    if (isAdmin) return teams;
    
    if (isLeader && leaderMinistryIds.length > 0) {
      return teams.filter(team => {
        const memberIds = (team.memberIds || []) as string[];
        if (memberIds.length === 0) return false;
        
        return memberIds.some(memberId => {
          const volunteer = volunteers?.find(v => v.id === memberId);
          if (!volunteer?.ministryAssignments) return false;
          const vAssignments = volunteer.ministryAssignments as MinistryAssignment[];
          return vAssignments.some(a => leaderMinistryIds.includes(a.ministryId));
        });
      });
    }
    
    return [];
  }, [teams, volunteers, isAdmin, isLeader, leaderMinistryIds]);

  const getMaxEndDate = () => {
    if (!newDate) return "";
    const startDate = new Date(newDate);
    if (recurrenceType === "daily") {
      return format(addDays(startDate, 15), "yyyy-MM-dd");
    } else if (recurrenceType === "weekly") {
      return format(addMonths(startDate, 3), "yyyy-MM-dd");
    }
    return "";
  };

  const getMinEndDate = () => {
    if (!newDate) return "";
    const startDate = new Date(newDate);
    if (recurrenceType === "daily") {
      return format(addDays(startDate, 1), "yyyy-MM-dd");
    } else if (recurrenceType === "weekly") {
      return format(addWeeks(startDate, 1), "yyyy-MM-dd");
    }
    return "";
  };

  const handleCreateService = async () => {
    if (!isAdminOrLeader) return;
    
    if (!newDate) {
      toast({
        title: "Campo obrigatório",
        description: "Informe a data do evento.",
        variant: "destructive",
      });
      return;
    }

    if (!newEventTypeId && !newCustomName.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione um tipo de evento ou informe um nome personalizado.",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.organizationId) return;

    const eventType = eventTypes?.find(e => e.id === newEventTypeId);
    const title = newCustomName.trim() || eventType?.name || "Evento";

    setIsSaving(true);
    try {
      const dates: string[] = [newDate];
      
      if (recurrenceType !== "none" && recurrenceEndDate) {
        const startDate = new Date(newDate);
        const endDate = new Date(recurrenceEndDate);
        let currentDate = recurrenceType === "daily" 
          ? addDays(startDate, 1) 
          : addWeeks(startDate, 1);
        
        while (isBefore(currentDate, endDate) || format(currentDate, "yyyy-MM-dd") === recurrenceEndDate) {
          dates.push(format(currentDate, "yyyy-MM-dd"));
          currentDate = recurrenceType === "daily" 
            ? addDays(currentDate, 1) 
            : addWeeks(currentDate, 1);
        }
      }

      const servicesToCreate = dates.map(date => ({
        id: crypto.randomUUID(),
        date,
        title,
        event_type_id: newEventTypeId || null,
        organization_id: profile.organizationId,
        assignments: [],
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("services")
        .insert(servicesToCreate);

      if (error) throw error;

      toast({
        title: dates.length > 1 ? `${dates.length} escalas criadas!` : "Escala criada!",
        description: dates.length > 1 
          ? `As escalas foram criadas de ${format(new Date(dates[0]), "dd/MM")} até ${format(new Date(dates[dates.length - 1]), "dd/MM")}.`
          : "A escala foi criada com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ["services"] });
      setCreateDialogOpen(false);
      resetCreateForm();
    } catch (error: any) {
      toast({
        title: "Erro ao criar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetCreateForm = () => {
    setNewDate("");
    setNewEventTypeId("");
    setNewCustomName("");
    setRecurrenceType("none");
    setRecurrenceEndDate("");
  };

  const handleAddAssignment = async () => {
    if (!isAdminOrLeader) return;
    if (!selectedService) return;
    
    if (assignmentType === "volunteer" && !selectedVolunteerId) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione um voluntário.",
        variant: "destructive",
      });
      return;
    }

    if (assignmentType === "team" && !selectedTeamId) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione uma equipe.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const currentAssignments = (selectedService.assignments || []) as ServiceAssignment[];
      let newAssignments: ServiceAssignment[] = [];

      if (assignmentType === "volunteer") {
        if (!isAdmin && !filteredVolunteers.some(v => v.id === selectedVolunteerId)) {
          toast({
            title: "Acesso negado",
            description: "Você não tem permissão para escalar este voluntário.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
        
        const alreadyAssigned = currentAssignments.some(a => a.volunteerId === selectedVolunteerId);
        if (alreadyAssigned) {
          toast({
            title: "Voluntário já escalado",
            description: "Este voluntário já está nesta escala.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
        newAssignments = [{
          volunteerId: selectedVolunteerId,
          status: "pending",
        }];
      } else {
        if (!isAdmin && !filteredTeams.some(t => t.id === selectedTeamId)) {
          toast({
            title: "Acesso negado",
            description: "Você não tem permissão para escalar esta equipe.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
        
        const team = filteredTeams.find(t => t.id === selectedTeamId);
        let memberIds = (team?.memberIds || []) as string[];
        
        if (memberIds.length === 0) {
          toast({
            title: "Equipe vazia",
            description: "Esta equipe não possui membros cadastrados.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
        
        if (!isAdmin && leaderMinistryIds.length > 0) {
          memberIds = memberIds.filter(memberId => {
            const volunteer = volunteers?.find(v => v.id === memberId);
            if (!volunteer?.ministryAssignments) return false;
            const vAssignments = volunteer.ministryAssignments as MinistryAssignment[];
            return vAssignments.some(a => leaderMinistryIds.includes(a.ministryId));
          });
        }
        
        for (const memberId of memberIds) {
          if (!currentAssignments.some(a => a.volunteerId === memberId)) {
            newAssignments.push({
              volunteerId: memberId,
              status: "pending",
            });
          }
        }

        if (newAssignments.length === 0) {
          toast({
            title: "Todos já escalados",
            description: "Todos os membros da equipe já estão nesta escala.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
      }

      const updatedAssignments = [...currentAssignments, ...newAssignments];

      const { error } = await supabase
        .from("services")
        .update({ assignments: updatedAssignments })
        .eq("id", selectedService.id);

      if (error) throw error;
      
      toast({
        title: assignmentType === "team" ? "Equipe adicionada!" : "Voluntário adicionado!",
        description: assignmentType === "team" 
          ? `${newAssignments.length} membro(s) foram escalados.`
          : "O voluntário foi escalado com sucesso.",
      });

      setSelectedService({
        ...selectedService,
        assignments: updatedAssignments,
      });
      
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setSelectedVolunteerId("");
      setSelectedTeamId("");
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

  const handleRemoveVolunteer = async (volunteerId: string) => {
    if (!isAdminOrLeader) return;
    if (!selectedService) return;

    setIsSaving(true);
    try {
      const currentAssignments = (selectedService.assignments || []) as ServiceAssignment[];
      const updatedAssignments = currentAssignments.filter(a => a.volunteerId !== volunteerId);

      const { error } = await supabase
        .from("services")
        .update({ assignments: updatedAssignments })
        .eq("id", selectedService.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["services"] });
      
      setSelectedService({
        ...selectedService,
        assignments: updatedAssignments,
      });

      toast({
        title: "Voluntário removido",
        description: "O voluntário foi removido da escala.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!isAdminOrLeader) return;
    if (!confirm("Tem certeza que deseja excluir esta escala?")) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({
        title: "Escala excluída",
        description: "A escala foi excluída com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getVolunteerName = (volunteerId: string) => {
    const volunteer = volunteers?.find(v => v.id === volunteerId);
    return volunteer?.name || "Desconhecido";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500/10 text-green-700 border-green-200"><Check className="w-3 h-3 mr-1" />Confirmado</Badge>;
      case "declined":
        return <Badge className="bg-red-500/10 text-red-700 border-red-200"><X className="w-3 h-3 mr-1" />Recusado</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  const openAssignDialog = (service: Service) => {
    setSelectedService(service);
    setAssignDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Escalas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as escalas de voluntários
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-sm">
            {services?.length || 0} escalas
          </Badge>
          {isAdminOrLeader && (
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-schedule">
              <Plus className="w-4 h-4 mr-2" />
              Nova Escala
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : services && services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => {
            const eventType = eventTypes?.find(e => e.id === service.eventTypeId);
            const assignments = (service.assignments || []) as ServiceAssignment[];
            
            return (
              <Card key={service.id} data-testid={`card-schedule-${service.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center min-w-[50px] py-2 px-3 bg-primary/10 rounded-lg text-center">
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          {format(new Date(service.date), "MMM", { locale: ptBR })}
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {format(new Date(service.date), "dd")}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-base">{service.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(service.date), "EEEE", { locale: ptBR })}
                        </p>
                        {eventType && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {eventType.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isAdminOrLeader && (
                      <div className="flex items-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => openAssignDialog(service)}
                          data-testid={`button-manage-${service.id}`}
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteService(service.id)}
                          data-testid={`button-delete-${service.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{assignments.length} voluntário(s) escalado(s)</span>
                    </div>
                    {assignments.length > 0 && (
                      <div className="space-y-1 pt-2 border-t">
                        {assignments.slice(0, 3).map((assignment, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span>{getVolunteerName(assignment.volunteerId || "")}</span>
                            </div>
                            {getStatusBadge(assignment.status)}
                          </div>
                        ))}
                        {assignments.length > 3 && (
                          <p className="text-xs text-muted-foreground pt-1">
                            + {assignments.length - 3} mais...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <CalendarDays className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-base font-medium text-foreground">Nenhuma escala encontrada</p>
            <p className="text-muted-foreground text-sm text-center mt-1">
              {isAdminOrLeader ? "Crie a primeira escala pelo botão acima." : "Não há escalas cadastradas."}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Escala</DialogTitle>
            <DialogDescription>
              Crie uma nova escala de voluntários
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  setRecurrenceEndDate("");
                }}
                min={format(new Date(), "yyyy-MM-dd")}
                data-testid="input-schedule-date"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Evento</label>
              <Select 
                value={newEventTypeId} 
                onValueChange={(val) => {
                  setNewEventTypeId(val);
                  if (val) setNewCustomName("");
                }}
              >
                <SelectTrigger data-testid="select-event-type">
                  <SelectValue placeholder="Selecione um tipo" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Personalizado</label>
              <Input
                type="text"
                placeholder="Ex: Reunião Especial"
                value={newCustomName}
                onChange={(e) => {
                  setNewCustomName(e.target.value);
                  if (e.target.value) setNewEventTypeId("");
                }}
                data-testid="input-custom-name"
              />
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium">Recorrência</label>
              </div>
              <RadioGroup 
                value={recurrenceType} 
                onValueChange={(val) => {
                  setRecurrenceType(val as "none" | "daily" | "weekly");
                  setRecurrenceEndDate("");
                }}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="text-sm">Única</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="daily" />
                  <Label htmlFor="daily" className="text-sm">Diária</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly" className="text-sm">Semanal</Label>
                </div>
              </RadioGroup>

              {recurrenceType !== "none" && newDate && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Até quando? 
                    <span className="text-muted-foreground font-normal ml-1">
                      (máx. {recurrenceType === "daily" ? "15 dias" : "3 meses"})
                    </span>
                  </label>
                  <Input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    min={getMinEndDate()}
                    max={getMaxEndDate()}
                    data-testid="input-recurrence-end"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              resetCreateForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateService} disabled={isSaving} data-testid="button-save-schedule">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Escala"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Voluntários</DialogTitle>
            <DialogDescription>
              {selectedService?.title} - {selectedService?.date && format(new Date(selectedService.date), "dd/MM/yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup 
              value={assignmentType} 
              onValueChange={(val) => setAssignmentType(val as "volunteer" | "team")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="volunteer" id="volunteer" />
                <Label htmlFor="volunteer" className="text-sm flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Voluntário
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="team" />
                <Label htmlFor="team" className="text-sm flex items-center gap-1">
                  <UsersRound className="w-3.5 h-3.5" /> Equipe
                </Label>
              </div>
            </RadioGroup>

            {assignmentType === "volunteer" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Selecionar Voluntário</label>
                <Select value={selectedVolunteerId} onValueChange={setSelectedVolunteerId}>
                  <SelectTrigger data-testid="select-volunteer">
                    <SelectValue placeholder="Selecione um voluntário" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredVolunteers.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLeader && filteredVolunteers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum voluntário vinculado aos seus ministérios.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Selecionar Equipe</label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger data-testid="select-team">
                    <SelectValue placeholder="Selecione uma equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({((t.memberIds || []) as string[]).length} membros)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleAddAssignment} disabled={isSaving} className="w-full" data-testid="button-add-to-schedule">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar à Escala
                </>
              )}
            </Button>

            {selectedService?.assignments && (selectedService.assignments as ServiceAssignment[]).length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <h4 className="text-sm font-medium">Voluntários Escalados</h4>
                {(selectedService.assignments as ServiceAssignment[]).map((assignment, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{getVolunteerName(assignment.volunteerId || "")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(assignment.status)}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleRemoveVolunteer(assignment.volunteerId || "")}
                        data-testid={`button-remove-${assignment.volunteerId}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
