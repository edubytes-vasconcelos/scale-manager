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

const hashCode = async (code: string, salt: string) => {
  const data = new TextEncoder().encode(`${code}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const buildEmail = (phoneNormalized: string) => `wa_${phoneNormalized}@whatsapp.local`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variaveis de ambiente nao configuradas.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const phone = payload.phone as string | undefined;
    const code = payload.code as string | undefined;

    if (!phone || !code) {
      return new Response(JSON.stringify({ error: "Telefone e codigo obrigatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneNormalized = normalizePhone(phone);

    const { data: otps, error: otpError } = await supabase
      .from("whatsapp_otp")
      .select("*")
      .eq("phone_normalized", phoneNormalized)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (otpError) throw otpError;

    const otp = otps && otps[0];
    if (!otp) {
      return new Response(JSON.stringify({ error: "Codigo nao encontrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (otp.attempts >= otp.max_attempts) {
      return new Response(JSON.stringify({ error: "Limite de tentativas excedido" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Codigo expirado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = await hashCode(code, otp.code_salt);
    if (expected !== otp.code_hash) {
      await supabase
        .from("whatsapp_otp")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otp.id);

      return new Response(JSON.stringify({ error: "Codigo invalido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("whatsapp_otp")
      .update({ used_at: new Date().toISOString() })
      .eq("id", otp.id);

    let authUserId: string | null = null;
    let userEmail: string | null = null;

    const { data: mapping } = await supabase
      .from("whatsapp_auth_users")
      .select("auth_user_id")
      .eq("phone_normalized", phoneNormalized)
      .limit(1);

    const mappedAuthUserId =
      mapping && mapping.length > 0 ? mapping[0].auth_user_id : null;

    const { data: volunteers } = await supabase
      .from("volunteers")
      .select("id, auth_user_id, email, whatsapp")
      .not("whatsapp", "is", null);

    const matchedVolunteer = (volunteers || []).find(
      (v) => normalizePhone(v.whatsapp || "") === phoneNormalized
    );

    if (matchedVolunteer?.auth_user_id) {
      authUserId = matchedVolunteer.auth_user_id;
    } else if (mappedAuthUserId) {
      authUserId = mappedAuthUserId;
    }

    if (!authUserId) {
      const email = buildEmail(phoneNormalized);
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { phone: phoneNormalized },
      });
      if (createError) throw createError;
      authUserId = created.user?.id ?? null;
      userEmail = email;

      if (!authUserId) throw new Error("Nao foi possivel criar usuario");
    }

    if (mappedAuthUserId && mappedAuthUserId !== authUserId) {
      await supabase
        .from("whatsapp_auth_users")
        .update({ auth_user_id: authUserId })
        .eq("phone_normalized", phoneNormalized);
    }

    if (!mappedAuthUserId) {
      await supabase
        .from("whatsapp_auth_users")
        .insert({
          phone,
          phone_normalized: phoneNormalized,
          auth_user_id: authUserId,
        });
    }

    if (authUserId) {
      await supabase.rpc("link_volunteer_by_phone", {
        p_phone: phoneNormalized,
        p_auth_user_id: authUserId,
      });
    }

    if (!userEmail) {
      const { data: userData } = await supabase.auth.admin.getUserById(authUserId!);
      userEmail = userData?.user?.email ?? null;
    }

    if (!userEmail) {
      throw new Error("Nao foi possivel identificar email para sessao");
    }

    // Generate a session via magic link (internal)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
    });
    if (linkError) throw linkError;

    const token = linkData?.properties?.email_otp;
    if (!token) throw new Error("Nao foi possivel gerar sessão");

    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      email: userEmail,
      token,
      type: "magiclink",
    });
    if (verifyError) throw verifyError;

    return new Response(JSON.stringify({ session: sessionData.session }), {
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
