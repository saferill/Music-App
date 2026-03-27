import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles
import { BottomNav } from '@/components/BottomNav';
import { Player } from '@/components/Player';
import { AddToPlaylistModal } from '@/components/AddToPlaylistModal';
import { PWARegister } from '@/components/PWARegister';
import { BackgroundProvider } from '@/components/BackgroundProvider';
import { OnboardingGate } from '@/components/OnboardingGate';

export const metadata: Metadata = {
  title: 'Music App',
  description: 'Platform streaming musik modern dengan tampilan elegan',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Music App',
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
      <body
        className="min-h-screen overflow-x-hidden pb-[calc(9rem+env(safe-area-inset-bottom))] text-white antialiased md:pb-8 md:pt-24"
        suppressHydrationWarning
      >
        <BackgroundProvider />
        <PWARegister />
        <OnboardingGate />
        {children}
        <Player />
        <BottomNav />
        <AddToPlaylistModal />
      </body>
    </html>
  );
}
