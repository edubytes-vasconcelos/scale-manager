import { useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          // 🔐 URL fixa (evita edge case de proxy / porta / origin)
          redirectTo: "https://voluntario.seventech.cloud/reset-password",
        }
      );

      if (error) throw error;

      // 🧠 Marca o momento do pedido (usado para detectar scanner depois)
      sessionStorage.setItem(
        "recovery_requested_at",
        Date.now().toString()
      );

      setSent(true);

      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir a senha.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description:
          error.message || "Não foi possível enviar o email de recuperação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-black/5 border border-white/50 dark:border-slate-700 p-8 md:p-10">
          {sent ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 text-green-600 mb-6">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3 font-display">
                Email Enviado!
              </h1>
              <p className="text-muted-foreground mb-6">
                Enviamos um link de recuperação para{" "}
                <strong className="text-foreground">{email}</strong>.
                <br />
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Se usar email corporativo, evite abrir em pré-visualização.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                O link é válido por tempo limitado (aprox. 1 hora).
              </p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => setSent(false)}
                  className="w-full"
                  data-testid="button-resend"
                >
                  Enviar novamente
                </Button>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="w-full"
                    data-testid="button-back-to-login"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
                  <Mail className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2 font-display">
                  Recuperar Senha
                </h1>
              <p className="text-muted-foreground text-sm">
                Digite seu email para receber um link de recuperação
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                O link costuma expirar em cerca de 1 hora. Verifique também a pasta de spam.
              </p>
            </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground/80 ml-1">
                    E-mail
                  </label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    data-testid="input-recovery-email"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-6 text-lg"
                  data-testid="button-send-recovery"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Link de Recuperação"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login">
                  <span className="text-sm text-primary font-medium hover:underline cursor-pointer inline-flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao login
                  </span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
