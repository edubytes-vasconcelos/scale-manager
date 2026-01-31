import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { Loader2, ArrowRight } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthForm } from "@/hooks/use-auth-form";

export default function Login() {
  const [_, setLocation] = useLocation();
  const { session } = useAuth();
  const { toast } = useToast();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const [authMethod, setAuthMethod] = useState<"email" | "whatsapp">("email");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappCode, setWhatsappCode] = useState("");
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [whatsappCountdown, setWhatsappCountdown] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [codeExpiresIn, setCodeExpiresIn] = useState(0);
  const [codeRequestedAt, setCodeRequestedAt] = useState(0);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const {
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    loading,
    socialLoading,
    isSignUp,
    handleLogin,
    handleSignUp,
    handleGoogleLogin,
    toggleAuthMode,
  } = useAuthForm();

  useEffect(() => {
    if (session) {
      setLocation("/");
    }
  }, [session, setLocation]);

  const normalizePhone = (value: string) => value.replace(/\D/g, "");

  const formatPhone = (value: string) => {
    const digits = normalizePhone(value).slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7)
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const countdownLabel = useMemo(() => {
    const minutes = Math.floor(whatsappCountdown / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (whatsappCountdown % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [whatsappCountdown]);

  const handleRequestWhatsappCode = async () => {
    const phone = normalizePhone(whatsappPhone);
    if (phone.length < 10) {
      toast({
        title: "Telefone invalido",
        description: "Informe um WhatsApp valido.",
        variant: "destructive",
      });
      return;
    }

    setWhatsappLoading(true);
    try {
      const { error } = await supabase.functions.invoke("request-whatsapp-otp", {
        body: { phone: whatsappPhone },
        headers: anonKey
          ? {
              Authorization: `Bearer ${anonKey}`,
              apikey: anonKey,
            }
          : undefined,
      });
      if (error) throw error;
      setWhatsappSent(true);
      setWhatsappCountdown(60);
      setCodeRequestedAt(Date.now());
      setCodeExpiresIn(5 * 60);
      toast({
        title: "Codigo enviado",
        description: "Confira seu WhatsApp.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar codigo",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleVerifyWhatsappCode = async () => {
    const phone = normalizePhone(whatsappPhone);
    if (phone.length < 10 || !whatsappCode.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Informe telefone e codigo.",
        variant: "destructive",
      });
      return;
    }

    setWhatsappLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-whatsapp-otp", {
        body: { phone: whatsappPhone, code: whatsappCode.trim() },
        headers: anonKey
          ? {
              Authorization: `Bearer ${anonKey}`,
              apikey: anonKey,
            }
          : undefined,
      });
      if (error) throw error;
      if (!data?.session) throw new Error("Sessao nao retornada");

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      localStorage.setItem("onboarding:join-code", "1");
      setWhatsappCode("");
      setWhatsappCountdown(0);
      setCodeRequestedAt(0);
      setCodeExpiresIn(0);
      toast({
        title: "Acesso liberado",
        description: "Bem-vindo!",
      });
    } catch (error: any) {
      toast({
        title: "Codigo invalido",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setWhatsappLoading(false);
    }
  };

  const switchToEmail = () => {
    if (isSignUp) toggleAuthMode();
    setWhatsappSent(false);
    setWhatsappCode("");
    setWhatsappCountdown(0);
    setCodeRequestedAt(0);
    setCodeExpiresIn(0);
    setAuthMethod("email");
  };

  const switchToWhatsapp = () => {
    if (isSignUp) toggleAuthMode();
    setWhatsappSent(false);
    setWhatsappCode("");
    setWhatsappCountdown(0);
    setCodeRequestedAt(0);
    setCodeExpiresIn(0);
    setAuthMethod("whatsapp");
  };

  useEffect(() => {
    if (!whatsappSent || whatsappCountdown <= 0) return;
    const interval = setInterval(() => {
      setWhatsappCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [whatsappSent, whatsappCountdown]);

  useEffect(() => {
    if (!whatsappSent || codeExpiresIn <= 0) return;
    const interval = setInterval(() => {
      setCodeExpiresIn((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [whatsappSent, codeExpiresIn]);

  useEffect(() => {
    if (!whatsappSent || codeExpiresIn !== 0) return;
    if (authMethod !== "whatsapp" || session) return;
    setWhatsappSent(false);
    setWhatsappCode("");
    setWhatsappCountdown(0);
    toast({
      title: "Código expirado",
      description: "Solicite um novo código para continuar.",
      variant: "destructive",
    });
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        '[data-testid="input-whatsapp-phone"]'
      );
      input?.focus();
    }, 0);
  }, [whatsappSent, codeExpiresIn, toast]);

  useEffect(() => {
    if (whatsappSent) {
      setTimeout(() => codeInputRef.current?.focus(), 0);
    }
  }, [whatsappSent]);

  const codeExpiresLabel = useMemo(() => {
    const minutes = Math.floor(codeExpiresIn / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (codeExpiresIn % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [codeExpiresIn]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-black/5 border border-white/50 dark:border-slate-700 p-8 md:p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <img
                src="/brand/logo-256.png"
                alt="Logo - Gestor IASD"
                className="w-10 h-10"
                draggable={false}
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight font-display">
              {isSignUp ? "Criar Conta" : "Área de Membros"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Gestor de Escalas - IASD Bosque
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <Button
              type="button"
              variant={authMethod === "email" ? "default" : "outline"}
              onClick={switchToEmail}
            >
              Email
            </Button>
            <Button
              type="button"
              variant={authMethod === "whatsapp" ? "default" : "outline"}
              onClick={switchToWhatsapp}
            >
              WhatsApp
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            Sem e-mail? Use o WhatsApp para receber um código de acesso.
          </p>

          {authMethod === "email" ? (
            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 ml-1">
                  Nome Completo
                </label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  data-testid="input-signup-name"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80 ml-1">
                E-mail
              </label>
              <Input
                type="email"
                required={authMethod === "email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80 ml-1">
                Senha
              </label>
              <Input
                type="password"
                required={authMethod === "email"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                data-testid="input-password"
              />
              {isSignUp && (
                <p className="text-xs text-muted-foreground ml-1">Mínimo de 6 caracteres</p>
              )}
              {!isSignUp && (
                <p className="text-xs text-muted-foreground ml-1">
                  Mínimo de 6 caracteres
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 text-lg mt-4"
              data-testid={isSignUp ? "button-signup" : "button-login"}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {isSignUp ? "Criando conta..." : "Entrando..."}
                </>
              ) : (
                <>
                  {isSignUp ? "Criar Conta" : "Acessar Sistema"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80 ml-1">
                  WhatsApp
                </label>
                <Input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(formatPhone(e.target.value))}
                  placeholder="(11) 91234-5678"
                  data-testid="input-whatsapp-phone"
                />
                <p className="text-xs text-muted-foreground ml-1">
                  Digite seu WhatsApp para receber o código de verificação.
                </p>
              </div>

              {whatsappSent && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground/80 ml-1">
                    Código
                  </label>
                  <Input
                    value={whatsappCode}
                    onChange={(e) => setWhatsappCode(e.target.value)}
                    placeholder="Digite o código recebido"
                    data-testid="input-whatsapp-code"
                    ref={codeInputRef}
                  />
                  <p className="text-xs text-muted-foreground ml-1">
                    O código expira em {codeExpiresLabel}.
                  </p>
                </div>
              )}
              {whatsappCountdown === 0 && whatsappSent === false && codeRequestedAt > 0 && (
                <p className="text-xs text-destructive ml-1">
                  Código expirado. Envie um novo código para continuar.
                </p>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRequestWhatsappCode}
                  disabled={whatsappLoading || whatsappCountdown > 0}
                  className={
                    whatsappCountdown === 0 && !whatsappSent && codeRequestedAt > 0
                      ? "border-destructive text-destructive hover:text-destructive"
                      : undefined
                  }
                >
                  {whatsappLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {whatsappSent
                    ? whatsappCountdown > 0
                      ? `Reenviar em ${countdownLabel}`
                      : "Reenviar código"
                    : "Enviar código"}
                </Button>
                <Button
                  type="button"
                  onClick={handleVerifyWhatsappCode}
                  disabled={!whatsappSent || whatsappLoading}
                >
                  {whatsappLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Entrar
                </Button>
                <div className="flex flex-col gap-2 text-center">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setShowHelp(true)}
                  >
                    Não recebi o código
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary"
                    onClick={() => {
                      setWhatsappPhone("");
                      setWhatsappCode("");
                      setWhatsappSent(false);
                      setWhatsappCountdown(0);
                      setCodeRequestedAt(0);
                      setCodeExpiresIn(0);
                    }}
                  >
                    Atualizar número
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="relative my-6">
            <Separator className="my-4" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 px-3 text-xs text-muted-foreground">
              ou continue com
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={socialLoading || loading}
            className="w-full py-5"
            data-testid="button-google-login"
          >
            {socialLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <SiGoogle className="w-4 h-4 mr-2" />
            )}
            Google
          </Button>
          
          <div className="mt-8 text-center space-y-3">
            {authMethod === "email" && (
              <button
                type="button"
                onClick={toggleAuthMode}
                className="text-sm text-primary font-medium hover:underline"
                data-testid="toggle-auth-mode"
              >
                {isSignUp ? "Já tenho uma conta" : "Não tenho conta - Cadastrar"}
              </button>
            )}
            
            {!isSignUp && authMethod === "email" && (
              <Link href="/forgot-password">
                <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer block" data-testid="link-forgot-password">
                  Esqueci minha senha
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Não recebi o código</DialogTitle>
            <DialogDescription>
              Confira algumas dicas rápidas:
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Verifique se o WhatsApp está com conexão.</li>
            <li>• Confirme se o número digitado está correto.</li>
            <li>• Aguarde até 1 minuto e tente reenviar.</li>
          </ul>
          <DialogFooter>
            <Button onClick={() => setShowHelp(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
