import { useVolunteerProfile, useMinistries } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Church, Music, Heart, BookOpen, Users, Mic2, Hand, Coffee, Baby, Sparkles } from "lucide-react";

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
  const { data: profile } = useVolunteerProfile();
  const { data: ministries, isLoading } = useMinistries(profile?.organizationId);

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Church;
    return iconMap[iconName.toLowerCase()] || Church;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Church className="w-6 h-6 text-primary" />
            Ministérios
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os ministérios da sua igreja
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {ministries?.length || 0} ministérios
        </Badge>
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{ministry.name}</CardTitle>
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
    </div>
  );
}
