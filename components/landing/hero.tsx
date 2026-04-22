import { Features } from "./features";
import { SearchBar } from "./search-bar";

export function Hero() {
  return (
    <section
      id="top"
      className="relative min-h-screen flex flex-col items-center justify-start text-center gap-18 overflow-hidden px-6 pt-40 pb-15"
    >
      {/* Ambient gradient blobs */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 120% 70% at 50% 20%, rgba(79,60,224,0.10) 0%, transparent 75%), radial-gradient(ellipse 80% 60% at 15% 30%, rgba(79,60,224,0.08) 0%, transparent 65%), radial-gradient(ellipse 80% 60% at 85% 20%, rgba(109,93,245,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 55%, rgba(79,60,224,0.06) 0%, transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(79,60,224,0.09) 0%, transparent 70%), radial-gradient(ellipse 70% 50% at 20% 40%, rgba(109,93,245,0.06) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 40%, rgba(79,60,224,0.05) 0%, transparent 55%), linear-gradient(to bottom, transparent 40%, var(--background) 95%)",
        }}
      />

      <div className="relative z-20 max-w-[860px]">
        <h1 className="opacity-0 animate-fade-up [animation-delay:100ms] font-sans text-[clamp(2.6rem,5.5vw,4rem)] font-extrabold leading-[1.08] tracking-[-0.035em] mb-5">
          Analysez{" "}
          <span className="font-display italic text-primary font-bold">
            n&apos;importe quelle zone
          </span>
          <br />
          en quelques secondes.
        </h1>
        <p className="opacity-0 animate-fade-up [animation-delay:200ms] text-[clamp(0.95rem,1.6vw,1.1rem)] text-text-muted leading-[1.65] max-w-[540px] mx-auto mb-8 font-normal">
          Scores immobilier, environnement, sécurité et qualité de vie.
          Contextualisés pour vous. Pas juste affichés.
        </p>

        <div className="opacity-0 animate-fade-up [animation-delay:300ms]">
          <SearchBar />
        </div>
      </div>

      <Features />
    </section>
  );
}
