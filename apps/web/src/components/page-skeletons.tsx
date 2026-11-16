import { Skeleton, TokenLoader } from './loader';

// Placeholders shown by the route loading.tsx files while a page renders on the server.
// They mirror each page's layout so nothing jumps when the real content arrives.

function HeaderSkeleton() {
  return (
    <div className="border-b-2 border-ink-100/15">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 md:grid-cols-2 md:py-14">
        <div className="space-y-4">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-16 w-72" />
          <Skeleton className="h-6 w-full max-w-md" />
          <Skeleton className="h-6 w-3/4 max-w-md" />
          <Skeleton className="mt-6 h-64 w-full max-w-md rounded-[var(--radius-card)]" />
        </div>
        <div className="flex flex-col items-center justify-center gap-6">
          <TokenLoader label="Setting up the table" />
          <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function ManualSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <div className="mx-auto max-w-6xl px-4 py-10 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
        <div className="hidden space-y-2 lg:block">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-6" />
          ))}
        </div>
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-64" />
          <TokenLoader label="Opening the manual" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </>
  );
}

export function LoginSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-14">
        <div className="hidden space-y-4 md:block">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="order-first flex min-h-80 items-center justify-center rounded-[var(--radius-card)] border-2 border-ink-100/30 md:order-none">
          <TokenLoader label="Finding your seat" />
        </div>
      </div>
    </>
  );
}
