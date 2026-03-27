'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const syncServiceWorker = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();

      if (process.env.NODE_ENV !== 'production') {
        await Promise.all(registrations.map((registration) => registration.unregister()));
        return;
      }

      await Promise.all(registrations.map((registration) => registration.unregister()));

      navigator.serviceWorker.register('/sw.js?v=melolo-v2').catch((err) => {
        console.error('Service Worker registration failed: ', err);
      });
    };

    void syncServiceWorker();
  }, []);

  return null;
}
