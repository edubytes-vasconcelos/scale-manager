import { useMemo, useState } from "react";
import { useVolunteerProfile, useVolunteers, useMinistries } from "@/hooks/use-data";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import {
  Users,
  Mail,
  User,
  Shield,
  UserCog,
  UserCheck,
  Plus,
  Edit2,
  Church,
  Star,
  Loader2,
} from "lucide-react";

type MinistryAssignment = {
  ministryId: string;
  isLeader: boolean;
};

export default function Volunteers() {
  const { toast } = useToast();

  const { data: profile, isLoading: loadingProfile } = useVolunteerProfile();
  const { data: volunteers, isLoading } = useVolunteers(profile?.organizationId);
  const { data: ministries } = useMinistries(profile?.organizationId);

  /* ------------------------------------------------------------------
   * 🔐 PERMISSÕES (FONTE ÚNICA DA VERDADE)
   * ------------------------------------------------------------------ */
  const ministryAssignments: MinistryAssignment[] = useMemo(() => {
    if (!profile?.ministryAssignments) return [];
    if (!Array.isArray(profile.ministryAssignments)) return [];
    return profile.ministryAssignments;
  }, [profile]);

  const leaderMinistryIds = useMemo(
    () => ministryAssignments.filter(a => a.isLeader).map(a => a.ministryId),
    [ministryAssignments]
  );

  const isAdmin = profile?.accessLevel === "admin";
  const isLeader = leaderMinistryIds.length > 0;
  const canManageVolunteers = isAdmin || isLeader;

  /* ------------------------------------------------------------------
   * 🧪 DEBUG DEFINITIVO (pode remover depois)
   * ------------------------------------------------------------------ */
  console.group("🧪 PERMISSÕES VOLUNTÁRIOS");
  console.log("accessLevel:", profile?.accessLevel);
  console.log("ministryAssignments:", ministryAssignments);
  console.log("leaderMinistryIds:", leaderMinistryIds);
  console.log("isAdmin:", isAdmin);
  console.log("isLeader:", isLeader);
  console.log("canManageVolunteers:", canManageVolunteers);
  console.groupEnd();

  /* ------------------------------------------------------------------
   * 📋 FILTRAGEM DE VOLUNTÁRIOS
   * ------------------------------------------------------------------ */
  const visibleVolunteers = useMemo(() => {
    if (!volunteers) return [];
    if (isAdmin) return volunteers;

    return volunteers.filter((v: any) => {
      const assigns = Array.isArray(v.ministryAssignments)
        ? v.ministryAssignments
        : [];
      return assigns.some((a: any) => leaderMinistryIds.includes(a.ministryId));
    });
  }, [volunteers, isAdmin, leaderMinistryIds]);

  /* ------------------------------------------------------------------
   * ➕ ADD VOLUNTÁRIO
   * ------------------------------------------------------------------ */
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [selectedMinistryId, setSelectedMinistryId] = useState("");
  const [saving, setSaving] = useState(false);

  const allowedMinistries = useMemo(() => {
    if (!ministries) return [];
    if (isAdmin) return ministries;
    return ministries.filter((m: any) => leaderMinistryIds.includes(m.id));
  }, [ministries, isAdmin, leaderMinistryIds]);

  async function handleAddVolunteer() {
    if (!newEmail) {
      toast({ title: "Informe o e-mail", variant: "destructive" });
      return;
    }

    if (!isAdmin && !selectedMinistryId) {
      toast({
        title: "Selecione um ministério",
        description: "Você só pode adicionar voluntários nos ministérios que lidera.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const assignments: MinistryAssignment[] = [];

      if (!isAdmin) {
        assignments.push({
          ministryId: selectedMinistryId,
          isLeader: false,
        });
      }

      const { error } = await supabase.from("volunteers").insert({
        id: crypto.randomUUID(),
        email: newEmail.toLowerCase().trim(),
        name: newName || newEmail.split("@")[0],
        organization_id: profile?.organizationId,
        access_level: isAdmin ? "volunteer" : "volunteer",
        ministry_assignments: assignments,
      });

      if (error) throw error;

      toast({ title: "Voluntário adicionado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });

      setAddOpen(false);
      setNewEmail("");
      setNewName("");
      setSelectedMinistryId("");
    } catch (err: any) {
      toast({
        title: "Erro ao adicionar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------
   * 🧱 UI
   * ------------------------------------------------------------------ */
  if (loadingProfile) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando perfil...
      </div>
    );
  }

  return (
        <div className="flex justify-between items-center">
        <Button
          style={{ backgroundColor: "red", color: "white" }}
          onClick={() => alert("BOTÃO FORÇADO APARECEU")}
        >
          BOTÃO FORÇADO
        </Button>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Voluntários
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie os voluntários da sua organização
          </p>
        </div>
      </div>


        {canManageVolunteers && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar voluntário
          </Button>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div>Carregando...</div>
      ) : visibleVolunteers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum voluntário encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleVolunteers.map((v: any) => {
            const assigns: MinistryAssignment[] = Array.isArray(v.ministryAssignments)
              ? v.ministryAssignments
              : [];

            const isLeaderAny = assigns.some(a => a.isLeader);

            return (
              <Card key={v.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{v.name}</CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {v.email}
                        </p>
                      </div>
                    </div>

                    {isLeaderAny && (
                      <Badge className="bg-blue-500/10 text-blue-700">
                        <Star className="w-3 h-3 mr-1" />
                        Líder
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {assigns.map(a => {
                      const ministry = ministries?.find((m: any) => m.id === a.ministryId);
                      return (
                        <Badge
                          key={a.ministryId}
                          variant="outline"
                          className={a.isLeader ? "border-blue-400 text-blue-700" : ""}
                        >
                          <Church className="w-3 h-3 mr-1" />
                          {ministry?.name || "Desconhecido"}
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

      {/* Dialog Add */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar voluntário</DialogTitle>
            <DialogDescription>
              Cadastre um voluntário pelo e-mail
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Input
              placeholder="E-mail"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
            />

            <Input
              placeholder="Nome (opcional)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />

            {!isAdmin && (
              <Select
                value={selectedMinistryId}
                onValueChange={setSelectedMinistryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ministério" />
                </SelectTrigger>
                <SelectContent>
                  {allowedMinistries.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddVolunteer} disabled={saving}>
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
