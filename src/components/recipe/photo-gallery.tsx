"use client";

import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { useRef } from "react";

/** Swipeable photo strip with scroll-snap; arrows on larger screens. */
export function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  if (!photos.length) return null;
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth, behavior: "smooth" });

  return (
    <div className="relative -mx-4 sm:mx-0">
      <div
        ref={ref}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] sm:gap-3 sm:rounded-2xl"
      >
        {photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt={i === 0 ? alt : ""}
            className="aspect-[4/3] w-full shrink-0 snap-center object-cover sm:aspect-[16/9] sm:rounded-2xl print:hidden print:first:block print:max-h-64"
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
      </div>
      {photos.length > 1 && (
        <div className="no-print">
          <button
            onClick={() => scroll(-1)}
            className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur sm:grid"
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur sm:grid"
            aria-label="Next photo"
          >
            <ChevronRight className="size-5" />
          </button>
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white sm:hidden">
            <Images className="size-3.5" />
            {photos.length}
          </span>
        </div>
      )}
    </div>
  );
}
