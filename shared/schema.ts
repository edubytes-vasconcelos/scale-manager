import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Mirrors the existing Supabase 'volunteers' table
export const volunteers = pgTable("volunteers", {
  id: uuid("id").primaryKey(),
  authUserId: uuid("auth_user_id"), // null for pre-registered volunteers
  organizationId: uuid("organization_id"),
  accessLevel: text("access_level"), // admin | leader | volunteer
  name: text("name").notNull(),
  email: text("email"),
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
};

// Mirrors the existing Supabase 'services' table
export const services = pgTable("services", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id"),
  date: text("date").notNull(), // stored as YYYY-MM-DD string
  title: text("title").notNull(),
  eventTypeId: uuid("event_type_id"),
  assignments: jsonb("assignments").$type<ServiceAssignment[]>(),
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
