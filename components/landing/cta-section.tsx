"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="relative text-center px-6 pt-25 pb-20">
      <div
        aria-hidden
        className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-foreground/8 to-transparent"
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="font-sans text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-[-0.03em] text-foreground mb-3.5 leading-[1.15]">
          Rejoignez les investisseurs
          <br />
          qui décident avec{" "}
          <em className="font-display italic text-primary font-bold">
            les bonnes données.
          </em>
        </h2>
        <p className="text-[0.95rem] text-text-muted mb-8">
          Gratuit, instantané, sans inscription.
        </p>
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            const input = document.getElementById("address-input");
            document
              .getElementById("top")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
            // Focus after the smooth-scroll has started so the browser
            // doesn't cancel the scroll when the input gains focus.
            setTimeout(() => input?.focus({ preventScroll: true }), 600);
          }}
          className="inline-flex items-center gap-2.5 py-[18px] px-12 bg-primary text-white border-none rounded-[60px] font-[inherit] text-[0.95rem] font-semibold no-underline transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_4px_16px_rgba(79,60,224,0.3)] hover:bg-accent-light hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(79,60,224,0.35)]"
        >
          Lancer une analyse
          <ArrowRight size={18} strokeWidth={2.5} />
        </a>
      </motion.div>
    </section>
  );
}
