import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Loader2, LogOut, ChevronLeft } from "lucide-react";

type OnboardingView = "main" | "existing-church" | "create-church" | "join-with-code";

export default function Onboarding() {
  const [view, setView] = useState<OnboardingView>("main");
  const [churchName, setChurchName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { signOut, refreshVolunteerProfile, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (view !== "main") return;
    const hasJoinHint = localStorage.getItem("onboarding:join-code") === "1";
    const hasPhone = !!user?.user_metadata?.phone;
    if (hasJoinHint || hasPhone) {
      setView("join-with-code");
      localStorage.removeItem("onboarding:join-code");
    }
  }, [view, user]);

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!joinCode.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Informe o código da igreja.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc("join_organization_with_code", {
        p_code: joinCode.trim(),
      });
      if (error) throw error;

      toast({
        title: "Vinculo realizado",
        description: "Sua conta foi vinculada a igreja.",
      });

      await refreshVolunteerProfile();
    } catch (error: any) {
      toast({
        title: "Erro ao vincular",
        description: error.message || "Código inválido.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!churchName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome da igreja.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc("create_church_and_admin", {
        church_name: churchName.trim(),
      });

      if (error) throw error;

      toast({
        title: "Igreja criada!",
        description: "Sua igreja foi criada e você é o administrador.",
      });

      await refreshVolunteerProfile();
    } catch (error: any) {
      toast({
        title: "Erro ao criar igreja",
        description: error.message || "Não foi possível criar a igreja.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (view === "join-with-code") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("main")}
              className="w-fit mb-2"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Vincular com código
            </CardTitle>
            <CardDescription>
              Informe o código fornecido pela sua igreja (vale para e-mail ou WhatsApp).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinWithCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Código da igreja</label>
                <Input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Ex: IGR-7F3A"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  "Vincular"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === "existing-church") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("main")}
              className="w-fit mb-2"
              data-testid="button-back"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Já pertenço a uma igreja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Se você já faz parte de uma igreja cadastrada no sistema, peça ao administrador
              para adicionar seu e-mail ou WhatsApp na lista de voluntários. Se tiver um código,
              use a opção "Vincular com código".
            </p>
            <p className="text-muted-foreground">
              Após o administrador vincular seu contato, faça logout e login novamente
              para acessar o sistema.
            </p>
            <div className="pt-4">
              <Button variant="outline" onClick={signOut} className="w-full" data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Fazer Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === "create-church") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("main")}
              className="w-fit mb-2"
              data-testid="button-back-create"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Criar nova igreja
            </CardTitle>
            <CardDescription>
              Você será o administrador desta igreja
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateChurch} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Igreja</label>
                <Input
                  type="text"
                  required
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  placeholder="Ex: IASD Central"
                  data-testid="input-church-name"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full" data-testid="button-create-church">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Igreja"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4 mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <CardTitle>Sem organização vinculada</CardTitle>
          <CardDescription>
            Sua conta não está vinculada a nenhuma igreja. Escolha uma opção abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={() => setView("join-with-code")}
            data-testid="button-join-code"
          >
            <Users className="w-5 h-5 mr-3 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium">Vincular com código</div>
              <div className="text-xs text-muted-foreground">Use o código enviado pela igreja</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={() => setView("existing-church")}
            data-testid="button-existing-church"
          >
            <Users className="w-5 h-5 mr-3 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium">Já pertenço a uma igreja</div>
              <div className="text-xs text-muted-foreground">Peça ao administrador para me adicionar</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={() => setView("create-church")}
            data-testid="button-new-church"
          >
            <Building2 className="w-5 h-5 mr-3 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium">Criar nova igreja</div>
              <div className="text-xs text-muted-foreground">Serei o administrador</div>
            </div>
          </Button>

          <div className="pt-4 border-t">
            <Button variant="ghost" onClick={signOut} className="w-full text-muted-foreground" data-testid="button-logout-main">
              <LogOut className="w-4 h-4 mr-2" />
              Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
