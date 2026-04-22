import { cn } from "@/lib/utils";

export function Footer({ isAnalyse = false }: { isAnalyse?: boolean }) {
  return (
    <footer
      className={cn(
        "text-text-light flex flex-col items-center gap-4 px-5 pb-7 text-center text-[0.78rem] sm:flex-row sm:justify-between sm:gap-0 sm:text-left md:px-12",
        isAnalyse ? "pt-4" : "pt-12",
      )}
    >
      <span>© 2025 Zonaly · Données : DVF, INSEE, ATMO, SSMSI, Géorisques, IGN, OSM</span>
      <div className="flex gap-6">
        <a
          href="#"
          className="text-text-muted hover:text-primary font-medium no-underline transition-colors duration-200"
        >
          Mentions légales
        </a>
        <a
          href="#"
          className="text-text-muted hover:text-primary font-medium no-underline transition-colors duration-200"
        >
          CGU
        </a>
      </div>
    </footer>
  );
}
