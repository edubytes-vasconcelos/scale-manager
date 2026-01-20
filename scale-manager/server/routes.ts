import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // No server-side routes needed for this MVP
  // The app uses Supabase client-side directly
  
  return httpServer;
}
