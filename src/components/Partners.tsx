import Image from "next/image";
import { partners } from "@/lib/config";

function PartnerLogo({
  partner,
}: {
  partner: (typeof partners)[number];
}) {
  return (
    <a
      href={partner.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit ${partner.name}`}
      className="group flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white px-6 py-4 shadow-sm transition hover:border-gold-400/40 hover:shadow-md"
      style={{ minWidth: partner.width + 48 }}
    >
      <Image
        src={partner.logo}
        alt={partner.name}
        width={partner.width}
        height={partner.height}
        className="h-auto max-h-12 w-auto max-w-[200px] object-contain opacity-90 transition group-hover:opacity-100"
      />
    </a>
  );
}

export function Partners() {
  const carouselPartners = [...partners, ...partners];

  return (
    <section
      id="platforms"
      className="border-y border-white/5 bg-felt-900/50 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Compatible Platforms
          </h2>
          <p className="mt-4 text-gray-400">
            Run the tools you already use. Our infrastructure is tested and
            optimized for the poker simulation software the community relies on.
          </p>
        </div>

        <div className="partner-carousel relative mt-14">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-felt-900/80 to-transparent sm:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-felt-900/80 to-transparent sm:w-24" />

          <div className="partner-carousel-viewport overflow-hidden">
            <div className="partner-carousel-track flex w-max gap-6 py-2">
              {carouselPartners.map((partner, index) => (
                <PartnerLogo
                  key={`${partner.name}-${index}`}
                  partner={partner}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-gray-500">
          Platform names and trademarks belong to their respective owners.
          PokerProbe is an independent infrastructure provider and is not
          affiliated with or endorsed by the listed software vendors.
        </p>
      </div>
    </section>
  );
}
