export type Role = "admin" | "leader" | "volunteer";

export const routePermissions: Record<string, Role[]> = {
  "/": ["admin", "leader", "volunteer"],
  "/schedules": ["admin", "leader", "volunteer"],

  "/admin/volunteers": ["admin", "leader"],
  "/admin/teams": ["admin", "leader"],

  "/admin/ministries": ["admin"],
  "/admin/event-types": ["admin"],
};
