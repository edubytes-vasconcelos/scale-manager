import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "loading" | "ready" | "error" | "success";

export default function ResetPassword() {
  const [status, setStatus] = useState<Status>("loading");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function init() {
      // 🔴 1. TRATAR ERRO DIRETO DO HASH (ANTES DE QUALQUER COISA)
      const hash = window.location.hash;

      if (hash.includes("error=")) {
        const params = new URLSearchParams(hash.replace("#", ""));
        const description =
          params.get("error_description") ||
          "Link inválido ou expirado. Solicite um novo link.";

        setMessage(description.replace(/\+/g, " "));
        setStatus("error");
        return;
      }

      // 🔵 2. CONSUMIR TOKEN DO SUPABASE
      const { data, error } = await supabase.auth.getSessionFromUrl({
        storeSession: true,
      });

      if (error || !data?.session) {
        setMessage("Link inválido ou expirado. Solicite um novo link.");
        setStatus("error");
        return;
      }

      setStatus("ready");
    }

    init();
  }, []);

  async function handleReset() {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage("Erro ao redefinir a senha.");
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  // 🔄 LOADING
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Validando link...</p>
      </div>
    );
  }

  // ❌ ERRO
  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-background p-8 rounded-xl shadow text-center max-w-sm">
          <h2 className="text-xl font-semibold mb-2">Link inválido</h2>
          <p className="text-muted-foreground mb-4">{message}</p>
          <a
            href="/forgot-password"
            className="text-primary hover:underline"
          >
            Solicitar novo link
          </a>
        </div>
      </div>
    );
  }

  // ✅ SUCESSO
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-background p-8 rounded-xl shadow text-center max-w-sm">
          <h2 className="text-xl font-semibold mb-2">Senha alterada</h2>
          <p className="text-muted-foreground mb-4">
            Sua senha foi redefinida com sucesso.
          </p>
          <a href="/login" className="text-primary hover:underline">
            Ir para login
          </a>
        </div>
      </div>
    );
  }

  // 🔐 FORMULÁRIO
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div class
