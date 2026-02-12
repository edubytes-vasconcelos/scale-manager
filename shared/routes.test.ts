import { describe, it, expect } from "vitest";
import { buildUrl } from "./routes";

describe("buildUrl", () => {
  it("retorna path sem alteração quando não há params", () => {
    expect(buildUrl("/api/users")).toBe("/api/users");
  });

  it("retorna path sem alteração quando params é undefined", () => {
    expect(buildUrl("/api/users", undefined)).toBe("/api/users");
  });

  it("substitui :param pelo valor", () => {
    expect(buildUrl("/api/users/:id", { id: "123" })).toBe("/api/users/123");
  });

  it("substitui múltiplos params", () => {
    expect(
      buildUrl("/api/orgs/:orgId/users/:userId", {
        orgId: "org1",
        userId: "user1",
      })
    ).toBe("/api/orgs/org1/users/user1");
  });

  it("converte valores numéricos para string", () => {
    expect(buildUrl("/api/users/:id", { id: 42 })).toBe("/api/users/42");
  });

  it("ignora params que não existem no path", () => {
    expect(buildUrl("/api/users", { id: "123" })).toBe("/api/users");
  });

  it("substitui apenas params presentes no path", () => {
    expect(
      buildUrl("/api/users/:id", { id: "123", extra: "ignored" })
    ).toBe("/api/users/123");
  });
});
