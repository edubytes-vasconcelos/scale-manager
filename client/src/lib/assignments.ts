import type {
  PreacherAssignment,
  ServiceAssignment,
  ServiceAssignmentsPayload,
} from "@shared/schema";

export type NormalizedAssignments = {
  volunteers: ServiceAssignment[];
  preachers: PreacherAssignment[];
};

export function normalizeAssignments(
  assignments?: ServiceAssignmentsPayload | null
): NormalizedAssignments {
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

export function buildAssignmentsPayload(
  normalized: NormalizedAssignments
): ServiceAssignmentsPayload {
  return {
    volunteers: normalized.volunteers,
    preachers: normalized.preachers,
  };
}
