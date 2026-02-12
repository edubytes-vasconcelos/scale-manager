import { useMemo, useState } from "react";
import { useAuthAccessEvents, useVolunteerProfile, useVolunteers } from "@/hooks/use-data";
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
import { Activity, Smartphone, Laptop } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AccessAudit() {
  const { data: profile } = useVolunteerProfile();
  const { data: events, isLoading } = useAuthAccessEvents(profile?.organizationId);
  const { data: volunteers } = useVolunteers(profile?.organizationId);

  const [eventFilter, setEventFilter] = useState<"all" | "login" | "logout">("all");
  const [deviceFilter, setDeviceFilter] = useState<"all" | "desktop" | "mobile" | "tablet">(
    "all"
  );
  const [search, setSearch] = useState("");

  const volunteersById = useMemo(() => {
    const map = new Map<string, string>();
    (volunteers || []).forEach((v) => map.set(v.id, v.name));
    return map;
  }, [volunteers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (events || []).filter((evt) => {
      if (eventFilter !== "all" && evt.event !== eventFilter) return false;
      if (deviceFilter !== "all" && evt.device_type !== deviceFilter) return false;
      if (!term) return true;

      const volunteerName = evt.actor_volunteer_id
        ? volunteersById.get(evt.actor_volunteer_id) || ""
        : "";
      const path = evt.path || "";
      const browser = evt.browser || "";
      const os = evt.os || "";
      const haystack = `${volunteerName} ${path} ${browser} ${os}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [events, eventFilter, deviceFilter, search, volunteersById]);

  const totalLogins = (events || []).filter((e) => e.event === "login").length;
  const totalLogouts = (events || []).filter((e) => e.event === "logout").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          Acessos ao sistema
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Auditoria de login/logout com contexto de dispositivo e navegador
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Eventos</p>
            <p className="text-2xl font-semibold">{events?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Logins</p>
            <p className="text-2xl font-semibold">{totalLogins}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Logouts</p>
            <p className="text-2xl font-semibold">{totalLogouts}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por voluntário, rota, navegador..."
          />
          <Select
            value={eventFilter}
            onValueChange={(v) => setEventFilter(v as "all" | "login" | "logout")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos eventos</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={deviceFilter}
            onValueChange={(v) => setDeviceFilter(v as "all" | "desktop" | "mobile" | "tablet")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Dispositivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos dispositivos</SelectItem>
              <SelectItem value="desktop">Desktop</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Últimos acessos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando eventos...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
          ) : (
            filtered.map((evt) => {
              const volunteerName = evt.actor_volunteer_id
                ? volunteersById.get(evt.actor_volunteer_id) || "Voluntário"
                : "Voluntário";
              const DeviceIcon = evt.device_type === "mobile" || evt.device_type === "tablet" ? Smartphone : Laptop;
              return (
                <div
                  key={evt.id}
                  className="rounded-xl border border-border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          evt.event === "login"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                        }
                      >
                        {evt.event === "login" ? "Login" : "Logout"}
                      </Badge>
                      <span className="font-medium text-sm">{volunteerName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(evt.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {evt.browser || "n/a"} • {evt.os || "n/a"} • {evt.path || "rota n/a"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <DeviceIcon className="w-4 h-4" />
                    <span>{evt.device_type}</span>
                    {evt.viewport ? <span>• {evt.viewport}</span> : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
