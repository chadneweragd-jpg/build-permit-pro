'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BPPLogo } from '@/components/Common/BPPLogo';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'existing' | 'new'>('existing');
  const [email, setEmail] = useState('dave@okanaganbuilders.ca');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 flex flex-col items-center">
        {/* Top Logo */}
        <div className="mb-6">
          <BPPLogo size="lg" showText={true} />
        </div>

        {/* Auth Mode Toggle Selector */}
        <div className="w-full grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => setAuthMode('existing')}
            className={`py-2 rounded-lg transition-all ${
              authMode === 'existing'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Existing User
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('new')}
            className={`py-2 rounded-lg transition-all ${
              authMode === 'new'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            New User
          </button>
        </div>

        {/* Sub-heading */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {authMode === 'existing' ? 'Sign In To Your Account' : 'Create Your BPP Account'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access Kelowna & Okanagan commercial permit leads
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@domain.com"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center space-x-2 mt-2"
          >
            <span>{isLoading ? 'Signing In...' : authMode === 'existing' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Links */}
        <div className="w-full mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <Link href="#" className="hover:text-blue-500 transition-colors">
            Forgot password?
          </Link>
          <Link href="/dashboard" className="hover:text-blue-500 transition-colors">
            Demo Bypass &rarr;
          </Link>
          <Link href="#" className="hover:text-blue-500 transition-colors">
            Help
          </Link>
        </div>
      </div>
    </div>
  );
}
