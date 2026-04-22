import { Features } from "./features";
import { SearchBar } from "./search-bar";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col items-center justify-start gap-18 overflow-hidden px-6 pt-40 pb-15 text-center"
    >
      {/* Ambient gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 70% at 50% 20%, rgba(79,60,224,0.10) 0%, transparent 75%), radial-gradient(ellipse 80% 60% at 15% 30%, rgba(79,60,224,0.08) 0%, transparent 65%), radial-gradient(ellipse 80% 60% at 85% 20%, rgba(109,93,245,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 55%, rgba(79,60,224,0.06) 0%, transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(79,60,224,0.09) 0%, transparent 70%), radial-gradient(ellipse 70% 50% at 20% 40%, rgba(109,93,245,0.06) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 40%, rgba(79,60,224,0.05) 0%, transparent 55%), linear-gradient(to bottom, transparent 40%, var(--background) 95%)",
        }}
      />

      <div className="relative z-20 max-w-[860px]">
        <h1 className="animate-fade-up mb-5 font-sans text-[clamp(2.6rem,5.5vw,4rem)] leading-[1.08] font-extrabold tracking-[-0.035em] opacity-0 [animation-delay:100ms]">
          Analysez{" "}
          <span className="font-display text-primary font-bold italic">
            n&apos;importe quelle zone
          </span>
          <br />
          en quelques secondes.
        </h1>
        <p className="animate-fade-up text-text-muted mx-auto mb-8 max-w-[540px] text-[clamp(0.95rem,1.6vw,1.1rem)] leading-[1.65] font-normal opacity-0 [animation-delay:200ms]">
          Scores immobilier, environnement, sécurité et qualité de vie. Contextualisés pour vous.
          Pas juste affichés.
        </p>

        <div className="animate-fade-up opacity-0 [animation-delay:300ms]">
          <SearchBar />
        </div>
      </div>

      <Features />
    </section>
  );
}
