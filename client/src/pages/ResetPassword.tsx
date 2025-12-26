import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function initRecovery() {
      // 🔥 ESSENCIAL: consome o token do link
      const { data, error } = await supabase.auth.getSessionFromUrl({
        storeSession: true,
      });

      if (error) {
        setError("Link inválido ou expirado. Solicite um novo link.");
        return;
      }

      if (data.session) {
        setReady(true);
      }
    }

    initRecovery();
  }, []);

  async function handleReset() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError("Erro ao redefinir a senha.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-background p-8 rounded-xl shadow max-w-sm text-center">
          <h2 className="text-xl font-semibold mb-2">Link inválido</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
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

  if (!ready) {
    return null;
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-background p-8 rounded-xl shadow max-w-sm text-center">
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
        />

        <Button
          className="w-full mt-4"
          onClick={handleReset}
          disabled={loading}
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </div>
    </div>
  );
}
