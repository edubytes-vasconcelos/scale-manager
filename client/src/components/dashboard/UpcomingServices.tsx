import { ServiceCard } from "@/components/ServiceCard";
import { LoadingCardGrid } from "@/components/LoadingCardGrid";
import type { Service, EventType } from "@shared/schema";

interface UpcomingServicesProps {
  services: Service[];
  eventTypes: EventType[] | undefined;
  volunteerId: string | undefined;
  isLoading: boolean;
}

export function UpcomingServices({
  services,
  eventTypes,
  volunteerId,
  isLoading,
}: UpcomingServicesProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">
        Próximos Cultos e Eventos
      </h2>

      {isLoading ? (
        <LoadingCardGrid count={4} height="h-48" columns={2} itemClassName="rounded-2xl bg-muted" />
      ) : services.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {services.map((service) => {
            const eventType = eventTypes?.find(
              (type) => type.id === service.eventTypeId
            );
            return (
              <ServiceCard
                key={service.id}
                service={service}
                volunteerId={volunteerId}
                showActions={false}
                eventTypeName={eventType?.name}
                eventTypeColor={eventType?.color}
              />
            );
          })}
        </div>
      ) : (
        <div className="py-16 rounded-3xl border border-dashed border-border text-center bg-card">
          <p className="font-medium">
            Nenhum evento encontrado
          </p>
          <p className="text-sm text-muted-foreground">
            As próximas escalas aparecerão aqui.
          </p>
        </div>
      )}
    </section>
  );
}
