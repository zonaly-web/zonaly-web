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
        className="opacity-0 animate-fade-up [animation-delay:450ms] px-6 max-w-[1040px] mx-auto relative z-2 w-full"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[440px] md:max-w-none mx-auto">
          {/* Card 1 — Scores A-E */}
          <motion.div
            {...cardReveal}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0 }}
            className="group relative overflow-hidden flex flex-col rounded-[20px] bg-primary/[0.04] border border-primary/10 border-t-0 shadow-[0_2px_8px_rgba(20,16,36,0.04),0_12px_36px_rgba(20,16,36,0.06)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[5px] hover:border-primary/20 hover:shadow-[0_20px_50px_rgba(79,60,224,0.10),0_0_0_1px_rgba(79,60,224,0.12)]"
          >
            <div className="absolute -top-px left-0 right-0 h-[5px] bg-gradient-to-r from-primary to-accent-light z-1" />
            <div className="flex items-center justify-center relative h-[108px] px-6 pt-7 pb-5">
              <div className="flex gap-1.5 items-end">
                {[
                  { letter: "A", h: 52, bg: "var(--score-a)", fg: "#fff" },
                  { letter: "B", h: 44, bg: "var(--score-b)", fg: "#1c1832" },
                  { letter: "C", h: 36, bg: "var(--score-c)", fg: "#1c1832" },
                  { letter: "D", h: 28, bg: "var(--score-d)", fg: "#fff" },
                  { letter: "E", h: 22, bg: "var(--score-e)", fg: "#fff" },
                ].map((p, i) => (
                  <div
                    key={p.letter}
                    className="w-9 rounded-[10px] grid place-items-center text-[0.72rem] font-extrabold tracking-[-0.02em] transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-[3px]"
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
            <div className="pt-1 px-6 pb-7 text-center">
              <h3 className="text-[0.92rem] font-bold text-foreground leading-[1.3] tracking-[-0.015em] mb-2">
                Scores de A à E
              </h3>
              <p className="text-[0.78rem] text-text-muted leading-[1.6] font-normal">
                Chaque zone reçoit une note sur 4 dimensions clés. Simple,
                visuel, immédiat.
              </p>
            </div>
          </motion.div>

          {/* Card 2 — Sources */}
          <motion.div
            {...cardReveal}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="group relative overflow-hidden flex flex-col rounded-[20px] bg-[linear-gradient(160deg,#e6f7ed_0%,#f0f8f3_100%)] border border-[rgba(16,168,82,0.10)] border-t-0 shadow-[0_2px_8px_rgba(20,16,36,0.04),0_12px_36px_rgba(20,16,36,0.06)] order-3 md:order-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[5px] hover:border-[rgba(16,168,82,0.18)] hover:shadow-[0_20px_50px_rgba(16,168,82,0.10),0_0_0_1px_rgba(16,168,82,0.12)]"
          >
            <div className="absolute -top-px left-0 right-0 h-[5px] bg-gradient-to-r from-[#10a852] to-[#34d399] z-1" />
            <div className="flex items-center justify-center relative h-[108px] px-6 pt-7 pb-5">
              <div className="flex flex-wrap gap-[5px] justify-center max-w-[240px]">
                {sources.map((src, i) => (
                  <span
                    key={src}
                    className={`text-[0.65rem] py-[5px] px-3 rounded-full font-semibold tracking-[0.01em] transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 ${
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
            <div className="pt-1 px-6 pb-7 text-center">
              <h3 className="text-[0.92rem] font-bold text-foreground leading-[1.3] tracking-[-0.015em] mb-2">
                100% données officielles
              </h3>
              <p className="text-[0.78rem] text-text-muted leading-[1.6] font-normal">
                Sources de l&apos;État uniquement, mises à jour chaque semaine.
              </p>
            </div>
          </motion.div>

          {/* Card 3 — Interprétés */}
          <motion.div
            {...cardReveal}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="group relative overflow-hidden flex flex-col rounded-[20px] bg-primary/[0.04] border border-primary/10 border-t-0 shadow-[0_2px_8px_rgba(20,16,36,0.04),0_12px_36px_rgba(20,16,36,0.06)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[5px] hover:border-primary/20 hover:shadow-[0_20px_50px_rgba(79,60,224,0.10),0_0_0_1px_rgba(79,60,224,0.12)]"
          >
            <div className="absolute -top-px left-0 right-0 h-[5px] bg-gradient-to-r from-primary to-accent-light z-1" />
            <div className="flex items-center justify-center relative h-[108px] px-6 pt-7 pb-5">
              <div className="flex items-center gap-3.5 px-1.5 py-1">
                <div className="w-13 h-13 rounded-[13px] bg-score-b grid place-items-center text-[1.55rem] font-extrabold text-[#1c1832] shrink-0 tracking-[-0.03em] shadow-[0_4px_14px_rgba(142,198,57,0.3)]">
                  B
                </div>
                <div className="flex flex-col justify-center gap-2.5 h-13">
                  <div className="flex items-center gap-2">
                    <ArrowRight
                      size={18}
                      strokeWidth={2.5}
                      className="text-primary opacity-60 shrink-0 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-hover:translate-x-[3px]"
                    />
                    <div className="text-[0.72rem] font-semibold text-foreground leading-none text-left tracking-[-0.01em] whitespace-nowrap">
                      Top <em className="not-italic text-primary font-bold">38%</em>{" "}
                      national
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight
                      size={18}
                      strokeWidth={2.5}
                      className="text-primary opacity-60 shrink-0 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-hover:translate-x-[3px]"
                    />
                    <div className="text-[0.72rem] font-semibold text-foreground leading-none text-left tracking-[-0.01em] whitespace-nowrap">
                      <em className="not-italic text-primary font-bold">+47%</em> sur
                      10 ans
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-1 px-6 pb-7 text-center">
              <h3 className="text-[0.92rem] font-bold text-foreground leading-[1.3] tracking-[-0.015em] mb-2">
                Interprétés, pas juste affichés
              </h3>
              <p className="text-[0.78rem] text-text-muted leading-[1.6] font-normal">
                Chaque score est contextualisé : points forts, vigilances,
                comparaison nationale.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <a
        href="#example"
        className="opacity-0 animate-fade-up [animation-delay:600ms] group inline-flex items-center gap-3 no-underline text-white text-[0.9rem] font-semibold py-4 pr-8 pl-7 rounded-full bg-bg-dark border-none transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] relative z-2 shadow-[0_4px_16px_rgba(30,26,58,0.2),0_12px_40px_rgba(30,26,58,0.12)] tracking-[-0.01em] hover:bg-[#2a2550] hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(30,26,58,0.4)]"
      >
        <span>Voir un exemple de résultat</span>
        <span className="grid place-items-center animate-scroll-bounce group-hover:[animation-play-state:paused] group-hover:translate-y-0.5 transition-transform">
          <ChevronDown size={18} strokeWidth={2.5} />
        </span>
      </a>
    </>
  );
}
