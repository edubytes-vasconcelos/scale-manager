import { Service } from "@shared/schema"
import { normalizeAssignments } from "@/lib/assignments"
import { getReadableEventColor } from "@/lib/color"
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
  showActions?: boolean
  eventTypeName?: string | null
  eventTypeColor?: string | null

  /** callbacks opcionais (não quebram quem não usar) */
  onConfirm?: (serviceId: string) => void
  onDecline?: (serviceId: string) => void
}

export function ServiceCard({
  service,
  volunteerId,
  showActions = true,
  eventTypeName,
  eventTypeColor,
  onConfirm,
  onDecline,
}: ServiceCardProps) {
  const date = parseISO(service.date)
  const formattedDate = format(date, "EEEE, d 'de' MMMM", {
    locale: ptBR,
  })

  const { volunteers, preachers } = normalizeAssignments(service.assignments)
  const myAssignment = volunteerId
    ? volunteers.find((a: any) => a.volunteerId === volunteerId)
    : null

  const totalVolunteers = volunteers.length
  const readableEventColor = getReadableEventColor(eventTypeColor)
  const displayTitle = service.title?.trim() || eventTypeName || formattedDate
  const showEventType = !!eventTypeName && eventTypeName !== displayTitle
  const preacherNames = preachers
    .map((p) => p.name)
    .filter((name) => name && name !== "-")
    .join(", ")

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
    if (!showActions) return null
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
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-primary/30 to-transparent" />
      <div className="p-6">
        {/* HEADER */}
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <Calendar className="h-4 w-4 text-slate-500" />
              {formattedDate}
            </span>
            {showEventType && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: eventTypeColor || "#94a3b8" }}
                />
                {eventTypeName}
              </span>
            )}
          </div>

          <h3
            className="text-2xl font-semibold tracking-tight text-slate-900 leading-tight"
            style={readableEventColor ? { color: readableEventColor } : undefined}
          >
            {displayTitle}
          </h3>
        </div>

        {/* INFO + STATUS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-4">
          <div className="space-y-1 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <span>
                {totalVolunteers} voluntário
                {totalVolunteers !== 1 ? "s" : ""}
              </span>
            </div>

            {preachers.length > 0 && (
              <div className="text-xs text-slate-500">
                Pregador: {preacherNames || "Definido"}
              </div>
            )}
          </div>

          {renderStatus()}
        </div>

        {/* CTA */}
        {renderCTA()}
      </div>
    </div>
  )
}
