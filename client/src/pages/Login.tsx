import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/providers/AuthProvider";
import { Loader2, ArrowRight } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthForm } from "@/hooks/use-auth-form";

export default function Login() {
  const [_, setLocation] = useLocation();
  const { session } = useAuth();
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
                alt="Logo – Gestor IASD"
                className="w-10 h-10"
                draggable={false}
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight font-display">
              {isSignUp ? "Criar Conta" : "Área de Membros"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Gestor de Escalas – IASD Bosque
            </p>
          </div>

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
                required
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
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="input-password"
              />
              {isSignUp && (
                <p className="text-xs text-muted-foreground ml-1">Mínimo de 6 caracteres</p>
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
            <button
              type="button"
              onClick={toggleAuthMode}
              className="text-sm text-primary font-medium hover:underline"
              data-testid="toggle-auth-mode"
            >
              {isSignUp ? "Já tenho uma conta" : "Não tenho conta – Cadastrar"}
            </button>
            
            {!isSignUp && (
              <Link href="/forgot-password">
                <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer block" data-testid="link-forgot-password">
                  Esqueci minha senha
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
