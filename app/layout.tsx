/**
 * @file layout.tsx
 * @description Root layout for the application.
 */

import './globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { MediaRegistryProvider } from '@/components/MediaRegistryProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MOAT',
  description: '🎵 Rank your music',
};

/** Props for the RootLayout component. */
interface RootLayoutProps {
  /** Child components to be rendered within the layout. */
  children: React.ReactNode;
}

/**
 * Root layout component that wraps the entire application.
 */
export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>
          <MediaRegistryProvider>{children}</MediaRegistryProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
