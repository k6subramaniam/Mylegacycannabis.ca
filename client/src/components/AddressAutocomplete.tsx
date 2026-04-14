import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2, X } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface AddressResult {
  street: string;
  city: string;
  province: string;
  provinceCode: string;
  postalCode: string;
  country: string;
}

interface Props {
  /** Called when user selects a complete address */
  onSelect: (address: AddressResult) => void;
  /** Optional: pre-filled search term */
  defaultValue?: string;
  /** Optional: placeholder text */
  placeholder?: string;
  /** Optional: input className override */
  className?: string;
  /** Optional: disabled state */
  disabled?: boolean;
}

// Canada Post AddressComplete API suggestion shape
interface Suggestion {
  Id: string;
  Text: string;
  Highlight: string;
  Description: string;
  Next: string; // "Find" (drill-down needed) or "Retrieve" (final address)
}

// Canada Post AddressComplete Retrieve result shape
interface RetrieveResult {
  Id: string;
  Line1: string;
  Line2: string;
  City: string;
  Province: string;
  ProvinceCode: string;
  PostalCode: string;
  CountryIso2: string;
}

// ─── Debounce helper ────────────────────────────────────────────────────────────

function useDebounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    ((...args: any[]) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), delay);
    }) as T,
    [delay]
  );
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AddressAutocomplete({
  onSelect,
  defaultValue = "",
  placeholder = "Start typing your address...",
  className = "",
  disabled = false,
}: Props) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ─── Fetch suggestions ────────────────────────────────────────────────────────

  const fetchSuggestions = useCallback(
    async (searchTerm: string, lastId?: string) => {
      if (!searchTerm || searchTerm.length < 3) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({ SearchTerm: searchTerm });
        if (lastId) params.set("LastId", lastId);
        const res = await fetch(`/api/address-lookup?${params}`);
        const data = await res.json();
        const items: Suggestion[] = data?.Items ?? [];
        setSuggestions(items);
        setIsOpen(items.length > 0);
        setSelectedIdx(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const debouncedFetch = useDebounce(fetchSuggestions, 300);

  // ─── Retrieve full address ────────────────────────────────────────────────────

  const retrieveAddress = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/address-lookup/retrieve?Id=${encodeURIComponent(id)}`
        );
        const data = await res.json();
        const items: RetrieveResult[] = data?.Items ?? [];
        if (items.length > 0) {
          const addr = items[0];
          const street = [addr.Line1, addr.Line2].filter(Boolean).join(", ");
          setQuery(street);
          setIsOpen(false);
          setSuggestions([]);
          onSelect({
            street,
            city: addr.City,
            province: addr.Province,
            provinceCode: addr.ProvinceCode,
            postalCode: addr.PostalCode,
            country: addr.CountryIso2 || "CA",
          });
        }
      } catch (err) {
        console.error("[AddressAutocomplete] Retrieve error:", err);
      } finally {
        setLoading(false);
      }
    },
    [onSelect]
  );

  // ─── Selection handler ────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    async (suggestion: Suggestion) => {
      if (suggestion.Next === "Find") {
        // Drill down — fetch more specific suggestions
        setQuery(suggestion.Text);
        await fetchSuggestions(suggestion.Text, suggestion.Id);
      } else {
        // Final address — retrieve full details
        await retrieveAddress(suggestion.Id);
      }
    },
    [fetchSuggestions, retrieveAddress]
  );

  // ─── Keyboard navigation ─────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIdx(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIdx(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIdx >= 0 && selectedIdx < suggestions.length) {
          handleSelect(suggestions[selectedIdx]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIdx(-1);
        break;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            const val = e.target.value;
            setQuery(val);
            debouncedFetch(val);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-label="Address search"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
          className={
            className ||
            "w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2D8E]/20 focus:border-[#4B2D8E]/40 disabled:bg-gray-50 disabled:cursor-not-allowed"
          }
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
          />
        )}
        {query && !loading && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            aria-label="Clear address"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((s, idx) => (
            <li
              key={s.Id}
              role="option"
              aria-selected={idx === selectedIdx}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setSelectedIdx(idx)}
              className={`px-3 py-2.5 cursor-pointer text-sm border-b border-gray-50 last:border-0 transition-colors ${
                idx === selectedIdx
                  ? "bg-[#4B2D8E]/5 text-[#4B2D8E]"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <div className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.Text}</p>
                  {s.Description && (
                    <p className="text-xs text-gray-400 truncate">
                      {s.Description}
                    </p>
                  )}
                </div>
                {s.Next === "Find" && (
                  <span className="ml-auto text-[10px] text-gray-400 shrink-0 self-center">
                    more...
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
