/**
 * @file layout.tsx
 * @description Root layout for the application.
 */

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { MediaRegistryProvider } from '@/components/MediaRegistryProvider';

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

/**
 * Root layout component that wraps the entire application.
 * @param props - Component props.
 * @param props.children - Child components that will have access to the context.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
