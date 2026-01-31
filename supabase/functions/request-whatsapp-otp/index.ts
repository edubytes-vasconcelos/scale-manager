import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

export const config = {
  verify_jwt: false,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizePhone = (input: string) => {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) {
    return digits.slice(2);
  }
  return digits;
};

const randomCode = () => {
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
};

const hashCode = async (code: string, salt: string) => {
  const data = new TextEncoder().encode(`${code}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const webhookUrl = Deno.env.get("N8N_WHATSAPP_WEBHOOK_URL");

    if (!supabaseUrl || !supabaseServiceKey || !webhookUrl) {
      throw new Error("Variaveis de ambiente nao configuradas.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const phone = payload.phone as string | undefined;

    if (!phone) {
      return new Response(JSON.stringify({ error: "Telefone obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneNormalized = normalizePhone(phone);
    if (phoneNormalized.length < 10) {
      return new Response(JSON.stringify({ error: "Telefone invalido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = randomCode();
    const salt = crypto.randomUUID();
    const codeHash = await hashCode(code, salt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("whatsapp_otp").insert({
      phone,
      phone_normalized: phoneNormalized,
      code_hash: codeHash,
      code_salt: salt,
      expires_at: expiresAt,
    });

    if (insertError) throw insertError;

    const { data: volunteerMatches } = await supabase
      .from("volunteers")
      .select("organization_id, whatsapp, organizations(name, invite_code)")
      .not("whatsapp", "is", null);

    const matchedVolunteer = (volunteerMatches || []).find(
      (v) => normalizePhone(v.whatsapp || "") === phoneNormalized && v.organization_id
    );

    const orgCode = matchedVolunteer?.organizations?.invite_code ?? null;
    const orgName = matchedVolunteer?.organizations?.name ?? null;

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, orgCode, orgName }),
    });
    if (!webhookResponse.ok) {
      const text = await webhookResponse.text();
      throw new Error(`Erro ao acionar n8n: ${webhookResponse.status} ${text}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
