import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saferill.musicapp',
  appName: 'Sonara',
  webDir: 'out',
  server: {
    url: 'https://musicapp-lime.vercel.app',
    cleartext: true
  }
};

export default config;
