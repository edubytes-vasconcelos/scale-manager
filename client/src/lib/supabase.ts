import { createClient } from "@supabase/supabase-js";

// ⚠️ Variáveis vindas do Vite (build-time)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ❗ NUNCA quebrar o frontend com throw
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase environment variables missing", {
    supabaseUrl,
    supabaseAnonKey,
  });
}

// ✅ Client sempre criado (evita crash no bundle)
export const supabase = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? ""
);
