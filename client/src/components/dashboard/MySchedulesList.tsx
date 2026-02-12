import { ClipboardCheck, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingCardGrid } from "@/components/LoadingCardGrid";
import type { Service, EventType } from "@shared/schema";

type Schedule = Service;

interface MySchedulesListProps {
  schedules: Schedule[];
  eventTypes: EventType[] | undefined;
  filter: "all" | "pending" | "confirmed";
  onFilterChange: (filter: "all" | "pending" | "confirmed") => void;
  onConfirm: (scheduleId: string) => void;
  onDecline: (scheduleId: string) => void;
  isLoading: boolean;
  getStatus: (schedule: Schedule) => string | null;
  getStatusBadge: (schedule: Schedule) => React.ReactNode;
  formatDate: (date: string) => string;
}

export function MySchedulesList({
  schedules,
  eventTypes,
  filter,
  onFilterChange,
  onConfirm,
  onDecline,
  isLoading,
  getStatus,
  getStatusBadge,
  formatDate,
}: MySchedulesListProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Minhas Escalas
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => onFilterChange("all")}
          >
            Todas
          </Button>
          <Button
            size="sm"
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => onFilterChange("pending")}
          >
            Pendentes
          </Button>
          <Button
            size="sm"
            variant={filter === "confirmed" ? "default" : "outline"}
            onClick={() => onFilterChange("confirmed")}
          >
            Confirmadas
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingCardGrid count={3} height="h-20" columns={1} itemClassName="rounded-xl bg-muted" />
      ) : schedules.length > 0 ? (
        <div className="space-y-3">
          {schedules.map((schedule) => {
            const eventType = eventTypes?.find(
              (type) => type.id === schedule.eventTypeId
            );
            return (
              <div
                key={schedule.id}
                className="rounded-2xl border border-border bg-card p-4 flex flex-wrap justify-between gap-4 transition hover:-translate-y-0.5 hover:shadow-md overflow-hidden"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{schedule.title}</p>
                    {eventType?.name && (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: eventType.color || undefined,
                          color: eventType.color || undefined,
                        }}
                      >
                        {eventType.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(schedule.date)}
                  </p>
                </div>

                <div className="flex gap-2 items-center">
                  {getStatus(schedule) === "pending" ? (
                    <>
                      <Button
                        variant="success"
                        onClick={() => onConfirm(schedule.id)}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Confirmar
                      </Button>
                      <Button
                        variant="destructive-outline"
                        onClick={() => onDecline(schedule.id)}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Não irei
                      </Button>
                    </>
                  ) : (
                    getStatusBadge(schedule)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 rounded-2xl border border-dashed border-border text-center bg-card">
          <p className="font-medium text-foreground">
            Nenhuma escala atribuída ainda
          </p>
          <p className="text-sm text-muted-foreground">
            Quando houver um evento, ele aparecerá aqui.
          </p>
        </div>
      )}
    </section>
  );
}
