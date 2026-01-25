/**
 * @file layout.tsx
 * @description Root layout for the application.
 */

import './globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { MediaRegistryProvider } from '@/components/providers/MediaRegistryProvider';
import { UserPreferencesProvider } from '@/components/providers/UserPreferencesProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'MOAT - Music Tier List',
    template: '%s | MOAT',
  },
  description: '🎵 Rank your music, artists, and albums with ease.',
  openGraph: {
    title: 'MOAT - Music Tier List',
    description: 'Rank your music, artists, and albums with ease.',
    url: './',
    siteName: 'MOAT',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'MOAT - Rank your music',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MOAT - Music Tier List',
    description: 'Rank your music, artists, and albums with ease.',
    images: ['/api/og'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

/** Props for the RootLayout component. */
interface RootLayoutProps {
  /** Child components to be rendered within the layout. */
  children: React.ReactNode;
}

/**
 * Root layout component that wraps the entire application.
 * @param props - The props for the component.
 * @param props.children - Child components that will have access to the context.
 * @returns The root HTML structure of the application.
 */
export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>
          <UserPreferencesProvider>
            <MediaRegistryProvider>{children}</MediaRegistryProvider>
          </UserPreferencesProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
