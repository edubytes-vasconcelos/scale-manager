import { Service } from "@shared/schema"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Calendar,
  CheckCircle2,
  Clock4,
  X,
  Users,
  Check,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ServiceCardProps {
  service: Service
  volunteerId?: string | null

  /** callbacks opcionais (não quebram quem não usar) */
  onConfirm?: (serviceId: string) => void
  onDecline?: (serviceId: string) => void
}

export function ServiceCard({
  service,
  volunteerId,
  onConfirm,
  onDecline,
}: ServiceCardProps) {
  const date = parseISO(service.date)
  const formattedDate = format(date, "EEEE, d 'de' MMMM", {
    locale: ptBR,
  })

  const assignments = (service.assignments || []) as any[]
  const myAssignment = volunteerId
    ? assignments.find((a: any) => a.volunteerId === volunteerId)
    : null

  const totalVolunteers = assignments.length

  const renderStatus = () => {
    if (!myAssignment) {
      return (
        <span className="text-sm text-muted-foreground">
          Você não está escalado
        </span>
      )
    }

    switch (myAssignment.status) {
      case "confirmed":
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Confirmado
          </Badge>
        )

      case "pending":
        return (
          <Badge variant="warning">
            <Clock4 className="h-3.5 w-3.5" />
            Pendente
          </Badge>
        )

      case "declined":
        return (
          <Badge variant="destructive">
            <X className="h-3.5 w-3.5" />
            Recusado
          </Badge>
        )

      default:
        return null
    }
  }

  const renderCTA = () => {
    if (!myAssignment || myAssignment.status !== "pending") return null

    return (
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="success"
          size="sm"
          onClick={() => onConfirm?.(service.id)}
        >
          <Check className="h-4 w-4 mr-1" />
          Confirmar
        </Button>

        <Button
          variant="destructive-outline"
          size="sm"
          onClick={() => onDecline?.(service.id)}
        >
          <X className="h-4 w-4 mr-1" />
          Não irei
        </Button>
      </div>
    )
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30">
      <div className="p-6">
        {/* HEADER */}
        <div className="mb-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-primary">
            <Calendar className="h-4 w-4" />
            {formattedDate}
          </div>

          <h3 className="text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {service.title}
          </h3>
        </div>

        {/* INFO + STATUS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {totalVolunteers} voluntário
              {totalVolunteers !== 1 ? "s" : ""}
            </span>
          </div>

          {renderStatus()}
        </div>

        {/* CTA */}
        {renderCTA()}
      </div>

      {/* ACCENT */}
      <div className="absolute left-0 top-0 h-full w-1 bg-primary/0 transition-colors duration-300 group-hover:bg-primary" />
    </div>
  )
}
