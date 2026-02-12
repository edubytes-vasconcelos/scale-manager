import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { urlBase64ToUint8Array } from "@/lib/push";
import { useToast } from "@/hooks/use-toast";
import { auditEvent } from "@/lib/audit";

export function usePushNotifications() {
  const { toast } = useToast();
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

  const getAuditContext = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return null;

    const { data: volunteer } = await supabase
      .from("volunteers")
      .select("id, organization_id")
      .eq("auth_user_id", user.id)
      .order("organization_id", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (!volunteer?.organization_id) return null;

    return {
      organizationId: volunteer.organization_id as string,
      volunteerId: volunteer.id as string | null,
    };
  }, []);

  const handleEnablePush = useCallback(async () => {
    if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) return;
    if (!vapidPublicKey) {
      toast({
        title: "VAPID não configurado",
        description: "Defina VITE_VAPID_PUBLIC_KEY no ambiente.",
        variant: "destructive",
      });
      return;
    }

    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") {
        toast({
          title: "Permissao negada",
          description: "Ative as notificacoes no navegador.",
          variant: "destructive",
        });
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error("Usuário não autenticado.");

      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("subscription", subscription as any)
        .limit(1);

      if (!existing || existing.length === 0) {
        const { error } = await supabase.from("push_subscriptions").insert({
          user_id: user.id,
          subscription,
        });
        if (error) throw error;
      }

      setPushEnabled(true);
      const auditCtx = await getAuditContext();
      if (auditCtx) {
        await auditEvent({
          organizationId: auditCtx.organizationId,
          actorVolunteerId: auditCtx.volunteerId,
          action: "notification.push.enabled",
          entityType: "notification_settings",
          entityId: auditCtx.volunteerId || null,
          metadata: {
            permission,
            hasSubscription: true,
          },
        });
      }
      toast({
        title: "Notificações ativadas",
        description: "Você receberá alertas de novas escalas.",
      });
    } catch (error: any) {
      const auditCtx = await getAuditContext();
      if (auditCtx) {
        await auditEvent({
          organizationId: auditCtx.organizationId,
          actorVolunteerId: auditCtx.volunteerId,
          action: "system.error",
          entityType: "system",
          metadata: {
            area: "push",
            operation: "enable",
            message: error?.message || "unknown_error",
          },
        });
      }
      toast({
        title: "Erro ao ativar notificações",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPushLoading(false);
    }
  }, [vapidPublicKey, toast, getAuditContext]);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setPushSupported(supported);

    if (!supported) {
      setPushPermission("unsupported");
      return;
    }

    setPushPermission(Notification.permission);

    const checkExisting = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = registration
          ? await registration.pushManager.getSubscription()
          : null;
        if (subscription) setPushEnabled(true);

        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        const { data } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (data && data.length > 0) setPushEnabled(true);

        const alreadyEnabled = !!subscription || (data && data.length > 0);
        if (!alreadyEnabled && Notification.permission !== "denied" && vapidPublicKey) {
          await handleEnablePush();
        }
      } catch {
        // ignore
      }
    };

    checkExisting();
  }, []);

  const handleTestPush = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      await supabase.functions.invoke("send-push", {
        body: {
          userId: user.id,
          title: "Teste de notificação",
          body: "Se você recebeu, está tudo certo!",
        },
      });
      const auditCtx = await getAuditContext();
      if (auditCtx) {
        await auditEvent({
          organizationId: auditCtx.organizationId,
          actorVolunteerId: auditCtx.volunteerId,
          action: "notification.push.test_sent",
          entityType: "notification_settings",
          entityId: auditCtx.volunteerId || null,
        });
      }
      toast({
        title: "Teste enviado",
        description: "Verifique se a notificação chegou.",
      });
    } catch (error: any) {
      const auditCtx = await getAuditContext();
      if (auditCtx) {
        await auditEvent({
          organizationId: auditCtx.organizationId,
          actorVolunteerId: auditCtx.volunteerId,
          action: "system.error",
          entityType: "system",
          metadata: {
            area: "push",
            operation: "test",
            message: error?.message || "unknown_error",
          },
        });
      }
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível enviar o teste.",
        variant: "destructive",
      });
    }
  }, [toast, getAuditContext]);

  const handleDisablePush = useCallback(async () => {
    if (!pushSupported) return;
    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;
      if (subscription) {
        await subscription.unsubscribe();
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user) {
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
      }

      setPushEnabled(false);
      const auditCtx = await getAuditContext();
      if (auditCtx) {
        await auditEvent({
          organizationId: auditCtx.organizationId,
          actorVolunteerId: auditCtx.volunteerId,
          action: "notification.push.disabled",
          entityType: "notification_settings",
          entityId: auditCtx.volunteerId || null,
        });
      }
      toast({
        title: "Notificações desativadas",
        description: "Você não receberá alertas neste dispositivo.",
      });
    } catch (error: any) {
      const auditCtx = await getAuditContext();
      if (auditCtx) {
        await auditEvent({
          organizationId: auditCtx.organizationId,
          actorVolunteerId: auditCtx.volunteerId,
          action: "system.error",
          entityType: "system",
          metadata: {
            area: "push",
            operation: "disable",
            message: error?.message || "unknown_error",
          },
        });
      }
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível desativar.",
        variant: "destructive",
      });
    } finally {
      setPushLoading(false);
    }
  }, [pushSupported, toast, getAuditContext]);

  return {
    pushSupported,
    pushEnabled,
    pushLoading,
    pushPermission,
    handleEnablePush,
    handleDisablePush,
    handleTestPush,
  };
}
