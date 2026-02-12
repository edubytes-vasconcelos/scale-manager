import { describe, it, expect } from "vitest";
import {
  mapVolunteer,
  mapVolunteerWithOrg,
  mapService,
  mapMinistry,
  mapTeam,
  mapEventType,
  mapChatMessage,
  mapPreacher,
  mapVolunteerUnavailability,
} from "./mappers";

describe("mapVolunteer", () => {
  const snakeRow = {
    id: "v1",
    auth_user_id: "auth1",
    organization_id: "org1",
    access_level: "admin",
    can_manage_preaching_schedule: true,
    name: "João Silva",
    email: "joao@test.com",
    whatsapp: "+5511999999999",
    accepts_notifications: "true",
    ministry_assignments: [{ ministryId: "m1", isLeader: true }],
    created_at: "2024-01-01",
  };

  it("mapeia row snake_case corretamente", () => {
    const result = mapVolunteer(snakeRow);
    expect(result.id).toBe("v1");
    expect(result.authUserId).toBe("auth1");
    expect(result.organizationId).toBe("org1");
    expect(result.accessLevel).toBe("admin");
    expect(result.canManagePreachingSchedule).toBe(true);
    expect(result.name).toBe("João Silva");
    expect(result.email).toBe("joao@test.com");
    expect(result.whatsapp).toBe("+5511999999999");
    expect(result.acceptsNotifications).toBe("true");
    expect(result.ministryAssignments).toEqual([{ ministryId: "m1", isLeader: true }]);
    expect(result.createdAt).toBe("2024-01-01");
  });

  it("mapeia row camelCase corretamente", () => {
    const camelRow = {
      id: "v1",
      authUserId: "auth1",
      organizationId: "org1",
      accessLevel: "leader",
      canManagePreachingSchedule: false,
      name: "Maria",
      email: "maria@test.com",
      whatsapp: null,
      acceptsNotifications: "false",
      ministryAssignments: [],
      createdAt: "2024-06-01",
    };
    const result = mapVolunteer(camelRow);
    expect(result.authUserId).toBe("auth1");
    expect(result.accessLevel).toBe("leader");
    expect(result.ministryAssignments).toEqual([]);
  });

  it("usa defaults para campos opcionais ausentes", () => {
    const minimalRow = {
      id: "v1",
      name: "Test",
      email: null,
      whatsapp: null,
    };
    const result = mapVolunteer(minimalRow);
    expect(result.canManagePreachingSchedule).toBe(false);
    expect(result.ministryAssignments).toEqual([]);
  });

  it("trata ministry_assignments não-array como array vazio", () => {
    const row = { ...snakeRow, ministry_assignments: "invalid" };
    const result = mapVolunteer(row);
    expect(result.ministryAssignments).toEqual([]);
  });
});

describe("mapVolunteerWithOrg", () => {
  it("inclui organization do row", () => {
    const row = {
      id: "v1",
      name: "Test",
      email: null,
      whatsapp: null,
      organization: { name: "Igreja Central" },
    };
    const result = mapVolunteerWithOrg(row);
    expect(result.organization).toEqual({ name: "Igreja Central" });
    expect(result.id).toBe("v1");
  });

  it("organization é null quando ausente", () => {
    const row = { id: "v1", name: "Test", email: null, whatsapp: null };
    const result = mapVolunteerWithOrg(row);
    expect(result.organization).toBeNull();
  });
});

describe("mapService", () => {
  it("usa id_uuid como id (caso especial)", () => {
    const row = {
      id_uuid: "service-uuid",
      id: "should-not-use",
      organization_id: "org1",
      date: "2024-03-15",
      title: "Culto",
      event_type_id: "et1",
      ministry_id: "m1",
      assignments: null,
      created_at: "2024-01-01",
    };
    const result = mapService(row);
    expect(result.id).toBe("service-uuid");
  });

  it("fallback para id quando id_uuid não existe", () => {
    const row = {
      id: "fallback-id",
      organization_id: "org1",
      date: "2024-03-15",
      title: "Culto",
      event_type_id: null,
      ministry_id: null,
      assignments: [],
      created_at: "2024-01-01",
    };
    const result = mapService(row);
    expect(result.id).toBe("fallback-id");
  });

  it("mapeia todos os campos corretamente", () => {
    const row = {
      id_uuid: "s1",
      organization_id: "org1",
      date: "2024-12-25",
      title: "Natal",
      event_type_id: "et1",
      ministry_id: "m1",
      assignments: { volunteers: [], preachers: [] },
      created_at: "2024-01-01",
    };
    const result = mapService(row);
    expect(result.organizationId).toBe("org1");
    expect(result.date).toBe("2024-12-25");
    expect(result.title).toBe("Natal");
    expect(result.eventTypeId).toBe("et1");
    expect(result.ministryId).toBe("m1");
    expect(result.assignments).toEqual({ volunteers: [], preachers: [] });
  });
});

describe("mapMinistry", () => {
  it("mapeia snake_case", () => {
    const row = {
      id: "m1",
      organization_id: "org1",
      name: "Louvor",
      icon: "music",
      whatsapp_group_link: "https://chat.whatsapp.com/abc",
    };
    const result = mapMinistry(row);
    expect(result.organizationId).toBe("org1");
    expect(result.whatsappGroupLink).toBe("https://chat.whatsapp.com/abc");
  });

  it("whatsappGroupLink default null", () => {
    const row = { id: "m1", name: "Louvor", icon: null };
    const result = mapMinistry(row);
    expect(result.whatsappGroupLink).toBeNull();
  });
});

describe("mapTeam", () => {
  it("mapeia memberIds corretamente", () => {
    const row = {
      id: "t1",
      organization_id: "org1",
      name: "Equipe A",
      member_ids: ["v1", "v2", "v3"],
    };
    const result = mapTeam(row);
    expect(result.memberIds).toEqual(["v1", "v2", "v3"]);
  });

  it("memberIds default array vazio", () => {
    const row = { id: "t1", name: "Equipe B" };
    const result = mapTeam(row);
    expect(result.memberIds).toEqual([]);
  });
});

describe("mapEventType", () => {
  it("mapeia todos os campos", () => {
    const row = {
      id: "et1",
      organization_id: "org1",
      name: "Culto",
      color: "#3b82f6",
    };
    const result = mapEventType(row);
    expect(result.id).toBe("et1");
    expect(result.organizationId).toBe("org1");
    expect(result.name).toBe("Culto");
    expect(result.color).toBe("#3b82f6");
  });
});

describe("mapChatMessage", () => {
  it("mapeia snake_case", () => {
    const row = {
      id: "c1",
      organization_id: "org1",
      sender_id: "v1",
      receiver_id: "v2",
      content: "Olá!",
      is_from_admin: "true",
      read_at: "2024-01-01T12:00:00Z",
      created_at: "2024-01-01T10:00:00Z",
    };
    const result = mapChatMessage(row);
    expect(result.senderId).toBe("v1");
    expect(result.receiverId).toBe("v2");
    expect(result.isFromAdmin).toBe("true");
    expect(result.readAt).toBe("2024-01-01T12:00:00Z");
  });
});

describe("mapPreacher", () => {
  it("mapeia todos os campos", () => {
    const row = {
      id: "p1",
      organization_id: "org1",
      name: "Pastor João",
      name_normalized: "pastor joao",
      type: "interno",
      church: "IASD Central",
      notes: "Pregador principal",
      created_at: "2024-01-01",
    };
    const result = mapPreacher(row);
    expect(result.id).toBe("p1");
    expect(result.name).toBe("Pastor João");
    expect(result.nameNormalized).toBe("pastor joao");
    expect(result.type).toBe("interno");
    expect(result.church).toBe("IASD Central");
    expect(result.notes).toBe("Pregador principal");
  });
});

describe("mapVolunteerUnavailability", () => {
  it("mapeia snake_case", () => {
    const row = {
      id: "u1",
      organization_id: "org1",
      volunteer_id: "v1",
      start_date: "2024-03-01",
      end_date: "2024-03-15",
      reason: "Férias",
      created_at: "2024-02-01",
    };
    const result = mapVolunteerUnavailability(row);
    expect(result.volunteerId).toBe("v1");
    expect(result.startDate).toBe("2024-03-01");
    expect(result.endDate).toBe("2024-03-15");
    expect(result.reason).toBe("Férias");
  });

  it("mapeia camelCase", () => {
    const row = {
      id: "u1",
      organizationId: "org1",
      volunteerId: "v2",
      startDate: "2024-06-01",
      endDate: "2024-06-10",
      reason: null,
      createdAt: "2024-05-01",
    };
    const result = mapVolunteerUnavailability(row);
    expect(result.volunteerId).toBe("v2");
    expect(result.startDate).toBe("2024-06-01");
  });
});
