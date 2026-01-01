import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import type { CapturedRequest, RequestGroup, PageSession, DomainGroup } from "@/types/request";
import {
  requestsCollection,
  pageSessionsCollection,
  addRequest as dbAddRequest,
  onNavigate as dbOnNavigate,
  generateUrlPattern,
  parsePageUrl,
} from "./collections";

export function useRequestStore() {
  const [currentPageUrl, setCurrentPageUrl] = useState<string>("unknown");
  const [selectedRequest, setSelectedRequest] = useState<CapturedRequest | null>(null);

  // Live query - pass collection directly for simpler data access
  const requestsResult = useLiveQuery(() => requestsCollection);
  const sessionsResult = useLiveQuery(() => pageSessionsCollection);

  // Extract data as arrays, handle various return formats
  const requests: CapturedRequest[] = Array.isArray(requestsResult?.data) 
    ? requestsResult.data 
    : requestsResult?.data 
      ? Array.from(Object.values(requestsResult.data)) 
      : [];

  const pageSessions: PageSession[] = Array.isArray(sessionsResult?.data)
    ? sessionsResult.data
    : sessionsResult?.data
      ? Array.from(Object.values(sessionsResult.data))
      : [];

  // Wrapper functions that call db mutations - pass current sessions from live query
  const addRequest = (request: Omit<CapturedRequest, "id" | "urlPattern">) => {
    return dbAddRequest(request, pageSessions);
  };

  const onNavigate = (newUrl: string) => {
    setCurrentPageUrl(newUrl);
    dbOnNavigate(newUrl, pageSessions);
  };

  // Mutations use data from live queries - no helper functions needed
  const clearRequests = () => {
    requests.forEach((r) => requestsCollection.utils.writeDelete(r.id));
    pageSessions.forEach((s) => pageSessionsCollection.utils.writeDelete(s.id));
    setSelectedRequest(null);
  };

  const clearDomain = (domain: string) => {
    const domainSessions = pageSessions.filter((s) => s.domain === domain);
    const pageUrls = new Set(domainSessions.map((s) => s.pageUrl));
    
    domainSessions.forEach((s) => pageSessionsCollection.utils.writeDelete(s.id));
    requests.filter((r) => pageUrls.has(r.pageUrl))
      .forEach((r) => requestsCollection.utils.writeDelete(r.id));
  };

  const clearPage = (pageUrl: string) => {
    const session = pageSessions.find((s) => s.pageUrl === pageUrl);
    if (session) {
      pageSessionsCollection.utils.writeDelete(session.id);
    }
    requests.filter((r) => r.pageUrl === pageUrl)
      .forEach((r) => requestsCollection.utils.writeDelete(r.id));
  };

  const cleanupOldSessions = (retentionHours: number) => {
    const cutoffTime = Date.now() - retentionHours * 60 * 60 * 1000;
    
    const oldSessions = pageSessions.filter((s) => s.timestamp < cutoffTime);
    oldSessions.forEach((s) => pageSessionsCollection.utils.writeDelete(s.id));
    
    const validPageUrls = new Set(
      pageSessions.filter((s) => s.timestamp >= cutoffTime).map((s) => s.pageUrl)
    );
    
    requests.filter((r) => !validPageUrls.has(r.pageUrl) && r.startTime < cutoffTime)
      .forEach((r) => requestsCollection.utils.writeDelete(r.id));
    
    if (oldSessions.length > 0) {
      console.log(`[RequestVisualizer] Cleaned up ${oldSessions.length} old sessions`);
    }
  };

  // Derived state: Group requests by URL pattern
  // React Compiler handles memoization automatically
  const groupedRequests: RequestGroup[] = (() => {
    const groups = new Map<string, CapturedRequest[]>();

    for (const request of requests) {
      const existing = groups.get(request.urlPattern) ?? [];
      groups.set(request.urlPattern, [...existing, request]);
    }

    return Array.from(groups.entries()).map(([pattern, reqs]) => ({
      pattern,
      requests: reqs.sort((a, b) => a.startTime - b.startTime),
      count: reqs.length,
      avgDuration: reqs.reduce((sum, r) => sum + r.duration, 0) / reqs.length,
    }));
  })();

  // Derived state: Group by domain -> pages
  const domainGroups: DomainGroup[] = (() => {
    const domains = new Map<string, PageSession[]>();

    for (const session of pageSessions) {
      const existing = domains.get(session.domain) ?? [];
      domains.set(session.domain, [...existing, session]);
    }

    return Array.from(domains.entries())
      .map(([domain, pages]) => ({
        domain,
        pages: pages.sort((a, b) => b.timestamp - a.timestamp),
        // Guard against undefined requests array
        totalRequests: pages.reduce((sum, p) => sum + (p.requests?.length ?? 0), 0),
      }))
      .sort((a, b) => b.totalRequests - a.totalRequests);
  })();

  return {
    requests,
    selectedRequest,
    setSelectedRequest,
    addRequest,
    onNavigate,
    clearRequests,
    clearDomain,
    clearPage,
    cleanupOldSessions,
    groupedRequests,
    domainGroups,
    currentPageUrl,
    pageSessions,
    isReady: requestsResult?.isReady && sessionsResult?.isReady,
  };
}
