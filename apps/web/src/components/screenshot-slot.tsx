import { ImageIcon } from 'lucide-react';
import Image from 'next/image';

/**
 * A framed screenshot for the manual. Until the real image exists it shows a placeholder;
 * to fill it, drop the file in apps/web/public/manual/ and pass its path as `src`.
 */
export function ScreenshotSlot({
  title,
  caption,
  src,
}: {
  title: string;
  caption: string;
  src?: string;
}) {
  return (
    <figure className="panel lift overflow-hidden p-2">
      {src ? (
        <Image
          src={src}
          alt={`Screenshot: ${title}`}
          width={1600}
          height={900}
          className="h-auto w-full rounded-xl"
        />
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-100/40 bg-ink-950/60 text-center">
          <ImageIcon className="h-10 w-10 text-ink-300" aria-hidden="true" />
          <p className="font-display text-lg text-sand-300">{title}</p>
          <p className="text-xs text-ink-300">Screenshot coming soon</p>
        </div>
      )}
      <figcaption className="px-2 pt-2 pb-1 text-sm text-ink-300">{caption}</figcaption>
    </figure>
  );
}
