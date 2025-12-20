import { useVolunteerProfile, useEventTypes } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Sun, Moon, Star, Heart, Music, BookOpen, Users, Sparkles, Church, PartyPopper } from "lucide-react";

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
  const { data: profile } = useVolunteerProfile();
  const { data: eventTypes, isLoading } = useEventTypes(profile?.organizationId);

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Calendar;
    return iconMap[iconName.toLowerCase()] || Calendar;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Tipos de Evento
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os tipos de culto e eventos
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {eventTypes?.length || 0} tipos
        </Badge>
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
    </div>
  );
}
