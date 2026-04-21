export function Footer() {
  return (
    <footer className="px-6 pt-12 pb-9 max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center sm:justify-between gap-4 sm:gap-0 text-center sm:text-left text-[0.78rem] text-text-light border-t border-foreground/[0.06]">
      <span>
        © 2025 Zonaly · Données : DVF, INSEE, ATMO, SSMSI, Géorisques, IGN, OSM
      </span>
      <div className="flex gap-6">
        <a
          href="#"
          className="text-text-muted no-underline font-medium transition-colors duration-200 hover:text-primary"
        >
          Mentions légales
        </a>
        <a
          href="#"
          className="text-text-muted no-underline font-medium transition-colors duration-200 hover:text-primary"
        >
          CGU
        </a>
      </div>
    </footer>
  );
}
