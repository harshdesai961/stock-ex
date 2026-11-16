import type { Metadata } from 'next';
import { ResetPasswordCard } from '@/components/reset-password-card';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export const metadata: Metadata = {
  title: 'Reset password · stock-ex',
  robots: { index: false },
  // Keep the one-time token in the URL out of Referer headers sent to other sites.
  referrer: 'no-referrer',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Better Auth sends ?token=... for a good link and ?error=INVALID_TOKEN for a bad one.
  const token = typeof params.token === 'string' && !params.error ? params.token : undefined;
  return (
    <>
      <SiteHeader />
      <main id="main" className="page-enter hill relative">
        <div className="relative mx-auto max-w-md px-4 py-12">
          <ResetPasswordCard token={token} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
