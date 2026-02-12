import { supabase } from "@/lib/supabase";

type AuthAccessEvent = "login" | "logout";

type AuthAccessPayload = {
  organizationId: string;
  actorAuthUserId: string;
  actorVolunteerId?: string | null;
  event: AuthAccessEvent;
  metadata?: Record<string, unknown>;
};

export function detectDeviceType(userAgent: string): "mobile" | "tablet" | "desktop" {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|kindle|silk|playbook/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod|windows phone/.test(ua)) return "mobile";
  return "desktop";
}

export function detectOs(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("windows")) return "windows";
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "ios";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macos";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

export function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "opera";
  if (ua.includes("firefox/")) return "firefox";
  if (ua.includes("chrome/")) return "chrome";
  if (ua.includes("safari/")) return "safari";
  return "unknown";
}

function getClientContext() {
  if (typeof window === "undefined") {
    return {
      appPlatform: "web",
      deviceType: "desktop",
      os: "unknown",
      browser: "unknown",
      userAgent: null as string | null,
      language: null as string | null,
      timezone: null as string | null,
      screen: null as string | null,
      viewport: null as string | null,
      path: null as string | null,
      referrer: null as string | null,
    };
  }

  const ua = window.navigator.userAgent || "";
  return {
    appPlatform: "web",
    deviceType: detectDeviceType(ua),
    os: detectOs(ua),
    browser: detectBrowser(ua),
    userAgent: ua || null,
    language: window.navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    screen:
      window.screen?.width && window.screen?.height
        ? `${window.screen.width}x${window.screen.height}`
        : null,
    viewport:
      window.innerWidth && window.innerHeight
        ? `${window.innerWidth}x${window.innerHeight}`
        : null,
    path: window.location?.pathname || null,
    referrer: document?.referrer || null,
  };
}

export async function auditAuthAccessEvent(payload: AuthAccessPayload) {
  try {
    const ctx = getClientContext();
    const action = payload.event === "login" ? "auth.login" : "auth.logout";
    const { error } = await supabase.from("audit_events").insert({
      organization_id: payload.organizationId,
      actor_auth_user_id: payload.actorAuthUserId,
      actor_volunteer_id: payload.actorVolunteerId ?? null,
      action,
      entity_type: "session",
      entity_id: payload.actorAuthUserId,
      metadata: {
        ...payload.metadata,
        appPlatform: ctx.appPlatform,
        deviceType: ctx.deviceType,
        os: ctx.os,
        browser: ctx.browser,
        userAgent: ctx.userAgent,
        language: ctx.language,
        timezone: ctx.timezone,
        screen: ctx.screen,
        viewport: ctx.viewport,
        path: ctx.path,
        referrer: ctx.referrer,
      },
    });

    if (error) {
      console.warn("auth_access_event_insert_failed", payload.event, error.message);
    }
  } catch (error) {
    console.warn("auth_access_event_unexpected_error", payload.event, error);
  }
}
