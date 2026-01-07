import { useCallback, useState, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle, signInWithPassword, signUpWithEmail } from "@/services/auth";

export function useAuthForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        const { data, error } = await signInWithPassword(email, password);

        if (error) throw error;

        if (data.session) {
          toast({
            title: "Bem-vindo de volta!",
            description: "Login realizado com sucesso.",
          });
        }
      } catch (error: any) {
        toast({
          title: "Erro no login",
          description: error.message || "Verifique suas credenciais e tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
      }
    },
    [email, password, toast]
  );

  const handleSignUp = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        toast({
          title: "Nome obrigat¢rio",
          description: "Por favor, informe seu nome completo.",
          variant: "destructive",
        });
        return;
      }

      if (password.length < 6) {
        toast({
          title: "Senha muito curta",
          description: "A senha deve ter pelo menos 6 caracteres.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      try {
        const { data: authData, error: authError } = await signUpWithEmail(
          email,
          password,
          name
        );

        if (authError) throw authError;

        if (authData.user) {
          toast({
            title: "Cadastro realizado!",
            description: "Sua conta foi criada com sucesso.",
          });
        }
      } catch (error: any) {
        toast({
          title: "Erro no cadastro",
          description: error.message || "NÆo foi poss¡vel criar sua conta.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [email, name, password, toast]
  );

  const handleGoogleLogin = useCallback(async () => {
    setSocialLoading(true);
    try {
      const { error } = await signInWithGoogle();

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro ao entrar com Google",
        description: error.message || "NÆo foi poss¡vel conectar com o Google.",
        variant: "destructive",
      });
    } finally {
      setSocialLoading(false);
    }
  }, [toast]);

  const toggleAuthMode = useCallback(() => {
    setIsSignUp((prev) => !prev);
    setName("");
    setPassword("");
  }, []);

  return {
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
  };
}
