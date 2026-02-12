import { useState } from "react";
import { Clock, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UnavailabilityEntry {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  volunteerId: string | null;
}

interface UnavailabilitySectionProps {
  entries: UnavailabilityEntry[];
  onAdd: (data: { startDate: string; endDate: string; reason: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isAdding: boolean;
  isDeleting: boolean;
}

export function UnavailabilitySection({
  entries,
  onAdd,
  onDelete,
  isAdding,
  isDeleting,
}: UnavailabilitySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (!endDate) setEndDate(value);
  };

  const handleAdd = async () => {
    await onAdd({ startDate, endDate, reason });
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId) {
      await onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Minha indisponibilidade
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Ocultar" : "Mostrar"}
        </Button>
      </div>

      {expanded && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm overflow-hidden">
          {entries.length > 0 ? (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">
                      {format(parseISO(String(entry.startDate)), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}{" "}
                      -{" "}
                      {format(parseISO(String(entry.endDate)), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {entry.reason?.trim() || "Sem motivo informado"}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setDeleteConfirmId(entry.id)}
                    disabled={isDeleting}
                    aria-label="Remover indisponibilidade"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma indisponibilidade registrada.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs font-medium">Motivo</Label>
              <Input
                placeholder="Ex: Viagem, compromisso familiar"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleAdd}
              disabled={isAdding}
            >
              {isAdding && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Adicionar indisponibilidade
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover indisponibilidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O período será removido da sua lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
