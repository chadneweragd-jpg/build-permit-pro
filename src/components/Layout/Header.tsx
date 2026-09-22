'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Moon,
  Sun,
  Bell,
  User,
  Route,
  FilePlus,
  Sliders,
  ChevronDown,
  Compass,
  Sparkles,
  Menu
} from 'lucide-react';

interface HeaderProps {
  onSearchSubmit?: (query: string) => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchSubmit, onOpenMobileMenu }) => {
  const router = useRouter();
  const [searchVal, setSearchVal] = useState('');
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('bpp_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDark(activeDark);
    document.documentElement.classList.toggle('dark', activeDark);
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme);
    localStorage.setItem('bpp_theme', nextTheme ? 'dark' : 'light');
  };

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
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 gap-2">
      {/* Mobile Hamburger Menu Trigger */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Global Search Input: Responsive width */}
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

      {/* Action Buttons: Ask Scout, + New Item, Dark/Light Mode, User Menu */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Ask Scout AI Voice Trigger */}
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('bpp-open-scout'));
            }
          }}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 hover:from-amber-500/20 hover:to-blue-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 text-xs font-extrabold transition-all group shadow-xs"
          title="Open Scout AI Voice & Chat Assistant"
        >
          <Compass className="w-3.5 h-3.5 animate-spin-slow text-amber-500 group-hover:scale-110 transition-transform" />
          <span>Ask Scout</span>
          <span className="text-[9px] bg-amber-400/20 text-amber-400 px-1 py-0.2 rounded font-mono font-bold">
            AI
          </span>
        </button>

        {/* + New Item Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">New</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {isNewMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 text-xs z-50 animate-in fade-in slide-in-from-top-2"
              onMouseLeave={() => setIsNewMenuOpen(false)}
            >
              <Link
                href="/routes/builder"
                onClick={() => setIsNewMenuOpen(false)}
                className="flex items-center space-x-2.5 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70"
              >
                <Route className="w-4 h-4 text-blue-500" />
                <span>Build New Route</span>
              </Link>
              <Link
                href="/search"
                onClick={() => setIsNewMenuOpen(false)}
                className="flex items-center space-x-2.5 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70"
              >
                <Search className="w-4 h-4 text-emerald-500" />
                <span>Search New Permits</span>
              </Link>
              <Link
                href="/reports"
                onClick={() => setIsNewMenuOpen(false)}
                className="flex items-center space-x-2.5 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70"
              >
                <Sliders className="w-4 h-4 text-amber-500" />
                <span>Generate Market Report</span>
              </Link>
            </div>
          )}
        </div>

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
        >
          {isDark ? (
            <Moon className="w-5 h-5 text-blue-400" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500" />
          )}
        </button>

        {/* Notifications Icon */}
        <Link
          href="/settings"
          className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />
        </Link>

        {/* User Menu Trigger */}
        <Link
          href="/settings"
          className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800"
        >
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
            DE
          </div>
        </Link>
      </div>
    </header>
  );
};
