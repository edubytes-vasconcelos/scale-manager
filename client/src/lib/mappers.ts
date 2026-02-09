import type {
  Volunteer,
  VolunteerWithOrg,
  Service,
  Ministry,
  Team,
  EventType,
  ChatMessage,
  Preacher,
  VolunteerUnavailability,
} from "@shared/schema";

// Each mapper converts a Supabase snake_case row into the app's camelCase type.

export function mapVolunteer(row: any): Volunteer {
  return {
    id: row.id,
    authUserId: row.auth_user_id ?? row.authUserId,
    organizationId: row.organization_id ?? row.organizationId,
    accessLevel: row.access_level ?? row.accessLevel,
    canManagePreachingSchedule: row.can_manage_preaching_schedule ?? row.canManagePreachingSchedule ?? false,
    name: row.name,
    email: row.email,
    whatsapp: row.whatsapp,
    acceptsNotifications: row.accepts_notifications ?? row.acceptsNotifications,
    ministryAssignments: Array.isArray(row.ministry_assignments ?? row.ministryAssignments)
      ? (row.ministry_assignments ?? row.ministryAssignments)
      : [],
    createdAt: row.created_at ?? row.createdAt,
  };
}

export function mapVolunteerWithOrg(row: any): VolunteerWithOrg {
  return {
    ...mapVolunteer(row),
    organization: row.organization ?? null,
  };
}

export function mapService(row: any): Service {
  return {
    id: row.id_uuid ?? row.id,
    organizationId: row.organization_id ?? row.organizationId,
    date: row.date,
    title: row.title,
    eventTypeId: row.event_type_id ?? row.eventTypeId,
    ministryId: row.ministry_id ?? row.ministryId,
    assignments: row.assignments,
    createdAt: row.created_at ?? row.createdAt,
  };
}

export function mapMinistry(row: any): Ministry {
  return {
    id: row.id,
    organizationId: row.organization_id ?? row.organizationId,
    name: row.name,
    icon: row.icon,
    whatsappGroupLink: row.whatsapp_group_link ?? row.whatsappGroupLink ?? null,
  };
}

export function mapTeam(row: any): Team {
  return {
    id: row.id,
    organizationId: row.organization_id ?? row.organizationId,
    name: row.name,
    memberIds: row.member_ids ?? row.memberIds ?? [],
  };
}

export function mapEventType(row: any): EventType {
  return {
    id: row.id,
    organizationId: row.organization_id ?? row.organizationId,
    name: row.name,
    color: row.color,
  };
}

export function mapChatMessage(row: any): ChatMessage {
  return {
    id: row.id,
    organizationId: row.organization_id ?? row.organizationId,
    senderId: row.sender_id ?? row.senderId,
    receiverId: row.receiver_id ?? row.receiverId,
    content: row.content,
    isFromAdmin: row.is_from_admin ?? row.isFromAdmin,
    readAt: row.read_at ?? row.readAt,
    createdAt: row.created_at ?? row.createdAt,
  };
}

export function mapPreacher(row: any): Preacher {
  return {
    id: row.id,
    organizationId: row.organization_id ?? row.organizationId,
    name: row.name,
    nameNormalized: row.name_normalized ?? row.nameNormalized,
    type: row.type,
    church: row.church,
    notes: row.notes,
    createdAt: row.created_at ?? row.createdAt,
  };
}

export function mapVolunteerUnavailability(row: any): VolunteerUnavailability {
  return {
    id: row.id,
    organizationId: row.organization_id ?? row.organizationId,
    volunteerId: row.volunteer_id ?? row.volunteerId,
    startDate: row.start_date ?? row.startDate,
    endDate: row.end_date ?? row.endDate,
    reason: row.reason,
    createdAt: row.created_at ?? row.createdAt,
  };
}
