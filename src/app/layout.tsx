// src/app/layout.tsx

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { VoiceCallProvider } from '@/contexts/VoiceCallContext';
import VoiceCallUI from '@/components/voice/VoiceCallUI';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Chatgram - Real-Time Messaging',
  description: 'Professional real-time messaging platform with voice calling and cloud media',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Chatgram',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Chatgram',
    title: 'Chatgram - Real-Time Messaging',
    description: 'Professional real-time messaging platform',
  },
  twitter: {
    card: 'summary',
    title: 'Chatgram',
    description: 'Professional real-time messaging platform',
  },
};

export const viewport: Viewport = {
  themeColor: '#9333ea',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.className} bg-gray-900 text-white antialiased`}>
        <AuthProvider>
          <VoiceCallProvider>
            {children}
            <VoiceCallUI />
          </VoiceCallProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
