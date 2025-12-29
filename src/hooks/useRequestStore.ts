import { useState, useCallback, useMemo } from "react";
import type { CapturedRequest, RequestGroup } from "@/types/request";

function generateUrlPattern(url: string): string {
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

export function useRequestStore() {
  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CapturedRequest | null>(null);

  const addRequest = useCallback((request: Omit<CapturedRequest, "id" | "urlPattern">) => {
    const newRequest: CapturedRequest = {
      ...request,
      id: crypto.randomUUID(),
      urlPattern: generateUrlPattern(request.url),
    };
    setRequests((prev) => [...prev, newRequest]);
    return newRequest;
  }, []);

  const clearRequests = useCallback(() => {
    setRequests([]);
    setSelectedRequest(null);
  }, []);

  const groupedRequests = useMemo((): RequestGroup[] => {
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
  }, [requests]);

  return {
    requests,
    selectedRequest,
    setSelectedRequest,
    addRequest,
    clearRequests,
    groupedRequests,
  };
}
