'use client';

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

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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

    return createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5">
            <div className="mx-auto max-w-md bg-background border rounded-xl shadow-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <img src="/pwa-192x192.png" alt="App Icon" className="h-8 w-8 object-contain" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">Install Native English</h3>
                            <p className="text-xs text-muted-foreground">Add to home screen for quick access.</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={handleDismiss}>
                        ✕
                    </Button>
                </div>

                {isIOS ? (
                    <div className="text-sm bg-secondary/50 p-3 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">1.</span>
                            <span>Tap the <Share className="inline h-4 w-4" /> Share button.</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">2.</span>
                            <span>Select <span className="font-semibold">Add to Home Screen</span>.</span>
                        </div>
                    </div>
                ) : (
                    <Button className="w-full gap-2" onClick={handleInstallClick}>
                        <Download className="h-4 w-4" />
                        Install App
                    </Button>
                )}
            </div>
        </div>,
        document.body
    );
};

export default PWAInstallPrompt;