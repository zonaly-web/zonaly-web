"use client";

import { useAddressAutocomplete } from "@/hooks/use-address-autocomplete";
import { useGeocodeAddress } from "@/hooks/use-geocode-address";
import type { AutocompleteResult } from "@/lib/geocoding/schemas";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { useOnClickOutside } from "usehooks-ts";

export function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<AutocompleteResult | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(containerRef as React.RefObject<HTMLElement>, () => setOpen(false));

  const isDirty = value !== (selected?.fulltext ?? "");
  const { data: suggestions = [], isFetching } = useAddressAutocomplete(isDirty ? value : "");
  const geocode = useGeocodeAddress();

  const showDropdown = open && suggestions.length > 0 && isDirty;

  function handleSelect(result: AutocompleteResult) {
    setValue(result.fulltext);
    setSelected(result);
    setOpen(false);
  }

  function handleChange(next: string) {
    setValue(next);
    setOpen(true);
    setHighlight(0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = suggestions[highlight];
      if (pick) handleSelect(pick);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  async function handleAnalyze() {
    if (!selected) return;
    const feature = await geocode.mutateAsync(selected.fulltext);
    const citycode = feature?.properties.citycode;
    if (!feature || !citycode) return;
    const params = new URLSearchParams({
      label: feature.properties.label,
      citycode,
      lon: String(feature.geometry.coordinates[0]),
      lat: String(feature.geometry.coordinates[1]),
    });
    router.push(`/analyse?${params.toString()}`);
  }

  return (
    <div ref={containerRef} className="relative z-30 mx-auto w-full max-w-[580px]">
      <div className="bg-background focus-within:border-primary flex items-center rounded-[60px] border-2 border-transparent py-1.5 pr-1.5 pl-7 shadow-[0_4px_14px_rgba(20,16,36,0.06),0_24px_56px_rgba(20,16,36,0.1)] transition-[border-color,box-shadow] duration-300 focus-within:shadow-[0_4px_14px_rgba(20,16,36,0.06),0_24px_56px_rgba(20,16,36,0.1),0_0_0_6px_rgba(79,60,224,0.12)]">
        <Search className="text-text-light mr-3 shrink-0" size={18} strokeWidth={2} />
        <input
          id="address-input"
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="address-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={showDropdown ? `suggestion-${highlight}` : undefined}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => value.length >= 3 && isDirty && setOpen(true)}
          onBlur={() => {
            // Si la fenêtre/onglet a perdu le focus, on ne fait rien
            if (!document.hasFocus()) return;

            if (value === "") {
              setSelected(null);
            } else if (value !== selected?.fulltext) {
              setValue(selected?.fulltext ?? "");
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="12 rue de Rivoli, Paris 75001"
          className="text-foreground placeholder:text-text-light min-w-0 flex-1 border-none bg-transparent py-3.5 font-[inherit] text-[0.95rem] font-normal outline-none"
        />
        {isFetching && (
          <Loader2
            aria-hidden
            size={22}
            strokeWidth={2}
            className="text-text-light mr-3 shrink-0 animate-spin"
          />
        )}
        <button
          type="button"
          onClick={handleAnalyze}
          className="bg-primary hover:bg-accent-light flex shrink-0 cursor-pointer items-center gap-2 rounded-[50px] border-none px-[30px] py-3.5 font-[inherit] text-[0.88rem] font-semibold tracking-[0.01em] text-white shadow-[0_3px_12px_rgba(79,60,224,0.3)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(79,60,224,0.35)] active:translate-y-0"
        >
          {geocode.isPending ? (
            <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
          ) : (
            <>
              Analyser
              <ArrowRight size={16} strokeWidth={2.5} />
            </>
          )}
        </button>
      </div>

      {showDropdown && (
        <ul
          id="address-suggestions"
          role="listbox"
          className="bg-background absolute top-[calc(100%+6px)] right-0 left-0 z-10 overflow-hidden rounded-[24px] text-left shadow-[0_12px_32px_rgba(20,16,36,0.12)]"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.fulltext}-${i}`}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === highlight}
              onClick={() => handleSelect(s)}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-6 py-3 text-[0.9rem] ${
                i === highlight ? "bg-muted" : ""
              }`}
            >
              <div className="text-foreground truncate font-medium">{s.fulltext}</div>
              {(s.city || s.zipcode) && (
                <div className="text-text-light truncate text-[0.8rem]">
                  {[s.zipcode, s.city].filter(Boolean).join(" · ")}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
