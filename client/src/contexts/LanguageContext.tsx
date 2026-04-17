import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  LanguageContext,
  translations,
  interpolate,
  LOCALE_STORAGE_KEY,
  FRENCH_PROVINCES,
  type Locale,
} from "@/i18n";

/**
 * LanguageProvider
 *
 * 1. On mount, checks localStorage for a previously selected locale.
 * 2. If nothing stored, calls /api/geo to detect the user's province.
 *    - If province matches Quebec -> sets locale to 'fr'.
 *    - Otherwise falls back to browser language (navigator.language).
 * 3. Any manual toggle is persisted to localStorage.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === "fr" || stored === "en") return stored;
    } catch {
      /* SSR / blocked storage */
    }
    return "en"; // default
  });

  const [detected, setDetected] = useState(false);

  // Public setter — persists to localStorage
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {}
  }, []);

  // Auto-detect on first load (only if user hasn't already chosen)
  useEffect(() => {
    const stored = (() => {
      try {
        return localStorage.getItem(LOCALE_STORAGE_KEY);
      } catch {
        return null;
      }
    })();
    if (stored) {
      setDetected(true);
      return;
    } // user already chose

    (async () => {
      try {
        const res = await fetch("/api/geo");
        if (res.ok) {
          const data = await res.json();
          const province = data.province || data.region || "";
          if (
            FRENCH_PROVINCES.some(p =>
              province.toLowerCase().includes(p.toLowerCase())
            )
          ) {
            setLocale("fr");
            setDetected(true);
            return;
          }
        }
      } catch {
        /* geo endpoint failed — fall back */
      }

      // Fallback: check browser language
      try {
        const browserLang =
          navigator.language || (navigator as any).userLanguage || "";
        if (browserLang.toLowerCase().startsWith("fr")) {
          setLocale("fr");
        }
      } catch {}

      setDetected(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const t = translations[locale];

  // Dot-path accessor with interpolation
  const tt = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const parts = key.split(".");
      let val: any = t;
      for (const part of parts) {
        val = val?.[part];
        if (val === undefined) return key; // fallback: return the key itself
      }
      if (typeof val !== "string") return key;
      return vars ? interpolate(val, vars) : val;
    },
    [t]
  );

  // Set html lang attribute
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // ⚡ Bolt Performance Optimization:
  // 💡 What: Memoized the LanguageContext value object using useMemo.
  // 🎯 Why: Previously, a new object reference was created on every render of LanguageProvider,
  //          causing all consuming components to re-render unnecessarily even when language state didn't change.
  // 📊 Impact: Reduces unnecessary re-renders of all components consuming useLanguage().
  // 🔬 Measurement: Verify with React DevTools Profiler.
  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      tt,
    }),
    [locale, setLocale, t, tt]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}
