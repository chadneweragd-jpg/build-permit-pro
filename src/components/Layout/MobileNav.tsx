'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Map, FileText, Route, Kanban, Settings } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mobileView = searchParams.get('mobileView');

  // Don't render on auth or fullscreen drive modes if marked
  if (pathname === '/login') return null;

  const navItems = [
    {
      label: 'Map',
      href: '/search?mobileView=map',
      icon: Map,
      isActive: pathname === '/search' && mobileView === 'map'
    },
    {
      label: 'Intel',
      href: '/search?mobileView=list',
      icon: FileText,
      isActive: pathname === '/search' && mobileView !== 'map'
    },
    {
      label: 'Scout',
      href: '/routes',
      icon: Route,
      isActive: pathname.startsWith('/routes')
    },
    {
      label: 'Pipeline',
      href: '/pipeline',
      icon: Kanban,
      isActive: pathname === '/pipeline'
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      isActive: pathname === '/settings'
    }
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 md:hidden safe-area-bottom shadow-2xl"
    >
      <div className="grid grid-cols-5 h-14 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[48px] h-full transition-colors ${
                item.isActive
                  ? 'text-blue-600 dark:text-blue-400 font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${item.isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
