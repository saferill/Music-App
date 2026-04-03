'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, Search, History, PlayCircle, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Beranda', href: '/', icon: Home },
  { name: 'Cari', href: '/search', icon: Search },
  { name: 'Pustaka', href: '/library', icon: Library },
];

const actionItems = [
  { name: 'Riwayat', href: '/history', icon: History },
  { name: 'Top 50', href: '/top50', icon: PlayCircle },
  { name: 'Pengaturan', href: '/settings', icon: Settings2 },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-4 z-40 hidden md:block">
        <div className="page-shell">
          <div className="pointer-events-auto flex items-center justify-between gap-5 rounded-full border border-white/8 bg-black/78 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#15121b] shadow-lg">
                <Image src="/icon.svg" alt="Sonara logo" fill sizes="44px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.38em] text-white/35">Sonara Music</div>
                <div className="truncate text-lg font-semibold text-white">Web Player</div>
              </div>
            </Link>

            <nav className="flex items-center gap-2 rounded-full bg-[#121212] p-1">
              {navItems.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-[var(--accent)] text-black shadow-[var(--accent-glow)]'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <item.icon className="h-4 w-4" strokeWidth={2.2} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {actionItems.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'bg-[#121212] text-white/70 hover:bg-[#1a1a1a] hover:text-white'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
        <div className="glass-panel pointer-events-auto rounded-[28px] border border-white/8 bg-black/78 px-2 py-2 shadow-2xl backdrop-blur-xl">
          <div className="grid h-16 grid-cols-3 gap-1">
            {navItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex h-full flex-col items-center justify-center gap-1 rounded-[22px] transition-colors',
                    isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-full px-3 py-1 transition-all',
                      isActive && 'bg-[var(--accent)] text-black shadow-[var(--accent-glow)]'
                    )}
                  >
                    <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2.1} />
                  </div>
                  <span className="text-[10px] font-medium leading-none">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
