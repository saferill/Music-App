'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a short delay to not annoy user immediately
      setTimeout(() => setShowPrompt(true), 5000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-[calc(10rem+env(safe-area-inset-bottom))] left-4 right-4 z-[60] md:bottom-24 md:left-auto md:right-8 md:w-80"
      >
        <div className="glass-panel-strong relative flex items-center gap-4 rounded-3xl p-4 shadow-2xl">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A59] text-black">
            <Download className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-white">Instal Sonara</h3>
            <p className="mt-0.5 text-xs text-white/60">Dapatkan pengalaman musik terbaik di HP kamu.</p>
          </div>
          <button
            onClick={handleInstall}
            className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:scale-105 active:scale-95"
          >
            Instal
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
