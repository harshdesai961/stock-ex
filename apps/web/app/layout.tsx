import type { Metadata, Viewport } from 'next';
import { Fredoka, Nunito } from 'next/font/google';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import './globals.css';

// Downloaded at build time and served from our own origin, so the CSP's font-src 'self' allows them.
// Both are licensed under the SIL Open Font License (see THIRD_PARTY_NOTICES.md).
const display = Fredoka({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});
const body = Nunito({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'stock-ex',
  description: 'A real-time multiplayer stock-market board game. Play money only.',
};

export const viewport: Viewport = {
  themeColor: '#0e3b24',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Nonce-based CSP needs every page rendered per request, so the nonce is fresh each time.
  await connection();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      {/* Browser extensions (ColorZilla, Grammarly, password managers) add attributes to <body>
          before React hydrates; ignore those. Mismatches inside {children} are still reported. */}
      <body className="table-felt min-h-screen text-ink-100 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
