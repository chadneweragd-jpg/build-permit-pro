'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BPPLogo } from '@/components/Common/BPPLogo';
import { AuthService, UserProfile, PARTNER_ACCOUNTS } from '@/lib/auth-service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SUPPORTED_CITIES, getSelectedCityId } from '@/lib/cities';
import {
  LayoutGrid,
  FileText,
  BarChart3,
  Route,
  Search,
  Settings,
  ShieldCheck,
  ChevronRight,
  Car,
  Columns,
  X,
  Users,
  Check
} from 'lucide-react';

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  className = '',
  isOpen = false,
  onClose
}) => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserProfile>(AuthService.getActiveUserSync());
  const [showPartnerSwitcher, setShowPartnerSwitcher] = useState(false);
  const [activeCityId, setActiveCityId] = useState<string>('kelowna');

  useEffect(() => {
    setActiveCityId(getSelectedCityId());

    const handleCityChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ cityId: string }>;
      if (customEvent.detail?.cityId) {
        setActiveCityId(customEvent.detail.cityId);
      }
    };

    window.addEventListener('bpp:city-change', handleCityChange);
    return () => window.removeEventListener('bpp:city-change', handleCityChange);
  }, []);

  const activeCity = SUPPORTED_CITIES[activeCityId] || SUPPORTED_CITIES.kelowna;

  useEffect(() => {
    const syncUser = async () => {
      const u = await AuthService.getCurrentUser();
      setCurrentUser(u);
    };

    syncUser();

    if (isSupabaseConfigured && supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.email) {
          setCurrentUser(
            AuthService.formatUserProfile(
              session.user.id,
              session.user.email,
              session.user.user_metadata?.full_name
            )
          );
        }
      });

      const handleUserChange = () => {
        syncUser();
      };
      window.addEventListener('bpp_user_changed', handleUserChange);

      return () => {
        listener?.subscription?.unsubscribe();
        window.removeEventListener('bpp_user_changed', handleUserChange);
      };
    }
  }, []);

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { label: 'Pipeline', href: '/pipeline', icon: Columns, badge: 'CRM' },
    { label: 'Permits', href: '/permits', icon: FileText },
    { label: 'Routes', href: '/routes', icon: Route },
    { label: 'CRA Mileage', href: '/routes/mileage', icon: Car, badge: 'CRA' },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const renderNavContent = (isMobile = false) => (
    <>
      {/* Top Branding Section */}
      <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <Link
          href="/dashboard"
          onClick={() => isMobile && onClose?.()}
          className="block focus:outline-none"
        >
          <BPPLogo size="md" showText={true} />
        </Link>
        {isMobile && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          Core Navigation
        </div>

        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href === '/dashboard' && pathname === '/') ||
            (item.href === '/routes' && pathname.startsWith('/routes/') && pathname !== '/routes/mileage');

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => isMobile && onClose?.()}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center space-x-2">
                {item.badge && !isActive && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </div>
            </Link>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          Regional Sandbox
        </div>
        <div className="px-3 py-2 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-white font-bold">{activeCity.region}</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">
              LIVE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{activeCity.hub}</p>
        </div>
      </nav>

      {/* Sidebar Footer: User Profile Card */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0 relative">
        {showPartnerSwitcher && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span>Switch Partner Session</span>
              <span className="text-blue-400">Beta Testing</span>
            </div>
            <div className="space-y-1 mt-1">
              {PARTNER_ACCOUNTS.map((p) => {
                const isSelected = p.email.toLowerCase() === currentUser.email.toLowerCase();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      AuthService.setActiveUser(p.email);
                      setCurrentUser(p);
                      setShowPartnerSwitcher(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all text-xs ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {p.initials}
                      </div>
                      <div className="truncate">
                        <span className="block font-bold truncate">{p.name}</span>
                        <span className="block text-[10px] opacity-75 truncate">{p.email}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Link
            href="/settings"
            onClick={() => isMobile && onClose?.()}
            className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-800/80 transition-all group flex-1 min-w-0"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md border border-slate-700">
                {currentUser.initials}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                  {currentUser.name}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 shrink-0">
                  {currentUser.tierBadge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {currentUser.email}
              </p>
            </div>
          </Link>

          {/* Quick Partner Switcher Toggle */}
          <button
            type="button"
            onClick={() => setShowPartnerSwitcher(!showPartnerSwitcher)}
            className={`p-2 rounded-xl transition-colors shrink-0 ml-1 ${
              showPartnerSwitcher
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Switch Partner Session (Chad, David, Carter)"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar: Hidden on mobile (<768px), flex on md+ */}
      <aside
        className={`hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 shrink-0 h-screen select-none ${className}`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer (screens < 768px): slide out from left */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside
            className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200 select-none"
          >
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
