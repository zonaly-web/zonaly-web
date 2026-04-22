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
        "fixed top-0 right-0 left-0 z-100 flex items-center justify-between",
        "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        scrolled
          ? "bg-background/88 border-foreground/5 border-b px-5 py-3.5 backdrop-blur-2xl backdrop-saturate-150 md:px-12"
          : "px-5 py-5 md:px-12",
      )}
    >
      <a
        href="#"
        className="group text-foreground flex items-center gap-[11px] text-[1.15rem] font-bold tracking-[-0.01em] no-underline"
      >
        <div className="grid h-[38px] w-[38px] place-items-center overflow-hidden rounded-[11px] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.06] group-hover:-rotate-[8deg]">
          <Image src="/zonaly-logo-icon.svg" alt="Zonaly" width={38} height={38} priority />
        </div>
        Zonaly
      </a>

      <div className="text-primary bg-primary/5 border-primary/10 absolute left-1/2 hidden -translate-x-1/2 items-center gap-1.5 rounded-full border px-4 py-[7px] text-[0.72rem] font-semibold tracking-[0.06em] uppercase md:flex">
        <span className="bg-score-a animate-pulse-dot h-[7px] w-[7px] rounded-full shadow-[0_0_6px_rgba(29,185,84,0.4)]" />
        Bêta gratuite · France entière
      </div>

      <ul className="hidden list-none items-center gap-7 md:flex">
        <li>
          <a
            href="#top"
            className="text-text-muted hover:text-primary after:bg-primary relative text-[0.85rem] font-medium transition-colors duration-200 after:absolute after:right-0 after:-bottom-[3px] after:left-0 after:h-[1.5px] after:origin-right after:scale-x-0 after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.16,1,0.3,1)] after:content-[''] hover:after:origin-left hover:after:scale-x-100"
          >
            Fonctionnalités
          </a>
        </li>
        <li>
          <a
            href="#example"
            className="text-text-muted hover:text-primary after:bg-primary relative text-[0.85rem] font-medium transition-colors duration-200 after:absolute after:right-0 after:-bottom-[3px] after:left-0 after:h-[1.5px] after:origin-right after:scale-x-0 after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.16,1,0.3,1)] after:content-[''] hover:after:origin-left hover:after:scale-x-100"
          >
            Exemple
          </a>
        </li>
        <li>
          <a
            href="#top"
            className="bg-bg-dark rounded-full px-[22px] py-[9px] text-[0.82rem] font-semibold text-white shadow-[0_2px_8px_rgba(20,16,36,0.15)] transition-all duration-250 hover:-translate-y-[1px] hover:bg-[#2a2550] hover:shadow-[0_4px_16px_rgba(30,26,58,0.4)]"
          >
            Nous contacter
          </a>
        </li>
      </ul>
    </nav>
  );
}
