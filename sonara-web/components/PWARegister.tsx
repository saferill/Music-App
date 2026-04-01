'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (confirm('Aplikasi versi baru tersedia. Muat ulang sekarang?')) {
                window.location.reload();
              }
            }
          });
        });
      } catch (err) {
        console.error('Service Worker registration failed: ', err);
      }
    };

    void registerSW();
  }, []);

  return null;
}
