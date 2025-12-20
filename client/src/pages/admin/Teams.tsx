import { useVolunteerProfile, useTeams, useVolunteers } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UsersRound, User } from "lucide-react";

export default function Teams() {
  const { data: profile } = useVolunteerProfile();
  const { data: teams, isLoading } = useTeams(profile?.organizationId);
  const { data: volunteers } = useVolunteers(profile?.organizationId);

  const getMemberNames = (memberIds: any) => {
    if (!memberIds || !Array.isArray(memberIds) || !volunteers) return [];
    return memberIds
      .map(id => volunteers.find(v => v.id === id)?.name)
      .filter(Boolean);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UsersRound className="w-6 h-6 text-primary" />
            Equipes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as equipes de voluntários
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {teams?.length || 0} equipes
        </Badge>
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
    </div>
  );
}
