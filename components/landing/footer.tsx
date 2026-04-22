export function Footer() {
  return (
    <footer className="text-text-light border-foreground/[0.06] mx-auto flex max-w-[1100px] flex-col items-center gap-4 border-t px-6 pt-12 pb-9 text-center text-[0.78rem] sm:flex-row sm:justify-between sm:gap-0 sm:text-left">
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
