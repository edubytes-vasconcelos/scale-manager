import { Card, CardContent } from "@/components/ui/card";

interface NextScheduleCardProps {
  title: string;
  date: string;
  eventTypeName?: string;
  statusBadge: React.ReactNode;
  formatDate: (date: string) => string;
}

export function NextScheduleCard({
  title,
  date,
  eventTypeName,
  statusBadge,
  formatDate,
}: NextScheduleCardProps) {
  return (
    <section>
      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-primary uppercase">
              Próximo compromisso
            </p>
            <p className="font-semibold truncate">{title}</p>
            <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
            {eventTypeName && (
              <p className="text-xs text-muted-foreground">{eventTypeName}</p>
            )}
          </div>
          {statusBadge}
        </CardContent>
      </Card>
    </section>
  );
}
