import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ServiceRow = {
  id: string;
  id_uuid?: string | null;
  organization_id: string;
  date: string;
  title: string | null;
  event_type_id: string | null;
  assignments: any;
};

type VolunteerRow = {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  organization_id: string | null;
};

type EventTypeRow = {
  id: string;
  name: string;
};

function formatDateSaoPaulo(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function normalizeAssignments(assignments: any) {
  if (Array.isArray(assignments)) {
    return { volunteers: assignments, preachers: [] };
  }
  if (assignments && typeof assignments === "object") {
    return {
      volunteers: Array.isArray(assignments.volunteers)
        ? assignments.volunteers
        : [],
      preachers: Array.isArray(assignments.preachers)
        ? assignments.preachers
        : [],
    };
  }
  return { volunteers: [], preachers: [] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.");
    }
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY ausentes.");
    }

    webpush.setVapidDetails(
      "mailto:admin@seusite.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const overrideDate = url.searchParams.get("date");
    const overrideTomorrow = url.searchParams.get("tomorrow");

    const todayStr = overrideDate || formatDateSaoPaulo(new Date());
    const tomorrowStr =
      overrideTomorrow ||
      formatDateSaoPaulo(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const weekStr = formatDateSaoPaulo(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id,id_uuid,organization_id,date,title,event_type_id,assignments")
      .in("date", [todayStr, tomorrowStr, weekStr]);

    if (servicesError) throw servicesError;
    if (!services || services.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRows = services as ServiceRow[];
    const serviceIds = serviceRows.map((s) => s.id);

    const { data: volunteers, error: volunteersError } = await supabase
      .from("volunteers")
      .select("id,auth_user_id,name,organization_id")
      .not("auth_user_id", "is", null);

    if (volunteersError) throw volunteersError;
    const volunteerRows = (volunteers || []) as VolunteerRow[];
    const volunteerMap = new Map(volunteerRows.map((v) => [v.id, v]));

    const eventTypeIds = Array.from(
      new Set(serviceRows.map((s) => s.event_type_id).filter(Boolean))
    ) as string[];

    const { data: eventTypes } = eventTypeIds.length
      ? await supabase
          .from("event_types")
          .select("id,name")
          .in("id", eventTypeIds)
      : { data: [] as EventTypeRow[] };

    const eventTypeMap = new Map(
      (eventTypes || []).map((e: EventTypeRow) => [e.id, e.name])
    );

    const { data: logs } = await supabase
      .from("notification_logs")
      .select("service_id,volunteer_id,type,channel")
      .in("service_id", serviceIds)
      .eq("channel", "push")
      .in("type", ["reminder_d7", "reminder_d1", "reminder_d0"]);

    const sentSet = new Set(
      (logs || []).map(
        (log: any) => `${log.service_id}:${log.volunteer_id}:${log.type}`
      )
    );

    // Batch fetch: coletar todos auth_user_ids necessários e buscar subscriptions de uma vez
    const allAuthUserIds = [...new Set(
      serviceRows.flatMap((s) => {
        const { volunteers: assigns } = normalizeAssignments(s.assignments);
        return assigns
          .map((a: any) => volunteerMap.get(a?.volunteerId)?.auth_user_id)
          .filter(Boolean);
      })
    )] as string[];

    const subsMap = new Map<string, any[]>();
    if (allAuthUserIds.length > 0) {
      const { data: allSubs } = await supabase
        .from("push_subscriptions")
        .select("user_id, subscription")
        .in("user_id", allAuthUserIds);

      for (const sub of allSubs || []) {
        if (!subsMap.has(sub.user_id)) subsMap.set(sub.user_id, []);
        subsMap.get(sub.user_id)!.push(sub);
      }
    }

    let sentCount = 0;
    const pendingLogs: any[] = [];
    const pendingAuditEvents: any[] = [];

    for (const service of serviceRows) {
      const reminderType =
        service.date === weekStr
          ? "reminder_d7"
          : service.date === tomorrowStr
          ? "reminder_d1"
          : "reminder_d0";
      const eventTypeName = service.event_type_id
        ? eventTypeMap.get(service.event_type_id) || ""
        : "";
      const displayTitle = service.title?.trim() || eventTypeName || "Escala";

      const { volunteers: assignments } = normalizeAssignments(service.assignments);
      for (const assignment of assignments) {
        if (!assignment?.volunteerId) continue;

        const volunteer = volunteerMap.get(assignment.volunteerId);
        if (!volunteer?.auth_user_id) continue;

        const sentKey = `${service.id}:${volunteer.id}:${reminderType}`;
        if (sentSet.has(sentKey)) continue;

        const subscriptions = subsMap.get(volunteer.auth_user_id);
        if (!subscriptions || subscriptions.length === 0) continue;

        const title =
          reminderType === "reminder_d7"
            ? "📅 Escala em 7 dias"
            : reminderType === "reminder_d1"
            ? "⏰ Escala amanhã"
            : "✅ Escala hoje";
        const body =
          reminderType === "reminder_d7"
            ? `Aviso: você está escalado(a) para ${displayTitle} daqui a 7 dias.`
            : reminderType === "reminder_d1"
            ? `Lembrete: você está escalado(a) para ${displayTitle} amanhã.`
            : `Hoje é o dia: sua escala é ${displayTitle}.`;

        const payload = JSON.stringify({
          title,
          body,
          data: { serviceId: service.id },
        });

        let deliveredCount = 0;
        let failedCount = 0;
        let firstErrorCode: string | null = null;

        const sendTasks = subscriptions.map(async (sub: any) => {
          try {
            await webpush.sendNotification(sub.subscription, payload);
            deliveredCount += 1;
          } catch (err: any) {
            failedCount += 1;
            if (!firstErrorCode) {
              firstErrorCode = String(err?.statusCode || "unknown");
            }
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              await supabase
                .from("push_subscriptions")
                .delete()
                .match({ subscription: sub.subscription });
            }
          }
        });

        await Promise.all(sendTasks);

        pendingLogs.push({
          id: crypto.randomUUID(),
          volunteer_id: volunteer.id,
          service_id: service.id,
          type: reminderType,
          channel: "push",
          status: "sent",
          details: { title, body },
        });
        if (deliveredCount > 0) {
          pendingAuditEvents.push({
            id: crypto.randomUUID(),
            organization_id: service.organization_id,
            actor_auth_user_id: null,
            actor_volunteer_id: volunteer.id,
            action: "notification.push.reminder.sent",
            entity_type: "notification_delivery",
            entity_id: service.id,
            metadata: {
              reminderType,
              serviceDate: service.date,
              title,
              delivery: {
                subscriptions: subscriptions.length,
                delivered: deliveredCount,
                failed: failedCount,
              },
            },
          });
        }
        if (failedCount > 0) {
          pendingAuditEvents.push({
            id: crypto.randomUUID(),
            organization_id: service.organization_id,
            actor_auth_user_id: null,
            actor_volunteer_id: volunteer.id,
            action: "notification.push.reminder.failed",
            entity_type: "notification_delivery",
            entity_id: service.id,
            metadata: {
              reminderType,
              serviceDate: service.date,
              title,
              delivery: {
                subscriptions: subscriptions.length,
                delivered: deliveredCount,
                failed: failedCount,
                errorCode: firstErrorCode,
              },
            },
          });
        }

        sentSet.add(sentKey);
        sentCount += 1;
      }
    }

    // Batch insert de logs
    if (pendingLogs.length > 0) {
      await supabase.from("notification_logs").insert(pendingLogs);
    }
    if (pendingAuditEvents.length > 0) {
      await supabase.from("audit_events").insert(pendingAuditEvents);
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
