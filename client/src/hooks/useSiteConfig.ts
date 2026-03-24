import { trpc } from "@/lib/trpc";

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
    isLoading,
  };
}
