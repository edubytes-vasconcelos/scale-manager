import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function init() {
      const hash = window.location.hash;

      // ❌ Erro vindo do Supabase
      if (hash.includes("error=") || hash.includes("error_code=")) {
        const isScanner = detectLikelyEmailScanner();

        setMessage(
          isScanner
            ? "Detectamos que seu email pode ter sido verificado automaticamente por um sistema de segurança. Isso invalida o link. Gere um novo e clique apenas uma vez."
            : "Link inválido ou expirado. Solicite um novo link."
        );

        setStatus("error");
        return;
      }

      // ✅ Verificar se o usuário está autenticado via PASSWORD_RECOVERY
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setMessage("Link inválido ou expirado. Solicite um novo link.");
        setStatus("error");
        return;
      }

      // ✅ Verificar se é sessão de recovery
      // O Supabase cria uma sessão temporária quando o usuário clica no link
      setStatus("ready");
    }

    // Listener para o evento de auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setStatus("ready");
      }
    });

    init();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      setMessage("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      return;
    }

    setStatus("loading");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error("Erro ao redefinir senha:", error);
      setMessage(error.message || "Erro ao redefinir a senha.");
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl text-center max-w-sm">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Validando link...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 text-red-600 mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Não foi possível redefinir</h2>
          <p className="text-muted-foreground mb-4">{message}</p>
          <Button onClick={() => (window.location.href = "/forgot-password")} className="w-full">
            Gerar novo link
          </Button>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 text-green-600 mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2 font-display">Senha alterada!</h2>
          <p className="text-muted-foreground mb-6">
            Sua senha foi redefinida com sucesso. Você já pode fazer login com a nova senha.
          </p>
          <Button 
            onClick={() => window.location.href = "/login"}
            className="w-full"
          >
            Ir para login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-3xl" />
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-md w-full relative z-10">
        <h2 className="text-2xl font-bold mb-6 text-center font-display">
          Redefinir senha
        </h2>

        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground/80 ml-1">
              Nova senha
            </label>
            <Input
              type="password"
              placeholder="Digite sua nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground/80 ml-1">
              Confirmar senha
            </label>
            <Input
              type="password"
              placeholder="Digite novamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {message && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {message}
            </p>
          )}

          <Button type="submit" className="w-full py-6 text-lg">
            Salvar nova senha
          </Button>
        </form>
      </div>
    </div>
  );
}
