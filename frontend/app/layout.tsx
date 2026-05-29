import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Figtree, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from '@/components/ui/sonner';
import { AppThemeProvider } from '@/components/providers/AppThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import '../styles/globals.css';

/** UI copy, labels, body — Figtree */
const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
});

/** Bold / black display — Blender Pro from public/fonts (bundled by Next) */
const blenderPro = localFont({
  src: [
    { path: '../public/fonts/BlenderPro-Bold.woff', weight: '700', style: 'normal' },
    { path: '../public/fonts/BlenderPro-Bold.woff', weight: '900', style: 'normal' },
  ],
  variable: '--font-blender',
  display: 'swap',
});

/** Code / monospace — unchanged */
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: {
    default: 'OldTrailBikes — Sri Lanka Dirt Bike Community',
    template: '%s | OldTrailBikes',
  },
  description:
    'Sri Lanka\'s platform for dirt bike workshop service, buying & selling trail bikes, and genuine spare parts.',
  keywords: ['dirt bike', 'motocross', 'Sri Lanka', 'workshop', 'spare parts', 'trail bike'],
  openGraph: {
    type: 'website',
    locale: 'en_LK',
    siteName: 'OldTrailBikes',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.className} ${figtree.variable} ${geistMono.variable} ${blenderPro.variable}`}
    >
      <body className="font-figtree min-h-screen antialiased">
        <AppThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <CartProvider>
                {children}
                <Toaster richColors position="top-right" />
              </CartProvider>
            </LanguageProvider>
          </AuthProvider>
        </AppThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
