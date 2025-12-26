import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "loading" | "ready" | "error" | "success";

function detectLikelyEmailScanner() {
  const hash = window.location.hash;
  if (!hash.includes("error_code=otp_expired")) return false;

  const requestedAt = sessionStorage.getItem("recovery_requested_at");
  if (!requestedAt) return false;

  const elapsed = Date.now() - Number(requestedAt);

  // Menos de 2 minutos → scanner ou preview
  return elapsed < 2 * 60 * 1000;
}

export default function ResetPassword() {
  const [status, setStatus] = useState<Status>("loading");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function init() {
      const hash = window.location.hash;

      // ❌ Erro vindo do Supabase
      if (hash.includes("error=")) {
        const isScanner = detectLikelyEmailScanner();

        setMessage(
          isScanner
            ? "Detectamos que seu email pode ter sido verificado automaticamente por um sistema de segurança. Isso invalida o link. Gere um novo e clique apenas uma vez."
            : "Link inválido ou expirado. Solicite um novo link."
        );

        setStatus("error");
        return;
      }

      // 🔁 Trocar code por sessão
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (error) {
        setMessage("Link inválido ou expirado. Solicite um novo link.");
        setStatus("error");
        return;
      }

      setStatus("ready");
    }

    init();
  }, []);

  async function handleReset() {
    if (password.length < 6) {
      setMessage("A senha deve ter no mínimo 6 caracteres.");
      setStatus("error");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage("Erro ao redefinir a senha.");
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Validando link...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-background p-8 rounded-xl shadow text-center max-w-sm">
          <h2 className="text-xl font-semibold mb-2">Não foi possível redefinir</h2>
          <p className="text-muted-foreground mb-4">{message}</p>
          <Button onClick={() => (window.location.href = "/forgot-password")}>
            Gerar novo link
          </Button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-background p-8 rounded-xl shadow max-w-sm w-full">
        <h2 className="text-xl font-semibold mb-4 text-center">
          Redefinir senha
        </h2>

        <Input
          type="password"
          placeholder="Nova senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
        />

        <Button className="w-full" onClick={handleReset}>
          Salvar nova senha
        </Button>
      </div>
    </div>
  );
}
