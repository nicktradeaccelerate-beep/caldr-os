import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BrandProvider } from '@/context/BrandContext';
import InstallPrompt from '@/components/shared/InstallPrompt';

export const metadata: Metadata = {
  title: 'Minnie · OS',
  description: 'The intelligent work OS — Newton & Sinclair',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Minnie OS',
    startupImage: '/icons/icon-512.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#5C1A1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Minnie OS" />
      </head>
      <body>
        <BrandProvider>
          {children}
          <InstallPrompt />
        </BrandProvider>
      </body>
    </html>
  );
}
