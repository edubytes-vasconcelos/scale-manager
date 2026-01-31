import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { showInstallPrompt, isPWAInstalled } from "@/lib/pwa";

export default function InstallPWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isPWAInstalled()) return;

    const handleInstallable = () => {
      setCanInstall(true);
      setTimeout(() => {
        const dismissedAt = localStorage.getItem('pwa-banner-dismissed-at');
        const dismissedRecently =
          dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000;
        if (!dismissedRecently) {
          setShowBanner(true);
        }
      }, 30000);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    return () => window.removeEventListener('pwa-installable', handleInstallable);
  }, []);

  const handleInstall = async () => {
    const installed = await showInstallPrompt();
    if (installed) {
      setShowBanner(false);
      setCanInstall(false);
    }
  };

  const dismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed-at', Date.now().toString());
  };

  if (!canInstall || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-primary to-blue-600 text-white p-4 shadow-2xl z-50 animate-in slide-in-from-bottom">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-lg">Instale nosso app!</h3>
          <p className="text-sm opacity-90">Acesso mais rápido e notificações</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleInstall}
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90"
          >
            <Download className="w-4 h-4 mr-2" />
            Instalar
          </Button>
          <button
            onClick={dismiss}
            className="p-2 hover:bg-white/20 rounded-lg"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
