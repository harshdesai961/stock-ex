'use client';

import { useEffect, useRef, useState } from 'react';

interface Entry {
  id: string;
  label: string;
}

/** The section whose heading has passed this fraction of the screen height is "current". */
const READING_LINE = 0.3;

function useReadingPosition(items: readonly Entry[]) {
  const [active, setActive] = useState(items[0]?.id ?? '');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const line = window.innerHeight * READING_LINE;
      let current = items[0]?.id ?? '';
      for (const item of items) {
        const section = document.getElementById(item.id);
        if (section && section.getBoundingClientRect().top <= line) current = item.id;
      }
      setActive(current);
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [items]);

  return { active, progress };
}

function Progress({ value }: { value: number }) {
  return (
    <progress
      className="xp-bar"
      value={Math.round(value * 100)}
      max={100}
      aria-label="How far through the manual you are"
    />
  );
}

/**
 * The manual's index, always on screen. From tablet width up it is a sticky column on the left;
 * on phones it is a sticky bar of chips under the header. Both follow the section being read.
 */
export function ManualIndex({
  items,
  compact = false,
}: {
  items: readonly Entry[];
  compact?: boolean;
}) {
  const { active, progress } = useReadingPosition(items);
  const strip = useRef<HTMLOListElement>(null);

  // Keep the current chip in view on the phone bar.
  useEffect(() => {
    if (!compact || !strip.current) return;
    const chip = strip.current.querySelector<HTMLElement>('[aria-current="true"]');
    if (!chip) return;
    strip.current.scrollTo({
      left: chip.offsetLeft - strip.current.clientWidth / 2 + chip.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [active, compact]);

  if (compact) {
    return (
      <div className="sticky top-14 z-10 -mx-4 mt-6 border-b-2 border-ink-100/15 bg-ink-900/95 px-4 py-2 backdrop-blur md:hidden">
        <nav aria-label="Manual index">
          <ol ref={strip} className="flex gap-2 overflow-x-auto pb-1 text-sm">
            {items.map((item, index) => (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  aria-current={active === item.id ? 'true' : undefined}
                  className="index-link inline-flex gap-1.5 rounded-full border-2 border-ink-100/30 px-3 py-1 whitespace-nowrap"
                >
                  <span className="font-display opacity-70">{index + 1}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
          <Progress value={progress} />
        </nav>
      </div>
    );
  }

  return (
    // The wrapper is sticky; .panel sets position: relative, which would cancel it on the nav itself.
    <div className="sticky top-24">
      <nav aria-label="Manual index" className="panel max-h-[calc(100vh-7rem)] overflow-y-auto p-4">
        <p className="label text-sm uppercase">Contents</p>
        <div className="mt-2">
          <Progress value={progress} />
        </div>
        <ol className="mt-3 space-y-0.5 text-sm">
          {items.map((item, index) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active === item.id ? 'true' : undefined}
                className="index-link flex gap-2 rounded-md px-2 py-1 hover:text-accent-400"
              >
                <span className="font-display w-5 shrink-0 text-right opacity-70">{index + 1}</span>
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
