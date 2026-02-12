import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PushNotificationSectionProps {
  pushSupported: boolean;
  pushEnabled: boolean;
  pushLoading: boolean;
  pushPermission: NotificationPermission | "unsupported";
  onEnable: () => void;
  onDisable: () => void;
  onTest: () => void;
}

export function PushNotificationSection({
  pushSupported,
  pushEnabled,
  pushLoading,
  pushPermission,
  onEnable,
  onDisable,
  onTest,
}: PushNotificationSectionProps) {
  const [expanded, setExpanded] = useState(true);

  if (!pushSupported) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold leading-tight">Alertas</p>
            <p className="text-xs text-muted-foreground">
              Receba avisos quando novas escalas forem criadas.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Ocultar" : "Mostrar"}
        </Button>
      </div>

      {expanded && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5 text-xs text-muted-foreground">
            {!pushSupported && (
              <p>Seu navegador não suporta notificações push.</p>
            )}
            {pushPermission === "denied" && (
              <p className="text-destructive">Permissão bloqueada no navegador.</p>
            )}
            {pushEnabled && <p>Notificações ativadas neste dispositivo.</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={onTest}
              disabled={!pushEnabled}
              size="sm"
              className="h-8"
            >
              Testar alerta
            </Button>

            {pushEnabled ? (
              <Button
                variant="outline"
                onClick={onDisable}
                disabled={pushLoading}
                size="sm"
                className="h-8"
              >
                {pushLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Desativar alertas
              </Button>
            ) : (
              <Button
                onClick={onEnable}
                disabled={!pushSupported || pushLoading || pushEnabled || pushPermission === "denied"}
                variant={pushEnabled ? "outline" : "default"}
                size="sm"
                className="h-8"
              >
                {pushLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {pushEnabled ? "Alertas ativados" : "Ativar alertas"}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
