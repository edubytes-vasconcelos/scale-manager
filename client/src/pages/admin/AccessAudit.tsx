import { useMemo, useState } from "react";
import { useAuditEvents, useVolunteerProfile, useVolunteers } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, AlertTriangle, BellRing, CheckCircle2, Clock3, Send } from "lucide-react";
import { format, parseISO, subDays, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";

type PeriodPreset = "24h" | "7d" | "30d" | "90d";

function toDateString(value: Date) {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AccessAudit() {
  const { data: profile } = useVolunteerProfile();
  const { data: events, isLoading } = useAuditEvents(profile?.organizationId);
  const { data: volunteers } = useVolunteers(profile?.organizationId);

  const [preset, setPreset] = useState<PeriodPreset>("7d");
  const [fromDate, setFromDate] = useState(toDateString(subDays(new Date(), 7)));
  const [toDate, setToDate] = useState(toDateString(new Date()));
  const [search, setSearch] = useState("");

  const volunteersById = useMemo(() => {
    const map = new Map<string, string>();
    (volunteers || []).forEach((v) => map.set(v.id, v.name));
    return map;
  }, [volunteers]);

  const rangeStart = useMemo(() => {
    const now = new Date();
    if (preset === "24h") return subHours(now, 24);
    if (preset === "7d") return subDays(now, 7);
    if (preset === "30d") return subDays(now, 30);
    return subDays(now, 90);
  }, [preset]);

  const dateFiltered = useMemo(() => {
    const explicitFrom = fromDate ? parseISO(`${fromDate}T00:00:00`) : null;
    const explicitTo = toDate ? parseISO(`${toDate}T23:59:59`) : null;
    const from = explicitFrom || rangeStart;
    return (events || []).filter((evt) => {
      const created = parseISO(evt.created_at);
      if (created < from) return false;
      if (explicitTo && created > explicitTo) return false;
      return true;
    });
  }, [events, fromDate, toDate, rangeStart]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return dateFiltered;
    return dateFiltered.filter((evt) => {
      const volunteerName = evt.actor_volunteer_id
        ? volunteersById.get(evt.actor_volunteer_id) || ""
        : "";
      const metadataText = JSON.stringify(evt.metadata || {}).toLowerCase();
      const haystack = `${evt.action} ${evt.entity_type} ${evt.entity_id || ""} ${volunteerName} ${metadataText}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [dateFiltered, search, volunteersById]);

  const metrics = useMemo(() => {
    let pushSent = 0;
    let pushFailed = 0;
    let rsvpConfirmed = 0;
    let rsvpDeclined = 0;
    let errors = 0;
    let logins = 0;
    let logouts = 0;

    for (const evt of filtered) {
      if (
        evt.action === "notification.push.reminder.sent" ||
        evt.action === "notification.push.test_sent"
      ) {
        pushSent += 1;
      }
      if (evt.action === "notification.push.reminder.failed") pushFailed += 1;
      if (evt.action === "schedule.rsvp.confirm") rsvpConfirmed += 1;
      if (evt.action === "schedule.rsvp.decline") rsvpDeclined += 1;
      if (
        evt.action === "system.error" ||
        evt.action.endsWith(".failed")
      ) {
        errors += 1;
      }
      if (evt.action === "auth.login") logins += 1;
      if (evt.action === "auth.logout") logouts += 1;
    }

    return { pushSent, pushFailed, rsvpConfirmed, rsvpDeclined, errors, logins, logouts };
  }, [filtered]);

  const recentErrors = useMemo(
    () =>
      filtered
        .filter((evt) => evt.action === "system.error" || evt.action.endsWith(".failed"))
        .slice(0, 10),
    [filtered]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          Observabilidade
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Painel operacional consolidado com taxonomy única em <code>audit_events</code>
        </p>
      </div>

      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Período e busca</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select
            value={preset}
            onValueChange={(value) => setPreset(value as PeriodPreset)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24 horas</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ação, voluntário, metadata..."
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Send className="w-4 h-4" /> Push enviados
            </p>
            <p className="text-2xl font-semibold">{metrics.pushSent}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <BellRing className="w-4 h-4" /> Push falhos
            </p>
            <p className="text-2xl font-semibold">{metrics.pushFailed}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Confirmações RSVP
            </p>
            <p className="text-2xl font-semibold">{metrics.rsvpConfirmed}</p>
            <p className="text-xs text-muted-foreground mt-1">Recusas: {metrics.rsvpDeclined}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Erros no período
            </p>
            <p className="text-2xl font-semibold">{metrics.errors}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Acessos no período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">Logins: <span className="text-foreground font-medium">{metrics.logins}</span></p>
            <p className="text-muted-foreground">Logouts: <span className="text-foreground font-medium">{metrics.logouts}</span></p>
            <p className="text-muted-foreground">Eventos totais filtrados: <span className="text-foreground font-medium">{filtered.length}</span></p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimos erros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : recentErrors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem erros no período.</p>
            ) : (
              recentErrors.map((evt) => (
                <div key={evt.id} className="rounded-lg border border-border p-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
                      {evt.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(evt.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {typeof evt.metadata === "object" && evt.metadata
                      ? JSON.stringify(evt.metadata).slice(0, 180)
                      : "sem metadata"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock3 className="w-4 h-4" /> Linha do tempo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando eventos...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
          ) : (
            filtered.slice(0, 80).map((evt) => {
              const volunteerName = evt.actor_volunteer_id
                ? volunteersById.get(evt.actor_volunteer_id) || "Voluntário"
                : "Sistema";
              return (
                <div
                  key={evt.id}
                  className="rounded-xl border border-border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{evt.action}</Badge>
                      <span className="text-sm font-medium">{volunteerName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {evt.entity_type}
                      {evt.entity_id ? ` • ${evt.entity_id}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(evt.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
