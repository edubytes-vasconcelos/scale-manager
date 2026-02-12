import { Clock, CheckCircle2, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DashboardStatsProps {
  pendingCount: number;
  confirmedCount: number;
  totalCount: number;
  nextWeekStats: { pending: number; confirmed: number };
  hasNextWeekSchedules: boolean;
  onConfirmClick: () => void;
}

export function DashboardStats({
  pendingCount,
  confirmedCount,
  totalCount,
  nextWeekStats,
  hasNextWeekSchedules,
  onConfirmClick,
}: DashboardStatsProps) {
  if (totalCount === 0) return null;

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="warning">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Pendentes {pendingCount}
          </Badge>
          <Badge variant="success">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Confirmadas {confirmedCount}
          </Badge>
          <Badge variant="info">
            <CalendarDays className="w-3.5 h-3.5 mr-1" />
            Total {totalCount}
          </Badge>
        </div>

        {pendingCount > 0 && (
          <Button size="sm" onClick={onConfirmClick}>
            Confirmar escalas
          </Button>
        )}
      </section>

      {hasNextWeekSchedules && (
        <div className="text-xs text-muted-foreground">
          Próximos 7 dias:{" "}
          <span className="font-medium text-foreground">
            {nextWeekStats.pending} pendente(s)
          </span>{" "}
          •{" "}
          <span className="font-medium text-foreground">
            {nextWeekStats.confirmed} confirmada(s)
          </span>
        </div>
      )}
    </>
  );
}
