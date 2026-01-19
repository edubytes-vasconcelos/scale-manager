import { pgTable, text, timestamp, uuid, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Mirrors the existing Supabase 'volunteers' table
export const volunteers = pgTable("volunteers", {
  id: uuid("id").primaryKey(),
  authUserId: uuid("auth_user_id"), // null for pre-registered volunteers
  organizationId: uuid("organization_id"),
  accessLevel: text("access_level"), // admin | leader | volunteer
  canManagePreachingSchedule: boolean("can_manage_preaching_schedule").default(false),
  name: text("name").notNull(),
  email: text("email"),
  whatsapp: text("whatsapp"),
  acceptsNotifications: text("accepts_notifications").default("true"), // "true" | "false" stored as text
  ministryAssignments: jsonb("ministry_assignments"),
  createdAt: timestamp("created_at"),
});

// Mirrors the existing Supabase 'organizations' table
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at"),
});

// Mirrors the existing Supabase 'ministries' table
export const ministries = pgTable("ministries", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id"),
  name: text("name").notNull(),
  icon: text("icon"),
});

// Mirrors the existing Supabase 'teams' table
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id"),
  name: text("name").notNull(),
  memberIds: jsonb("member_ids"), // array of volunteer.id
});

// Mirrors the existing Supabase 'event_types' table
export const eventTypes = pgTable("event_types", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id"),
  name: text("name").notNull(),
  color: text("color"),
});

// Ministry assignment type with leader flag
export type MinistryAssignment = {
  ministryId: string;
  isLeader: boolean;
};

// Assignment type for services
export type ServiceAssignment = {
  volunteerId?: string;
  teamId?: string;
  status: "pending" | "confirmed" | "declined";
  note?: string;
};

export type Preacher = {
  id: string;
  organizationId: string;
  name: string;
  nameNormalized: string;
  type: "interno" | "convidado";
  church?: string | null;
  notes?: string | null;
  createdAt?: string | null;
};

export type PreacherAssignment = {
  preacherId: string;
  name: string;
  role: "pregador";
};

export type ServiceAssignmentsPayload =
  | ServiceAssignment[]
  | {
      volunteers?: ServiceAssignment[];
      preachers?: PreacherAssignment[];
    };

// Mirrors the existing Supabase 'services' table
export const services = pgTable("services", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id"),
  date: text("date").notNull(), // stored as YYYY-MM-DD string
  title: text("title").notNull(),
  eventTypeId: uuid("event_type_id"),
  ministryId: uuid("ministry_id"), // links service to a ministry for leader permissions
  assignments: jsonb("assignments").$type<ServiceAssignmentsPayload>(),
  createdAt: timestamp("created_at"),
});

export const insertVolunteerSchema = createInsertSchema(volunteers);
export const insertServiceSchema = createInsertSchema(services);
export const insertOrganizationSchema = createInsertSchema(organizations);
export const insertMinistrySchema = createInsertSchema(ministries);
export const insertTeamSchema = createInsertSchema(teams);
export const insertEventTypeSchema = createInsertSchema(eventTypes);

export type Volunteer = typeof volunteers.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Ministry = typeof ministries.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type EventType = typeof eventTypes.$inferSelect;

// Extended type with organization name
export type VolunteerWithOrg = Volunteer & {
  organization?: { name: string } | null;
};

// Chat messages table for real-time communication
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  senderId: uuid("sender_id").notNull(), // volunteer id
  receiverId: uuid("receiver_id"), // null = message to all admins, or specific volunteer id
  content: text("content").notNull(),
  isFromAdmin: text("is_from_admin").default("false"), // "true" | "false"
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at"),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Extended type with sender info
export type ChatMessageWithSender = ChatMessage & {
  sender?: { name: string } | null;
};
