'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ScoutVoiceAssistant } from '@/components/Scout/ScoutVoiceAssistant';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isAuthPage = pathname === '/login';

  // Automatically close mobile nav on route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  if (isAuthPage) {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Left Sidebar (Desktop fixed, Mobile sliding drawer) */}
      <Sidebar
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header onOpenMobileMenu={() => setIsMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>

      {/* Global In-App Scout AI Voice & Chat Assistant */}
      <ScoutVoiceAssistant />
    </div>
  );
};
