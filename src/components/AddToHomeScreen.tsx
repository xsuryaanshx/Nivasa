import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Share, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AddToHomeScreen = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    // Check for iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const hasDismissed = localStorage.getItem('a2hs-dismissed');
      if (!hasDismissed) {
        setShowPrompt(true);
      }
    };

    const handleTrigger = () => {
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('trigger-a2hs', handleTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('trigger-a2hs', handleTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('a2hs-dismissed', 'true');
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-50 p-4 bg-background border rounded-xl shadow-lg flex items-center justify-between gap-4"
        >
          <div className="flex-1 flex flex-col gap-1">
            <h3 className="font-semibold text-sm">Install Nivasa</h3>
            <p className="text-xs text-muted-foreground">
              {isIOS ? (
                <>
                  Tap <Share className="inline-block w-3 h-3 mx-1" /> and select <strong>Add to Home Screen</strong>.
                </>
              ) : (
                "Add to your home screen for a better experience."
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {!isIOS && (
              <Button size="sm" onClick={handleInstallClick} className="rounded-full h-8 px-3 text-xs">
                <Download className="w-3 h-3 mr-1" />
                Install
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={handleDismiss} className="w-8 h-8 rounded-full">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
