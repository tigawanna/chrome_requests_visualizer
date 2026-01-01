import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { QueryClient } from "@tanstack/react-query";
import type { CapturedRequest, PageSession } from "@/types/request";
import { generateUrlPattern as generatePattern, parsePageUrl as parseUrl } from "@/lib/url";

// Shared query client for collections
export const collectionQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Data doesn't go stale (we control it via direct writes)
      gcTime: Infinity, // Never garbage collect
    },
  },
});

// Primary collection: All captured network requests
export const requestsCollection = createCollection(
  queryCollectionOptions<CapturedRequest>({
    id: "requests",
    queryKey: ["requests"],
    queryFn: async () => [], // No server fetch - we populate via direct writes
    queryClient: collectionQueryClient,
    getKey: (item) => item.id,
    enabled: false, // Don't auto-fetch
  })
);

// Secondary collection: Page sessions grouped by URL
export const pageSessionsCollection = createCollection(
  queryCollectionOptions<PageSession>({
    id: "page-sessions",
    queryKey: ["page-sessions"],
    queryFn: async () => [], // No server fetch - we populate via direct writes
    queryClient: collectionQueryClient,
    getKey: (item) => item.id,
    enabled: false, // Don't auto-fetch
  })
);

// Re-export shared utilities for backward compatibility
export { generateUrlPattern, parsePageUrl } from "@/lib/url";

// Add a new request - uses direct write for immediate update
export function addRequest(
  request: Omit<CapturedRequest, "id" | "urlPattern">
): CapturedRequest {
  const newRequest: CapturedRequest = {
    ...request,
    id: crypto.randomUUID(),
    urlPattern: generatePattern(request.url),
  };

  // Direct write to synced store - immediately visible in all live queries
  requestsCollection.utils.writeInsert(newRequest);

  return newRequest;
}
