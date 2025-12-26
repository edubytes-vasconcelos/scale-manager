import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPassword() {
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "success"
  >("loading");

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getSessionFromUrl({
        storeSession: true,
      });

      if (error) {
        setError("Link inválido ou expirado. Solicite um novo link.");
        setStatus("error");
        return;
      }

      if (data?.session) {
        setStatus("ready");
        return;
      }

      // fallback de segurança
      setError("Não foi possível validar o link de recuperação.");
      setStatus("error");
    }

    init();
  }, []);

  async function handleReset() {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError("Erro ao redefinir a senha.");
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
      <div class
