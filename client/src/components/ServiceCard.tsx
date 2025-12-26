import { Service } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, CheckCircle2, Clock4, X, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ServiceCardProps {
  service: Service;
  volunteerId?: string | null;
}

export function ServiceCard({ service, volunteerId }: ServiceCardProps) {
  
  const date = new Date(service.date);
  const formattedDate = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  const formattedTime = format(date, "HH:mm", { locale: ptBR });
  
  const assignments = (service.assignments || []) as any[];
  const myAssignment = volunteerId 
    ? assignments.find((a: any) => a.volunteerId === volunteerId) 
    : null;
  const totalVolunteers = assignments.length;

  const getStatusBadge = () => {
    if (!myAssignment) return null;
    
    switch (myAssignment.status) {
      case 'confirmed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Confirmado
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
            <Clock4 className="w-3.5 h-3.5 mr-1" />
            Pendente
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
            <X className="w-3.5 h-3.5 mr-1" />
            Recusado
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="group relative overflow-hidden bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-medium text-sm mb-1 uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              {formattedDate}
            </div>
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              {service.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg w-fit">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{formattedTime}</span>
          </div>
        </div>
        
        <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{totalVolunteers} voluntário{totalVolunteers !== 1 ? 's' : ''}</span>
          </div>
          
          {myAssignment ? (
            getStatusBadge()
          ) : (
            <span className="text-sm text-muted-foreground">Você não está escalado</span>
          )}
        </div>
      </div>
      
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/0 group-hover:bg-primary transition-colors duration-300" />
    </div>
  );
}
