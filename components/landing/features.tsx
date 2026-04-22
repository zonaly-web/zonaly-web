"use client";

import { motion } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";

const cardReveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
};

const sources = ["DVF", "INSEE", "ATMO", "SSMSI", "Géorisques", "IGN"];

export function Features() {
  return (
    <>
      <div
        id="features"
        className="animate-fade-up relative z-2 mx-auto w-full max-w-[1040px] px-6 opacity-0 [animation-delay:450ms]"
      >
        <div className="mx-auto grid max-w-[440px] grid-cols-1 gap-4 md:max-w-none md:grid-cols-3">
          {/* Card 1 — Scores A-E */}
          <motion.div
            {...cardReveal}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0 }}
            className="group bg-primary/[0.04] border-primary/10 hover:border-primary/20 relative flex flex-col overflow-hidden rounded-[20px] border border-t-0 shadow-[0_2px_8px_rgba(20,16,36,0.04),0_12px_36px_rgba(20,16,36,0.06)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[5px] hover:shadow-[0_20px_50px_rgba(79,60,224,0.10),0_0_0_1px_rgba(79,60,224,0.12)]"
          >
            <div className="from-primary to-accent-light absolute -top-px right-0 left-0 z-1 h-[5px] bg-gradient-to-r" />
            <div className="relative flex h-[108px] items-center justify-center px-6 pt-7 pb-5">
              <div className="flex items-end gap-1.5">
                {[
                  { letter: "A", h: 52, bg: "var(--score-a)", fg: "#1c1832" },
                  { letter: "B", h: 44, bg: "var(--score-b)", fg: "#1c1832" },
                  { letter: "C", h: 36, bg: "var(--score-c)", fg: "#1c1832" },
                  { letter: "D", h: 28, bg: "var(--score-d)", fg: "#1c1832" },
                  { letter: "E", h: 22, bg: "var(--score-e)", fg: "#1c1832" },
                ].map((p, i) => (
                  <div
                    key={p.letter}
                    className="grid w-9 place-items-center rounded-[10px] text-[0.72rem] font-extrabold tracking-[-0.02em] transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-[3px]"
                    style={{
                      height: `${p.h}px`,
                      background: p.bg,
                      color: p.fg,
                      transitionDelay: `${i * 40}ms`,
                    }}
                  >
                    {p.letter}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 pt-1 pb-7 text-center">
              <h3 className="text-foreground mb-2 text-[0.92rem] leading-[1.3] font-bold tracking-[-0.015em]">
                Scores de A à E
              </h3>
              <p className="text-text-muted text-[0.78rem] leading-[1.6] font-normal">
                Chaque zone reçoit une note sur 4 dimensions clés. Simple, visuel, immédiat.
              </p>
            </div>
          </motion.div>

          {/* Card 2 — Sources */}
          <motion.div
            {...cardReveal}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="group relative order-3 flex flex-col overflow-hidden rounded-[20px] border border-t-0 border-[rgba(16,168,82,0.10)] bg-[linear-gradient(160deg,#e6f7ed_0%,#f0f8f3_100%)] shadow-[0_2px_8px_rgba(20,16,36,0.04),0_12px_36px_rgba(20,16,36,0.06)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[5px] hover:border-[rgba(16,168,82,0.18)] hover:shadow-[0_20px_50px_rgba(16,168,82,0.10),0_0_0_1px_rgba(16,168,82,0.12)] md:order-none"
          >
            <div className="absolute -top-px right-0 left-0 z-1 h-[5px] bg-gradient-to-r from-[#10a852] to-[#34d399]" />
            <div className="relative flex h-[108px] items-center justify-center px-6 pt-7 pb-5">
              <div className="flex max-w-[240px] flex-wrap justify-center gap-[5px]">
                {sources.map((src, i) => (
                  <span
                    key={src}
                    className={`rounded-full px-3 py-[5px] text-[0.65rem] font-semibold tracking-[0.01em] transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 ${
                      i % 2 === 0
                        ? "bg-[rgba(16,168,82,0.08)] text-[#0c8a48]"
                        : "bg-[rgba(16,168,82,0.04)] text-[#10a852]"
                    }`}
                    style={{ transitionDelay: `${i * 30}ms` }}
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
            <div className="px-6 pt-1 pb-7 text-center">
              <h3 className="text-foreground mb-2 text-[0.92rem] leading-[1.3] font-bold tracking-[-0.015em]">
                100% données officielles
              </h3>
              <p className="text-text-muted text-[0.78rem] leading-[1.6] font-normal">
                Sources de l&apos;État uniquement, mises à jour chaque semaine.
              </p>
            </div>
          </motion.div>

          {/* Card 3 — Interprétés */}
          <motion.div
            {...cardReveal}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="group bg-primary/[0.04] border-primary/10 hover:border-primary/20 relative flex flex-col overflow-hidden rounded-[20px] border border-t-0 shadow-[0_2px_8px_rgba(20,16,36,0.04),0_12px_36px_rgba(20,16,36,0.06)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[5px] hover:shadow-[0_20px_50px_rgba(79,60,224,0.10),0_0_0_1px_rgba(79,60,224,0.12)]"
          >
            <div className="from-primary to-accent-light absolute -top-px right-0 left-0 z-1 h-[5px] bg-gradient-to-r" />
            <div className="relative flex h-[108px] items-center justify-center px-6 pt-7 pb-5">
              <div className="flex items-center gap-3.5 px-1.5 py-1">
                <div className="bg-score-b grid h-13 w-13 shrink-0 place-items-center rounded-[13px] text-[1.55rem] font-extrabold tracking-[-0.03em] text-[#1c1832] shadow-[0_4px_14px_rgba(142,198,57,0.3)]">
                  B
                </div>
                <div className="flex h-13 flex-col justify-center gap-2.5">
                  <div className="flex items-center gap-2">
                    <ArrowRight
                      size={18}
                      strokeWidth={2.5}
                      className="text-primary shrink-0 opacity-60 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[3px] group-hover:opacity-100"
                    />
                    <div className="text-foreground text-left text-[0.72rem] leading-none font-semibold tracking-[-0.01em] whitespace-nowrap">
                      Top <em className="text-primary font-bold not-italic">38%</em> national
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight
                      size={18}
                      strokeWidth={2.5}
                      className="text-primary shrink-0 opacity-60 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[3px] group-hover:opacity-100"
                    />
                    <div className="text-foreground text-left text-[0.72rem] leading-none font-semibold tracking-[-0.01em] whitespace-nowrap">
                      <em className="text-primary font-bold not-italic">+47%</em> sur 10 ans
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pt-1 pb-7 text-center">
              <h3 className="text-foreground mb-2 text-[0.92rem] leading-[1.3] font-bold tracking-[-0.015em]">
                Interprétés, pas juste affichés
              </h3>
              <p className="text-text-muted text-[0.78rem] leading-[1.6] font-normal">
                Chaque score est contextualisé : points forts, vigilances, comparaison nationale.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <a
        href="#example"
        className="animate-fade-up group bg-bg-dark relative z-2 inline-flex items-center gap-3 rounded-full border-none py-4 pr-8 pl-7 text-[0.9rem] font-semibold tracking-[-0.01em] text-white no-underline opacity-0 shadow-[0_4px_16px_rgba(30,26,58,0.2),0_12px_40px_rgba(30,26,58,0.12)] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] [animation-delay:600ms] hover:-translate-y-[1px] hover:bg-[#2a2550] hover:shadow-[0_4px_16px_rgba(30,26,58,0.4)]"
      >
        <span>Voir un exemple de résultat</span>
        <span className="animate-scroll-bounce grid place-items-center transition-transform group-hover:translate-y-0.5 group-hover:[animation-play-state:paused]">
          <ChevronDown size={18} strokeWidth={2.5} />
        </span>
      </a>
    </>
  );
}
