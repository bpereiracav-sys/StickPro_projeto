import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download, X } from 'lucide-react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Listen for install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 30 seconds or if user has visited before
      const hasVisited = localStorage.getItem('stickpro-visited');
      if (hasVisited) {
        setShowPrompt(true);
      } else {
        localStorage.setItem('stickpro-visited', 'true');
        setTimeout(() => setShowPrompt(true), 30000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show iOS prompt if not standalone
    if (ios && !standalone) {
      const iosPromptShown = localStorage.getItem('stickpro-ios-prompt');
      if (!iosPromptShown) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('stickpro-ios-prompt', 'true');
    }
  };

  // Don't show if already installed
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-4">
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <img src="/icons/icon-72x72.png" alt="Stick Pro" className="w-10 h-10 rounded" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Instalar Stick Pro</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isIOS 
              ? 'Toque no ícone de partilha e "Adicionar ao Ecrã Inicial"'
              : 'Instale a app para acesso rápido e funcionar offline'
            }
          </p>
        </div>
      </div>
      
      {!isIOS && deferredPrompt && (
        <Button 
          onClick={handleInstall} 
          className="w-full mt-3"
          size="sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Instalar App
        </Button>
      )}
    </div>
  );
}

// Service Worker Registration
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('[PWA] New version available');
              }
            });
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });
  }
}
