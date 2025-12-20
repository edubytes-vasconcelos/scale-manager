import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Mirrors the existing Supabase 'volunteers' table
export const volunteers = pgTable("volunteers", {
  id: uuid("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull(), // Links to auth.users
  organizationId: uuid("organization_id"),
  accessLevel: text("access_level"), // admin / leader / volunteer
  name: text("name").notNull(),
  email: text("email"),
});

// Mirrors the existing Supabase 'organizations' table
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at"),
});

// Mirrors the existing Supabase 'services' table
export const services = pgTable("services", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  description: text("description"),
  organizationId: uuid("organization_id"),
});

export const insertVolunteerSchema = createInsertSchema(volunteers);
export const insertServiceSchema = createInsertSchema(services);
export const insertOrganizationSchema = createInsertSchema(organizations);

export type Volunteer = typeof volunteers.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Organization = typeof organizations.$inferSelect;

// Extended type with organization name
export type VolunteerWithOrg = Volunteer & {
  organization?: { name: string } | null;
};
