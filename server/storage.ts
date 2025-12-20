import { type Volunteer, type Service } from "@shared/schema";

export interface IStorage {
  // Minimal storage interface, mostly unused as we rely on Supabase client-side
  getUser(id: string): Promise<any | undefined>;
}

export class MemStorage implements IStorage {
  async getUser(id: string): Promise<any | undefined> {
    return undefined;
  }
}

export const storage = new MemStorage();
