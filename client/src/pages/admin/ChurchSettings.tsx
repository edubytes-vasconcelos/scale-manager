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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-muted-foreground">
        Carregando configuracoes...
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
    if (error) return;
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
        title: "Codigo atualizado",
        description: "Compartilhe este codigo com os voluntarios.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Nao foi possivel gerar o codigo.",
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
    return `Use este codigo para vincular sua conta a igreja ${organizationName}: ${inviteCode}${linkText}`;
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
        title: "Codigo copiado",
      });
    } catch {
      toast({
        title: "Nao foi possivel copiar",
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
        Voce nao tem permissao para acessar as configuracoes da igreja.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracoes da igreja</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie o codigo de convite para novos voluntarios.
        </p>
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Igreja
            </Label>
            <p className="text-lg font-semibold">{organizationName}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Codigo de convite
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
              Compartilhe este codigo para que voluntarios vinculem a conta.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {inviteCode && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-muted-foreground mb-2">QR Code</p>
                <QRCodeCanvas value={joinUrl || inviteCode} size={120} bgColor="#ffffff" fgColor="#0f172a" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerateCode} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {inviteCode ? "Gerar novo codigo" : "Gerar codigo"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
