import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if user dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after 30 seconds
      setTimeout(() => setShowPrompt(true), 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom">
      <Card className="p-4 shadow-2xl border-2 border-[#0D9488]/20 bg-white">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#0D9488] to-[#0F766E] rounded-lg flex items-center justify-center">
            <Download className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-[#0F172A] mb-1">{t('components.install_prompt.install_netraai_app', "Install NetraAI App")}</h3>
            <p className="text-sm text-[#64748B] mb-3">{t('components.install_prompt.install_our_app_for_1', "Install our app for quick access, offline support, and a better experience!")}</p>
            
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                className="flex-1 bg-gradient-to-r from-[#0D9488] to-[#0F766E] hover:from-[#0F766E] hover:to-[#065F46] text-white"
                size="sm"
              >{t('components.install_prompt.install_2', "Install")}</Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
              >{t('components.install_prompt.not_now_3', "Not Now")}</Button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </Card>
    </div>
  );
}
