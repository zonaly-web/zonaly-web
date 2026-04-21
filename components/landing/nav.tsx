"use client";

import Image from "next/image";
import { useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "@/lib/utils";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 40);
  });

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-100 flex items-center justify-between",
        "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        scrolled
          ? "bg-background/88 backdrop-blur-2xl backdrop-saturate-150 border-b border-foreground/5 px-5 md:px-12 py-3.5"
          : "px-5 md:px-12 py-5"
      )}
    >
      <a
        href="#"
        className="group flex items-center gap-[11px] font-bold text-[1.15rem] text-foreground no-underline tracking-[-0.01em]"
      >
        <div className="grid place-items-center w-[38px] h-[38px] rounded-[11px] overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-[8deg] group-hover:scale-[1.06]">
          <Image
            src="/zonaly-logo-icon.svg"
            alt="Zonaly"
            width={38}
            height={38}
            priority
          />
        </div>
        Zonaly
      </a>

      <div className="absolute left-1/2 hidden md:flex -translate-x-1/2 items-center gap-1.5 text-[0.72rem] font-semibold tracking-[0.06em] uppercase py-[7px] px-4 rounded-full text-primary bg-primary/5 border border-primary/10">
        <span className="w-[7px] h-[7px] rounded-full bg-score-a animate-pulse-dot shadow-[0_0_6px_rgba(29,185,84,0.4)]" />
        Bêta gratuite · France entière
      </div>

      <ul className="hidden md:flex items-center gap-7 list-none">
        <li>
          <a
            href="#top"
            className="relative text-[0.85rem] font-medium text-text-muted transition-colors duration-200 hover:text-primary after:content-[''] after:absolute after:-bottom-[3px] after:left-0 after:right-0 after:h-[1.5px] after:bg-primary after:scale-x-0 after:origin-right hover:after:scale-x-100 hover:after:origin-left after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.16,1,0.3,1)]"
          >
            Fonctionnalités
          </a>
        </li>
        <li>
          <a
            href="#example"
            className="relative text-[0.85rem] font-medium text-text-muted transition-colors duration-200 hover:text-primary after:content-[''] after:absolute after:-bottom-[3px] after:left-0 after:right-0 after:h-[1.5px] after:bg-primary after:scale-x-0 after:origin-right hover:after:scale-x-100 hover:after:origin-left after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.16,1,0.3,1)]"
          >
            Exemple
          </a>
        </li>
        <li>
          <a
            href="#top"
            className="bg-bg-dark text-white py-[9px] px-[22px] rounded-full font-semibold text-[0.82rem] shadow-[0_2px_8px_rgba(20,16,36,0.15)] transition-all duration-250 hover:bg-[#2a2550] hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(30,26,58,0.4)]"
          >
            Nous contacter
          </a>
        </li>
      </ul>
    </nav>
  );
}
