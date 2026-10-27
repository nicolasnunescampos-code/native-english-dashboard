import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share, Download } from 'lucide-react';
import { createPortal } from 'react-dom';

const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // 1. Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return; // Already installed
        }

        // 2. Handle Android (Chrome)
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 3. Handle iOS (Safari)
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        if (ios) {
            setIsIOS(true);
            // Show prompt immediately on iOS (or maybe wait a bit/check session storage)
            // For now, let's show it once per session or just show it if not dismissed
            const dismissed = sessionStorage.getItem('pwa-prompt-dismissed');
            if (!dismissed) {
                setShowPrompt(true);
            }
        }

        const handleManualOpen = () => {
            setShowPrompt(true);
        };
        window.addEventListener('open-pwa-install', handleManualOpen);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('open-pwa-install', handleManualOpen);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    if (!showPrompt) return null;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    return createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5">
            <div className="mx-auto max-w-md bg-card border rounded-xl shadow-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <img src="/login/pwa-192x192.png" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} alt="App Icon" className="h-8 w-8 object-contain" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">Instalar Native English</h3>
                            <p className="text-xs text-muted-foreground">Adicione o App à tela de início para acesso rápido.</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={handleDismiss}>
                        ✕
                    </Button>
                </div>

                {isStandalone ? (
                    <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-lg flex items-center gap-2">
                        <span>✅ O aplicativo já está instalado e funcionando no modo nativo!</span>
                    </div>
                ) : isIOS ? (
                    <div className="text-xs bg-secondary/30 p-3 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">1.</span>
                            <span>Toque no botão <Share className="inline h-3.5 w-3.5 mx-0.5" /> <b>Compartilhar</b> no Safari.</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">2.</span>
                            <span>Role e selecione <b>"Adicionar à Tela de Início"</b>.</span>
                        </div>
                    </div>
                ) : deferredPrompt ? (
                    <Button className="w-full gap-2 shadow-sm" onClick={handleInstallClick}>
                        <Download className="h-4 w-4" />
                        Instalar Aplicativo Agora
                    </Button>
                ) : (
                    <div className="text-xs bg-muted/60 p-3 rounded-lg space-y-1.5 text-muted-foreground">
                        <p className="font-medium text-foreground">Como instalar no seu navegador:</p>
                        <p>Clique no ícone de <b>computador com seta para baixo</b> na barra de endereços (ao lado dos favoritos) ou nos 3 pontinhos &gt; <em>"Instalar Native English"</em>.</p>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default PWAInstallPrompt;
