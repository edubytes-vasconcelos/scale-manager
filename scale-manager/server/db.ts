import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Minimal DB setup - will warn if no URL but won't crash build unless used
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({ 
  connectionString: connectionString || "postgres://dummy:dummy@localhost:5432/dummy" 
});

// We wrap this to avoid immediate connection errors if URL is missing
export const db = drizzle(pool, { schema });
