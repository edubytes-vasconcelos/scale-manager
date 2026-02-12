import { describe, it, expect } from "vitest";
import { normalizeAssignments, buildAssignmentsPayload } from "./assignments";
import type { ServiceAssignment, PreacherAssignment } from "@shared/schema";

describe("normalizeAssignments", () => {
  it("retorna arrays vazios para null", () => {
    expect(normalizeAssignments(null)).toEqual({
      volunteers: [],
      preachers: [],
    });
  });

  it("retorna arrays vazios para undefined", () => {
    expect(normalizeAssignments(undefined)).toEqual({
      volunteers: [],
      preachers: [],
    });
  });

  it("retorna arrays vazios para array vazio (formato legado)", () => {
    expect(normalizeAssignments([])).toEqual({
      volunteers: [],
      preachers: [],
    });
  });

  it("converte array legado (ServiceAssignment[]) para formato novo", () => {
    const legacy: ServiceAssignment[] = [
      { volunteerId: "v1", status: "confirmed" },
      { volunteerId: "v2", status: "pending" },
    ];

    const result = normalizeAssignments(legacy);
    expect(result.volunteers).toEqual(legacy);
    expect(result.preachers).toEqual([]);
  });

  it("mantém objeto com ambos campos intacto", () => {
    const volunteers: ServiceAssignment[] = [
      { volunteerId: "v1", status: "confirmed" },
    ];
    const preachers: PreacherAssignment[] = [
      { preacherId: "p1", name: "Pastor João", role: "pregador" },
    ];

    const result = normalizeAssignments({ volunteers, preachers });
    expect(result.volunteers).toEqual(volunteers);
    expect(result.preachers).toEqual(preachers);
  });

  it("trata objeto com apenas volunteers", () => {
    const volunteers: ServiceAssignment[] = [
      { volunteerId: "v1", status: "pending" },
    ];
    const result = normalizeAssignments({ volunteers });
    expect(result.volunteers).toEqual(volunteers);
    expect(result.preachers).toEqual([]);
  });

  it("trata objeto com apenas preachers", () => {
    const preachers: PreacherAssignment[] = [
      { preacherId: "p1", name: "Pastor", role: "pregador" },
    ];
    const result = normalizeAssignments({ preachers });
    expect(result.volunteers).toEqual([]);
    expect(result.preachers).toEqual(preachers);
  });

  it("trata objeto com volunteers não-array", () => {
    const result = normalizeAssignments({
      volunteers: "invalid" as any,
      preachers: [] as PreacherAssignment[],
    });
    expect(result.volunteers).toEqual([]);
    expect(result.preachers).toEqual([]);
  });

  it("trata objeto vazio", () => {
    const result = normalizeAssignments({});
    expect(result.volunteers).toEqual([]);
    expect(result.preachers).toEqual([]);
  });
});

describe("buildAssignmentsPayload", () => {
  it("retorna objeto com ambos campos", () => {
    const volunteers: ServiceAssignment[] = [
      { volunteerId: "v1", status: "confirmed" },
    ];
    const preachers: PreacherAssignment[] = [
      { preacherId: "p1", name: "Pastor", role: "pregador" },
    ];

    const result = buildAssignmentsPayload({ volunteers, preachers });
    expect(result).toEqual({ volunteers, preachers });
  });

  it("retorna arrays vazios quando input é vazio", () => {
    const result = buildAssignmentsPayload({
      volunteers: [],
      preachers: [],
    });
    expect(result).toEqual({ volunteers: [], preachers: [] });
  });

  it("round-trip: build → normalize preserva dados", () => {
    const original = {
      volunteers: [
        { volunteerId: "v1", status: "confirmed" as const },
        { volunteerId: "v2", status: "declined" as const, note: "viagem" },
      ],
      preachers: [
        { preacherId: "p1", name: "Pastor Silva", role: "pregador" as const },
      ],
    };

    const payload = buildAssignmentsPayload(original);
    const restored = normalizeAssignments(payload);
    expect(restored).toEqual(original);
  });
});
