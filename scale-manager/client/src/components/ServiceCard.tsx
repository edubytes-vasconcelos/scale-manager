import { Service } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const [rsvpState, setRsvpState] = useState<"idle" | "confirmed">("idle");
  const { toast } = useToast();
  
  const date = new Date(service.date);
  const formattedDate = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  const formattedTime = format(date, "HH:mm", { locale: ptBR });

  const handleRSVP = () => {
    // In a real app, this would be a Supabase mutation
    setRsvpState("confirmed");
    toast({
      title: "Presença confirmada!",
      description: `Você confirmou presença para ${service.title}.`,
      className: "bg-green-50 border-green-200 text-green-900",
    });
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
        
        <div className="pt-4 border-t border-border/50 flex justify-end">
          <button
            onClick={handleRSVP}
            disabled={rsvpState === "confirmed"}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300
              ${rsvpState === "confirmed" 
                ? "bg-green-100 text-green-700 cursor-default" 
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-95"}
            `}
          >
            {rsvpState === "confirmed" ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirmado
              </>
            ) : (
              "Confirmar Presença"
            )}
          </button>
        </div>
      </div>
      
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/0 group-hover:bg-primary transition-colors duration-300" />
    </div>
  );
}
