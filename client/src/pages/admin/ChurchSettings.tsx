import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useVolunteerProfile } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, Share2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

export default function ChurchSettings() {
  const { data: profile } = useVolunteerProfile();
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState<string>("");
  const [loading, setLoading] = useState(false);

  if (!profile) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Carregando configurações...
      </div>
    );
  }

  const isAdmin = profile.accessLevel === "admin";
  const leaderMinistryIds =
    profile.ministryAssignments
      ?.filter((m) => m.isLeader)
      .map((m) => m.ministryId) || [];

  const isLeader = leaderMinistryIds.length > 0;
  const organizationName = profile.organization?.name || "Igreja";

  const fetchInviteCode = async () => {
    if (!profile?.organizationId) return;
    const { data, error } = await supabase
      .from("organizations")
      .select("invite_code")
      .eq("id", profile.organizationId)
      .single();
    if (error) {
      toast({
        title: "Erro ao carregar código",
        description: "Não foi possível buscar o código de convite.",
        variant: "destructive",
      });
      return;
    }
    setInviteCode(data?.invite_code || "");
  };

  const handleGenerateCode = async () => {
    if (!profile?.organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("generate_org_invite_code", {
        p_org_id: profile.organizationId,
      });
      if (error) throw error;
      setInviteCode(data || "");
      toast({
        title: "Código atualizado",
        description: "Compartilhe este código com os voluntários.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível gerar o código.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinUrl = inviteCode
    ? `${window.location.origin}/?joinCode=${inviteCode}`
    : "";

  const buildShareMessage = () => {
    if (!inviteCode) return "";
    const linkText = joinUrl ? `
Link: ${joinUrl}` : "";
    return `Use este código para vincular sua conta à igreja ${organizationName}: ${inviteCode}${linkText}`;
  };

  const handleShareWhatsApp = () => {
    if (!inviteCode) return;
    const message = encodeURIComponent(buildShareMessage());
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };


  const handleCopy = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      toast({
        title: "Código copiado",
      });
    } catch {
      toast({
        title: "Não foi possível copiar",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchInviteCode();
  }, [profile?.organizationId]);

  if (!isAdmin && !isLeader) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Você não tem permissão para acessar as configurações da igreja.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracoes da igreja</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie o código de convite para novos voluntários.
        </p>
      </div>

      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Igreja
            </Label>
            <p className="text-lg font-semibold">{organizationName}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Código de convite
            </Label>
            <div className="flex flex-wrap gap-2">
              <Input value={inviteCode} readOnly className="max-w-xs" />
              <Button variant="outline" onClick={handleCopy} disabled={!inviteCode}>
                <Copy className="w-4 h-4 mr-2" /> Copiar
              </Button>
              <Button variant="outline" onClick={handleShareWhatsApp} disabled={!inviteCode}>
                <Share2 className="w-4 h-4 mr-2" /> Compartilhar WhatsApp
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Compartilhe este código para que voluntários vinculem a conta.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {inviteCode && (
              <div className="rounded-xl border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground mb-2">QR Code</p>
                <QRCodeCanvas value={joinUrl || inviteCode} size={120} bgColor="#ffffff" fgColor="#0f172a" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerateCode} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {inviteCode ? "Gerar novo código" : "Gerar código"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

