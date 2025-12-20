import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Mirrors the existing Supabase 'volunteers' table
export const volunteers = pgTable("volunteers", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(), // Links to auth.users
  name: text("name").notNull(),
  organization: text("organization"),
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
