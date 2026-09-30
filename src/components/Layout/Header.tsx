'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Menu } from 'lucide-react';
import { CitySelector } from './CitySelector';
import { BPPLogo } from '@/components/Common/BPPLogo';
import { AuthService, UserProfile } from '@/lib/auth-service';

interface HeaderProps {
  onSearchSubmit?: (query: string) => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchSubmit, onOpenMobileMenu }) => {
  const router = useRouter();
  const [searchVal, setSearchVal] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile>(AuthService.getActiveUserSync());

  // Keep active user synchronized
  useEffect(() => {
    const syncUser = async () => {
      const u = await AuthService.getCurrentUser();
      setCurrentUser(u);
    };
    syncUser();

    const handleUserChange = () => syncUser();
    window.addEventListener('bpp_user_changed', handleUserChange);
    return () => window.removeEventListener('bpp_user_changed', handleUserChange);
  }, []);

  // Initialize searchVal from URL on mount & sync on external reset
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialQ = new URLSearchParams(window.location.search).get('q');
      if (initialQ) {
        setSearchVal(initialQ);
      }
    }

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ query: string }>;
      if (typeof customEvent.detail?.query === 'string') {
        setSearchVal(customEvent.detail.query);
      }
    };

    window.addEventListener('bpp:global-search-sync', handleSync);
    return () => window.removeEventListener('bpp:global-search-sync', handleSync);
  }, []);

  // 250ms debounced live search broadcast & URL sync
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('bpp:global-search', { detail: { query: searchVal } })
        );

        if (window.location.pathname === '/search') {
          const url = new URL(window.location.href);
          if (searchVal.trim()) {
            url.searchParams.set('q', searchVal.trim());
          } else {
            url.searchParams.delete('q');
          }
          window.history.replaceState(null, '', url.pathname + url.search);
        }
      }

      if (onSearchSubmit) {
        onSearchSubmit(searchVal);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchVal, onSearchSubmit]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('bpp:global-search', { detail: { query: searchVal } })
      );
      if (window.location.pathname !== '/search') {
        router.push(searchVal.trim() ? `/search?q=${encodeURIComponent(searchVal.trim())}` : '/search');
      }
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 gap-3">
      {/* Left: Mobile Menu Trigger & Logo */}
      <div className="flex items-center space-x-3 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/dashboard" className="flex items-center space-x-2 group">
          <BPPLogo size="sm" showText={false} className="group-hover:scale-105 transition-transform" />
          <span className="hidden lg:inline text-xs font-black tracking-tight text-slate-900 dark:text-white">
            BUILD PERMIT PRO
          </span>
        </Link>
      </div>

      {/* Center: Global Search Input */}
      <form onSubmit={handleSearch} className="flex-1 w-full max-w-md relative min-w-0">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Find permits, addresses, contractors..."
          className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all truncate"
        />
      </form>

      {/* Right: City Selector Dropdown & User Avatar */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        <CitySelector />

        {/* User Avatar */}
        <Link
          href="/settings"
          className="flex items-center space-x-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800 group"
          title={`Signed in as ${currentUser?.name || 'Estimator'} (${currentUser?.role || 'Member'})`}
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 flex items-center justify-center font-black text-xs shadow-sm transition-all group-hover:ring-2 group-hover:ring-blue-400/50">
            {currentUser?.initials || 'CP'}
          </div>
        </Link>
      </div>
    </header>
  );
};
