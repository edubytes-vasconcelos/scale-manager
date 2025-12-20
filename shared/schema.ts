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

// Mirrors the existing Supabase 'services' table
export const services = pgTable("services", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  description: text("description"),
});

export const insertVolunteerSchema = createInsertSchema(volunteers);
export const insertServiceSchema = createInsertSchema(services);

export type Volunteer = typeof volunteers.$inferSelect;
export type Service = typeof services.$inferSelect;
