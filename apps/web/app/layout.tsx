import type { Metadata } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'stock-ex',
  description: 'A real-time multiplayer stock-market board game. Play money only.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Nonce-based CSP needs every page rendered per request, so the nonce is fresh each time.
  await connection();
  return (
    <html lang="en">
      {/* Browser extensions (ColorZilla, Grammarly, password managers) add attributes to <body>
          before React hydrates; ignore those. Mismatches inside {children} are still reported. */}
      <body className="min-h-screen bg-ink-950 text-ink-100 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
