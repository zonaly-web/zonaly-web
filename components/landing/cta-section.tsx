"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="relative px-6 pt-25 pb-20 text-center">
      <div
        aria-hidden
        className="via-foreground/8 absolute top-0 right-[10%] left-[10%] h-px bg-gradient-to-r from-transparent to-transparent"
      />
      <div
        aria-hidden
        className="via-foreground/8 absolute right-[10%] bottom-0 left-[10%] h-px bg-gradient-to-r from-transparent to-transparent"
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-foreground mb-3.5 font-sans text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.15] font-extrabold tracking-[-0.03em]">
          Rejoignez les investisseurs
          <br />
          qui décident avec{" "}
          <em className="font-display text-primary font-bold italic">les bonnes données.</em>
        </h2>
        <p className="text-text-muted mb-8 text-[0.95rem]">
          Gratuit, instantané, sans inscription.
        </p>
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            const input = document.getElementById("address-input");
            document.getElementById("top")?.scrollIntoView({ behavior: "smooth", block: "start" });
            // Focus after the smooth-scroll has started so the browser
            // doesn't cancel the scroll when the input gains focus.
            setTimeout(() => input?.focus({ preventScroll: true }), 600);
          }}
          className="bg-primary hover:bg-accent-light inline-flex items-center gap-2.5 rounded-[60px] border-none px-12 py-[18px] font-[inherit] text-[0.95rem] font-semibold text-white no-underline shadow-[0_4px_16px_rgba(79,60,224,0.3)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(79,60,224,0.35)]"
        >
          Lancer une analyse
          <ArrowRight size={18} strokeWidth={2.5} />
        </a>
      </motion.div>
    </section>
  );
}
