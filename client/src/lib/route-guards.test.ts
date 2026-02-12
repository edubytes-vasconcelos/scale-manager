import { describe, it, expect } from "vitest";
import { routePermissions, type Role } from "./route-guards";

describe("routePermissions", () => {
  const allRoles: Role[] = ["admin", "leader", "volunteer"];

  describe("rotas públicas (todos os roles)", () => {
    it.each(["/", "/schedules"])("%s acessível por todos os roles", (route) => {
      allRoles.forEach((role) => {
        expect(routePermissions[route]).toContain(role);
      });
    });
  });

  describe("rotas de líder (admin + leader)", () => {
    it.each(["/admin/volunteers", "/admin/teams"])(
      "%s acessível por admin e leader, não por volunteer",
      (route) => {
        expect(routePermissions[route]).toContain("admin");
        expect(routePermissions[route]).toContain("leader");
        expect(routePermissions[route]).not.toContain("volunteer");
      }
    );
  });

  describe("rotas somente admin", () => {
    it.each(["/admin/ministries", "/admin/event-types"])(
      "%s acessível apenas por admin",
      (route) => {
        expect(routePermissions[route]).toContain("admin");
        expect(routePermissions[route]).not.toContain("leader");
        expect(routePermissions[route]).not.toContain("volunteer");
      }
    );
  });

  it("rota não listada retorna undefined", () => {
    expect(routePermissions["/rota-inexistente"]).toBeUndefined();
  });

  it("todas as rotas definidas têm pelo menos um role", () => {
    Object.entries(routePermissions).forEach(([route, roles]) => {
      expect(roles.length).toBeGreaterThan(0);
    });
  });

  it("admin tem acesso a todas as rotas definidas", () => {
    Object.entries(routePermissions).forEach(([route, roles]) => {
      expect(roles).toContain("admin");
    });
  });
});
