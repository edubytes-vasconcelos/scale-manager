import { AlertCircle } from "lucide-react";

interface PendingAlertProps {
  count: number;
}

export function PendingAlert({ count }: PendingAlertProps) {
  if (count === 0) return null;

  return (
    <section className="rounded-2xl border border-warning/30 bg-warning/10 p-4 flex gap-3 shadow-sm">
      <AlertCircle className="text-warning w-5 h-5 mt-0.5" />
      <div>
        <p className="font-medium">
          Você tem {count} escala(s) aguardando confirmação
        </p>
        <p className="text-sm text-muted-foreground">
          Confirme ou recuse para ajudar na organização.
        </p>
      </div>
    </section>
  );
}
