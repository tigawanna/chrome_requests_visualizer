import { useState, useMemo } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { and, eq, gte, ilike, lt, or } from "@tanstack/db";
import type { CapturedRequest, RequestGroup, PageSession, DomainGroup } from "@/types/request";
import {
  requestsCollection,
  addRequest as dbAddRequest,
  generateUrlPattern,
  parsePageUrl,
} from "./collections";

export type MethodFilter = "ALL" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
export type StatusFilter = "ALL" | "2xx" | "3xx" | "4xx" | "5xx";
export type TypeFilter = "ALL" | "api" | "document" | "script" | "image";
export type SortOption = "time-desc" | "time-asc" | "method" | "status";
export type SearchField = "url" | "method" | "requestBody" | "responseBody" | "requestHeaders" | "responseHeaders";

export const ALL_SEARCH_FIELDS: SearchField[] = [
  "url", "method", "requestBody", "responseBody", "requestHeaders", "responseHeaders",
];

export const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
  url: "URL",
  method: "Method",
  requestBody: "Request Body",
  responseBody: "Response Body",
  requestHeaders: "Request Headers",
  responseHeaders: "Response Headers",
};

export interface RequestFilters {
  search: string;
  searchFields: SearchField[];
  method: MethodFilter;
  status: StatusFilter;
  type: TypeFilter;
  segment: string;
  sortBy: SortOption;
}

const defaultFilters: RequestFilters = {
  search: "",
  searchFields: [...ALL_SEARCH_FIELDS],
  method: "ALL",
  status: "ALL",
  type: "api",
  segment: "ALL",
  sortBy: "time-desc",
};

const STATUS_RANGE_MAP: Record<Exclude<StatusFilter, "ALL">, [number, number]> = {
  "2xx": [200, 300],
  "3xx": [300, 400],
  "4xx": [400, 500],
  "5xx": [500, 600],
};

// Helper to extract data from useLiveQuery result
function extractRequestsArray(result: { data?: unknown }): CapturedRequest[] {
  const data = result?.data;
  if (Array.isArray(data)) return data as CapturedRequest[];
  if (data && typeof data === 'object') return Array.from(Object.values(data)) as CapturedRequest[];
  return [];
}

// Helper to extract unique route segments
function extractRouteSegments(requests: CapturedRequest[]): string[] {
  const segments = new Set<string>();
  for (const req of requests) {
    try {
      const pathname = new URL(req.url).pathname;
      const parts = pathname.split("/").filter(Boolean);
      parts.forEach((part) => {
        if (!/^\d+$/.test(part) && 
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part) &&
            !/^[0-9a-f]{24}$/i.test(part)) {
          segments.add(part);
        }
      });
    } catch {
      // Ignore invalid URLs
    }
  }
  return Array.from(segments).sort();
}

export function useRequestStore() {
  const [currentPageUrl, setCurrentPageUrl] = useState<string>("unknown");
  const [selectedRequest, setSelectedRequest] = useState<CapturedRequest | null>(null);
  const [filters, setFilters] = useState<RequestFilters>(defaultFilters);
  // Multi-select for copy feature
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Marked/bookmarked requests for visual tracking
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());

  // Live query for all requests (base collection) - used for route segments extraction
  const allRequestsResult = useLiveQuery(() => requestsCollection);
  const allRequests = extractRequestsArray(allRequestsResult);

  // Get available route segments from all requests
  const routeSegments = useMemo(() => extractRouteSegments(allRequests), [allRequests]);

  // Determine sort direction from filters
  const sortDir = filters.sortBy === "time-asc" ? "asc" : "desc";

  // TanStack DB filtered query with where clauses
  // Re-executes when any filter dependency changes
  const filteredResult = useLiveQuery(
    (q) => {
      let query = q.from({ req: requestsCollection });

      if (filters.method !== "ALL") {
        query = query.where(({ req }) => eq(req.method, filters.method));
      }

      if (filters.status !== "ALL") {
        const [min, max] = STATUS_RANGE_MAP[filters.status];
        query = query.where(({ req }) =>
          and(gte(req.status, min), lt(req.status, max))
        );
      }

      if (filters.type !== "ALL") {
        query = query.where(({ req }) => eq(req.type, filters.type));
      }

      if (filters.segment !== "ALL") {
        query = query.where(({ req }) => 
          or(
            ilike(req.url, `%/${filters.segment}/%`),
            ilike(req.url, `%/${filters.segment}`)
          )
        );
      }

      // Apply sorting
      query = query.orderBy(({ req }) => req.startTime, sortDir as "asc" | "desc");

      return query;
    },
    [filters.method, filters.status, filters.type, filters.segment, sortDir]
  );

  const filteredRequests = useMemo(() => {
    let result = extractRequestsArray(filteredResult);

    if (filters.search && filters.searchFields.length > 0) {
      const term = filters.search.toLowerCase();
      const fields = new Set(filters.searchFields);
      result = result.filter((req) => {
        if (fields.has("url") && req.url.toLowerCase().includes(term)) return true;
        if (fields.has("method") && req.method.toLowerCase().includes(term)) return true;
        if (fields.has("requestBody") && req.requestBody?.toLowerCase().includes(term)) return true;
        if (fields.has("responseBody") && req.responseBody?.toLowerCase().includes(term)) return true;
        if (fields.has("requestHeaders") && JSON.stringify(req.requestHeaders).toLowerCase().includes(term)) return true;
        if (fields.has("responseHeaders") && JSON.stringify(req.responseHeaders).toLowerCase().includes(term)) return true;
        return false;
      });
    }

    if (filters.sortBy === "method") {
      result.sort((a, b) => a.method.localeCompare(b.method));
    } else if (filters.sortBy === "status") {
      result.sort((a, b) => a.status - b.status);
    }

    return result;
  }, [filteredResult, filters.search, filters.searchFields, filters.sortBy]);

  // Filtered grouped requests
  const filteredGroupedRequests: RequestGroup[] = useMemo(() => {
    const groups = new Map<string, CapturedRequest[]>();

    for (const request of filteredRequests) {
      const existing = groups.get(request.urlPattern) ?? [];
      groups.set(request.urlPattern, [...existing, request]);
    }

    return Array.from(groups.entries()).map(([pattern, reqs]) => ({
      pattern,
      requests: reqs.sort((a, b) => a.startTime - b.startTime),
      count: reqs.length,
      avgDuration: reqs.reduce((sum, r) => sum + r.duration, 0) / reqs.length,
    }));
  }, [filteredRequests]);

  // Derive sessions from allRequests by grouping by pageUrl
  const pageSessions: PageSession[] = useMemo(() => {
    const sessionMap = new Map<string, { requests: CapturedRequest[]; timestamp: number }>();
    
    for (const request of allRequests) {
      const existing = sessionMap.get(request.pageUrl);
      if (existing) {
        existing.requests.push(request);
        existing.timestamp = Math.max(existing.timestamp, request.startTime);
      } else {
        sessionMap.set(request.pageUrl, {
          requests: [request],
          timestamp: request.startTime,
        });
      }
    }

    return Array.from(sessionMap.entries()).map(([pageUrl, data]) => {
      const { domain, path } = parsePageUrl(pageUrl);
      return {
        id: pageUrl,
        pageUrl,
        domain,
        path,
        timestamp: data.timestamp,
        requests: data.requests.sort((a, b) => a.startTime - b.startTime),
      };
    });
  }, [allRequests]);

  // Derived state: Group by domain -> pages
  const domainGroups: DomainGroup[] = useMemo(() => {
    const domains = new Map<string, PageSession[]>();

    for (const session of pageSessions) {
      const existing = domains.get(session.domain) ?? [];
      domains.set(session.domain, [...existing, session]);
    }

    return Array.from(domains.entries())
      .map(([domain, pages]) => ({
        domain,
        pages: pages.sort((a, b) => b.timestamp - a.timestamp),
        totalRequests: pages.reduce((sum, p) => sum + p.requests.length, 0),
      }))
      .sort((a, b) => b.totalRequests - a.totalRequests);
  }, [pageSessions]);

  // Add request
  const addRequest = (request: Omit<CapturedRequest, "id" | "urlPattern">) => {
    return dbAddRequest(request);
  };

  const onNavigate = (newUrl: string) => {
    setCurrentPageUrl(newUrl);
  };

  // Clear all requests
  const clearRequests = () => {
    allRequests.forEach((r) => requestsCollection.utils.writeDelete(r.id));
    setSelectedRequest(null);
  };

  // Clear requests for a domain
  const clearDomain = (domain: string) => {
    allRequests
      .filter((r) => {
        const { domain: reqDomain } = parsePageUrl(r.pageUrl);
        return reqDomain === domain;
      })
      .forEach((r) => requestsCollection.utils.writeDelete(r.id));
  };

  // Clear requests for a specific page
  const clearPage = (pageUrl: string) => {
    allRequests
      .filter((r) => r.pageUrl === pageUrl)
      .forEach((r) => requestsCollection.utils.writeDelete(r.id));
  };

  // Cleanup old requests
  const cleanupOldSessions = (retentionHours: number) => {
    const cutoffTime = Date.now() - retentionHours * 60 * 60 * 1000;
    const oldReqs = allRequests.filter((r) => r.startTime < cutoffTime);
    oldReqs.forEach((r) => requestsCollection.utils.writeDelete(r.id));
    
    if (oldReqs.length > 0) {
      console.log(`[RequestVisualizer] Cleaned up ${oldReqs.length} old requests`);
    }
  };

  // Selection toggle helpers
  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Mark/bookmark toggle helpers
  const toggleMarked = (id: string) => {
    setMarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearMarked = () => {
    setMarkedIds(new Set());
  };

  // Get requests for copy - prioritize selected, fall back to filtered
  const getRequestsForCopy = (): CapturedRequest[] => {
    if (selectedIds.size > 0) {
      return filteredRequests.filter(r => selectedIds.has(r.id));
    }
    return filteredRequests;
  };

  return {
    // All requests (unfiltered)
    requests: allRequests,
    // Filtered requests based on current filters
    filteredRequests,
    filteredGroupedRequests,
    // Filter state and setters
    filters,
    setFilters,
    routeSegments,
    // Detail selection (single request for detail view)
    selectedRequest,
    setSelectedRequest,
    // Multi-select for copy
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelection,
    // Mark/bookmark for visual tracking
    markedIds,
    toggleMarked,
    clearMarked,
    // Helper for copy
    getRequestsForCopy,
    // Mutations
    addRequest,
    onNavigate,
    clearRequests,
    clearDomain,
    clearPage,
    cleanupOldSessions,
    // Derived state (unfiltered, for sessions view)
    groupedRequests: filteredGroupedRequests, // Use filtered for grouped view
    domainGroups,
    currentPageUrl,
    pageSessions,
    isReady: allRequestsResult?.isReady ?? false,
  };
}
