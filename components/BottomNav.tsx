'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Beranda', href: '/', icon: Home },
    { name: 'Mencari', href: '/search', icon: Search },
    { name: 'Pustaka', href: '/library', icon: Library },
    { name: 'Developer', href: '/developer', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/40 backdrop-blur-xl border-t border-white/5 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors',
                isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
              )}
            >
              <div className={cn("px-4 py-1 rounded-full transition-all", isActive && "bg-white text-black")}>
                <item.icon className={cn("w-6 h-6", isActive && "fill-current")} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
