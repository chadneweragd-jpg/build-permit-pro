import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/Layout/AppShell';

export const metadata: Metadata = {
  title: 'Build Permit Pro (BPP) | Commercial Contractor Intelligence',
  description: 'B2B commercial intelligence SaaS for trade contractors & building suppliers. Flagship: City of Kelowna & Okanagan Valley Hub.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className="h-full flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
