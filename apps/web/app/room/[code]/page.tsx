import { roomCodeSchema } from '@stock-ex/shared';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { RoomLobby } from '@/components/room-lobby';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { signedInName } from '@/lib/session';

// /room/<CODE>: where "Create private game", "Join by code" and invite links all land.

interface Params {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const parsed = roomCodeSchema.safeParse((await params).code);
  return {
    title: parsed.success ? `Room ${parsed.data} · stock-ex` : 'Room · stock-ex',
    // Room links are invitations, not pages for search engines.
    robots: { index: false, follow: false },
  };
}

export default async function RoomPage({ params }: Params) {
  const { code } = await params;
  const parsed = roomCodeSchema.safeParse(code);
  if (!parsed.success) notFound();
  // A code typed in lower case still works; show the canonical form in the address bar.
  if (parsed.data !== code) redirect(`/room/${parsed.data}`);

  return (
    <>
      <SiteHeader />
      <main id="main" className="page-enter mx-auto max-w-5xl px-4 py-8">
        <RoomLobby code={parsed.data} signedInAs={await signedInName()} />
      </main>
      <SiteFooter />
    </>
  );
}
