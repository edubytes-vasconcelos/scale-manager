import { useState } from "react";
import { useVolunteerProfile, useVolunteers, useEventTypes, useServices } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Plus, Loader2, Users, User, Check, X, Clock, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Service, ServiceAssignment, Volunteer } from "@shared/schema";

export default function Schedules() {
  const { data: profile } = useVolunteerProfile();
  const { data: services, isLoading } = useServices(profile?.organizationId);
  const { data: volunteers } = useVolunteers(profile?.organizationId);
  const { data: eventTypes } = useEventTypes(profile?.organizationId);
  const { toast } = useToast();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newDate, setNewDate] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newEventTypeId, setNewEventTypeId] = useState("");
  
  const [selectedVolunteerId, setSelectedVolunteerId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const isAdminOrLeader = profile?.accessLevel === "admin" || profile?.accessLevel === "leader";

  const handleCreateService = async () => {
    if (!isAdminOrLeader) return;
    
    if (!newDate || !newTitle.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe a data e o título do evento.",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.organizationId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("services")
        .insert({
          id: crypto.randomUUID(),
          date: newDate,
          title: newTitle.trim(),
          event_type_id: newEventTypeId || null,
          organization_id: profile.organizationId,
          assignments: [],
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Escala criada!",
        description: "A escala foi criada com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ["services"] });
      setCreateDialogOpen(false);
      setNewDate("");
      setNewTitle("");
      setNewEventTypeId("");
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

  const handleAddVolunteer = async () => {
    if (!isAdminOrLeader) return;
    
    if (!selectedVolunteerId || !selectedRole.trim() || !selectedService) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um voluntário e informe a função.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const currentAssignments = (selectedService.assignments || []) as ServiceAssignment[];
      
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

      const newAssignment: ServiceAssignment = {
        volunteerId: selectedVolunteerId,
        role: selectedRole.trim(),
        status: "pending",
      };

      const { error } = await supabase
        .from("services")
        .update({
          assignments: [...currentAssignments, newAssignment],
        })
        .eq("id", selectedService.id);

      if (error) throw error;

      const updatedAssignments = [...currentAssignments, newAssignment];
      
      toast({
        title: "Voluntário adicionado!",
        description: "O voluntário foi escalado com sucesso.",
      });

      setSelectedService({
        ...selectedService,
        assignments: updatedAssignments,
      });
      
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setSelectedVolunteerId("");
      setSelectedRole("");
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
                              <span className="text-muted-foreground">- {assignment.role}</span>
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
        <DialogContent>
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
                onChange={(e) => setNewDate(e.target.value)}
                data-testid="input-schedule-date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input
                type="text"
                placeholder="Ex: Culto de Sábado"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                data-testid="input-schedule-title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Evento (opcional)</label>
              <Select value={newEventTypeId} onValueChange={setNewEventTypeId}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
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
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Voluntário</label>
                <Select value={selectedVolunteerId} onValueChange={setSelectedVolunteerId}>
                  <SelectTrigger data-testid="select-volunteer">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {volunteers?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Função</label>
                <Input
                  type="text"
                  placeholder="Ex: Recepção"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  data-testid="input-volunteer-role"
                />
              </div>
            </div>
            <Button onClick={handleAddVolunteer} disabled={isSaving} className="w-full" data-testid="button-add-to-schedule">
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
                      <span className="text-sm text-muted-foreground">- {assignment.role}</span>
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
