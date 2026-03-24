import { trpc } from "@/lib/trpc";

export type DayHours = { open: string; close: string; closed: boolean };
export type StoreHours = Record<string, DayHours>;

/**
 * Hook that returns the site configuration from the server.
 * Caches aggressively — only refetches on mount, not on window focus.
 */
export function useSiteConfig() {
  const { data, isLoading } = trpc.store.siteConfig.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    /** Whether ID verification is required for orders. Default: true while loading. */
    idVerificationEnabled: data?.idVerificationEnabled ?? true,
    /** Maintenance mode configuration */
    maintenance: {
      enabled: data?.maintenance?.enabled ?? false,
      title: data?.maintenance?.title ?? "We'll Be Right Back",
      message: data?.maintenance?.message ?? "Our store is currently undergoing maintenance.",
    },
    /** Store hours configuration */
    storeHours: {
      enabled: data?.storeHours?.enabled ?? true,
      hours: (data?.storeHours?.hours ?? null) as StoreHours | null,
      note: data?.storeHours?.note ?? "",
    },
    isLoading,
  };
}
