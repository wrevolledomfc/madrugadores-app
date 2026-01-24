import { useEffect, useMemo, useState } from "react";
import { cn } from "../lib/cn";

// ✅ OJO: confirma que tus archivos se llamen EXACTO así (incluye .png)
// y que estén en: src/assets/
import sponsor1 from "../assets/sponsor-1.png";
import sponsor2 from "../assets/sponsor-2.png";
import sponsor3 from "../assets/sponsor-3.png";

export default function SponsorCarousel({
  showTitle = false,
  title = "Patrocinadores",
  intervalMs = 3000,
  // controla padding del slide
  slidePaddingClassName = "p-4",
  // controla tamaño de imagen (alto)
  imageClassName = "max-h-20 sm:max-h-24 object-contain",
  // contenedor “card”
  containerClassName = "",
}) {
  const slides = useMemo(
    () => [
      { src: sponsor1, alt: "Sponsor 1" },
      { src: sponsor2, alt: "Sponsor 2" },
      { src: sponsor3, alt: "Sponsor 3" },
    ],
    []
  );

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!slides.length) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), intervalMs);
    return () => clearInterval(t);
  }, [slides.length, intervalMs]);

  const prev = () => setIdx((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIdx((i) => (i + 1) % slides.length);

  const current = slides[idx];

  return (
    <div className={cn("w-full", containerClassName)}>
      {showTitle && <div className="mb-2 text-xs text-white/70">{title}</div>}

      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-[0_12px_35px_rgba(0,0,0,0.25)]">
        <div className={cn("flex items-center justify-center", slidePaddingClassName)}>
          <img
            src={current.src}
            alt={current.alt}
            className={cn("w-full", imageClassName)}
            draggable={false}
          />
        </div>

        {/* bullets */}
        <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={cn(
                "h-1.5 w-6 rounded-full border border-white/20 transition",
                i === idx ? "bg-white/70" : "bg-white/10 hover:bg-white/20"
              )}
              aria-label={`Sponsor ${i + 1}`}
            />
          ))}
        </div>

        {/* controls */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/15 bg-black/30 px-2 py-1 text-white/90 hover:bg-black/40"
          aria-label="Anterior"
        >
          ‹
        </button>
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/15 bg-black/30 px-2 py-1 text-white/90 hover:bg-black/40"
          aria-label="Siguiente"
        >
          ›
        </button>
      </div>
    </div>
  );
}
