import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { QueryClient } from "@tanstack/react-query";
import type { CapturedRequest, PageSession } from "@/types/request";

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

// Helper to generate URL pattern for grouping
export function generateUrlPattern(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    const patternParts = pathParts.map((part) => {
      if (/^\d+$/.test(part)) return ":id";
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          part
        )
      )
        return ":uuid";
      if (/^[0-9a-f]{24}$/i.test(part)) return ":objectId";
      return part;
    });
    return `${urlObj.origin}/${patternParts.join("/")}`;
  } catch {
    return url;
  }
}

// Helper to parse page URL into domain and path
export function parsePageUrl(pageUrl: string): { domain: string; path: string } {
  try {
    const urlObj = new URL(pageUrl);
    return { domain: urlObj.hostname, path: urlObj.pathname };
  } catch {
    return { domain: "unknown", path: "/" };
  }
}

// Add a new request - uses direct write for immediate update
export function addRequest(
  request: Omit<CapturedRequest, "id" | "urlPattern">,
  existingSessions: PageSession[]
): CapturedRequest {
  const newRequest: CapturedRequest = {
    ...request,
    id: crypto.randomUUID(),
    urlPattern: generateUrlPattern(request.url),
  };

  // Direct write to synced store - immediately visible in all live queries
  requestsCollection.utils.writeInsert(newRequest);

  // Ensure page session exists
  const { domain, path } = parsePageUrl(request.pageUrl);
  const existingSession = existingSessions.find((s) => s.pageUrl === request.pageUrl);

  if (!existingSession) {
    pageSessionsCollection.utils.writeInsert({
      id: crypto.randomUUID(),
      pageUrl: request.pageUrl,
      domain,
      path,
      timestamp: Date.now(),
      requests: [],
    });
  }

  return newRequest;
}

// Navigate to a new page - creates session if needed
export function onNavigate(newUrl: string, existingSessions: PageSession[]): void {
  const { domain, path } = parsePageUrl(newUrl);
  const existingSession = existingSessions.find((s) => s.pageUrl === newUrl);

  if (!existingSession) {
    pageSessionsCollection.utils.writeInsert({
      id: crypto.randomUUID(),
      pageUrl: newUrl,
      domain,
      path,
      timestamp: Date.now(),
      requests: [],
    });
  }
}
