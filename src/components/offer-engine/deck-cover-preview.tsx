"use client";

interface DeckCoverPreviewProps {
  backdropImages?: string[];
}

export function DeckCoverPreview({ backdropImages = [] }: DeckCoverPreviewProps) {
  const list = backdropImages.length > 0 ? [...backdropImages, ...backdropImages] : [];

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-[#0a0a0a] border border-[#1B1B1B]">
      {list.length > 0 && (
        <>
          <div className="absolute inset-0 flex items-center gap-1 px-1 deck-cover-marquee opacity-25">
            {list.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="h-full w-10 object-cover object-top rounded shrink-0"
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/85 to-[#0a0a0a]" />
        </>
      )}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/conversion-engine-logo.svg"
          alt="Conversion Engine"
          className="w-full max-w-[40%] h-auto opacity-95"
        />
      </div>
      <style jsx>{`
        .deck-cover-marquee {
          animation: deck-cover-marquee 50s linear infinite;
          width: max-content;
        }
        @keyframes deck-cover-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
