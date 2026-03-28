import type {Metadata, Viewport} from 'next';
import Script from 'next/script';
import './globals.css'; // Global styles
import { BottomNav } from '@/components/BottomNav';
import { Player } from '@/components/Player';
import { AddToPlaylistModal } from '@/components/AddToPlaylistModal';
import { PWARegister } from '@/components/PWARegister';
import { BackgroundProvider } from '@/components/BackgroundProvider';
import { OnboardingGate } from '@/components/OnboardingGate';
import { InstallPrompt } from '@/components/InstallPrompt';

export const metadata: Metadata = {
  title: 'Sonara',
  description: 'Sonara adalah aplikasi streaming musik modern dengan tampilan elegan dan pengalaman personal.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sonara',
  },
  icons: {
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#120f18',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://www.google.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
      </head>
      <body
        className="min-h-screen overflow-x-hidden pb-[calc(9rem+env(safe-area-inset-bottom))] text-white antialiased md:pb-8 md:pt-24"
        suppressHydrationWarning
      >
        <Script src="https://www.youtube.com/iframe_api" strategy="beforeInteractive" />
        <BackgroundProvider />
        <PWARegister />
        <OnboardingGate />
        {children}
        <Player />
        <BottomNav />
        <AddToPlaylistModal />
        <InstallPrompt />
      </body>
    </html>
  );
}
