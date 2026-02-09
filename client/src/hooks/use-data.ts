// Barrel file – re-exports all domain hooks so existing imports keep working.

export {
  useVolunteerProfile,
  useVolunteers,
  useCreateVolunteer,
  useVolunteerUnavailability,
  useCreateVolunteerUnavailability,
  useDeleteVolunteerUnavailability,
} from "./use-volunteers";

export {
  useServices,
  useMySchedules,
  useUpdateAssignmentStatus,
  usePreachers,
  useUpsertPreacher,
  useUpdatePreacher,
} from "./use-services";

export {
  useMinistries,
  useCreateMinistry,
  useUpdateMinistry,
} from "./use-ministries";

export {
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
} from "./use-teams";

export {
  useEventTypes,
  useCreateEventType,
  useUpdateEventType,
} from "./use-event-types";

export {
  useChatMessages,
  useChatConversations,
  useSendChatMessage,
  useUnreadMessageCount,
  useMarkMessagesAsRead,
} from "./use-chat";
