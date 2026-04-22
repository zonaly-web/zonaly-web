"use client";

import { useAddressAutocomplete } from "@/hooks/use-address-autocomplete";
import { useGeocodeAddress } from "@/hooks/use-geocode-address";
import type { AutocompleteResult } from "@/lib/geocoding/schemas";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { useOnClickOutside } from "usehooks-ts";

export function SearchBar() {
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<AutocompleteResult | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(containerRef as React.RefObject<HTMLElement>, () =>
    setOpen(false)
  );

  const isDirty = value !== (selected?.fulltext ?? "");
  const { data: suggestions = [], isFetching } = useAddressAutocomplete(
    isDirty ? value : ""
  );
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

  function handleAnalyze() {
    if (!selected) return;
    geocode.mutate(selected.fulltext);
  }

  return (
    <div
      ref={containerRef}
      className="relative z-30 w-full max-w-[580px] mx-auto"
    >
      <div className="flex items-center bg-background rounded-[60px] pl-7 pr-1.5 py-1.5 shadow-[0_4px_14px_rgba(20,16,36,0.06),0_24px_56px_rgba(20,16,36,0.1)] border-2 border-transparent transition-[border-color,box-shadow] duration-300 focus-within:border-primary focus-within:shadow-[0_4px_14px_rgba(20,16,36,0.06),0_24px_56px_rgba(20,16,36,0.1),0_0_0_6px_rgba(79,60,224,0.12)]">
        <Search
          className="text-text-light shrink-0 mr-3"
          size={18}
          strokeWidth={2}
        />
        <input
          id="address-input"
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="address-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown ? `suggestion-${highlight}` : undefined
          }
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
          className="flex-1 border-none outline-none font-[inherit] text-[0.95rem] text-foreground bg-transparent py-3.5 font-normal placeholder:text-text-light min-w-0"
        />
        {isFetching && (
          <Loader2
            aria-hidden
            size={22}
            strokeWidth={2}
            className="shrink-0 mr-3 text-text-light animate-spin"
          />
        )}
        <button
          type="button"
          onClick={handleAnalyze}
          className="shrink-0 bg-primary text-white border-none py-3.5 px-[30px] rounded-[50px] font-[inherit] text-[0.88rem] font-semibold cursor-pointer flex items-center gap-2 tracking-[0.01em] shadow-[0_3px_12px_rgba(79,60,224,0.3)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent-light hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(79,60,224,0.35)] active:translate-y-0"
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
          className="absolute left-0 right-0 top-[calc(100%+6px)] bg-background rounded-[24px] shadow-[0_12px_32px_rgba(20,16,36,0.12)] overflow-hidden text-left z-10"
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
              className={`px-6 py-3 cursor-pointer text-[0.9rem] ${
                i === highlight ? "bg-muted" : ""
              }`}
            >
              <div className="text-foreground font-medium truncate">
                {s.fulltext}
              </div>
              {(s.city || s.zipcode) && (
                <div className="text-text-light text-[0.8rem] truncate">
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
