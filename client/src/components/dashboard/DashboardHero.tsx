import { CalendarDays, Building2 } from "lucide-react";

interface DashboardHeroProps {
  firstName: string;
  organizationName: string;
  isLoading: boolean;
}

export function DashboardHero({ firstName, organizationName, isLoading }: DashboardHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground shadow-lg px-6 py-5 md:px-8 md:py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wide">
            <CalendarDays className="w-3.5 h-3.5" />
            Gestão de Escalas
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">
            Olá, {isLoading ? "..." : firstName}
          </h1>
          <div className="flex flex-wrap gap-3 text-xs md:text-sm opacity-90">
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {organizationName || "—"}
            </span>
          </div>
        </div>
        <div className="text-xs md:text-sm bg-white/15 px-3 py-2 rounded-xl">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </div>
      </div>
    </section>
  );
}
