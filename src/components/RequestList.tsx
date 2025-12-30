import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Clock, FileJson, Key, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CapturedRequest, RequestGroup } from "@/types/request";
import { extractJWTFromHeaders } from "@/lib/jwt";

interface RequestListProps {
  groups: RequestGroup[];
  requests: CapturedRequest[];
  selectedRequest: CapturedRequest | null;
  onSelectRequest: (request: CapturedRequest) => void;
  jwtHeaders: string[];
  viewMode: "grouped" | "flat";
}

type SortOption = "time-desc" | "time-asc" | "method" | "status";
type MethodFilter = "ALL" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

function getStatusDotColor(status: number) {
  if (status >= 200 && status < 300) return "bg-green-500";
  if (status >= 300 && status < 400) return "bg-blue-400";
  if (status >= 400 && status < 500) return "bg-yellow-500";
  if (status >= 500) return "bg-red-500";
  return "bg-gray-400";
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function RequestRow({
  request,
  isSelected,
  onClick,
  hasJWT,
  indent = false,
}: {
  request: CapturedRequest;
  isSelected: boolean;
  onClick: () => void;
  hasJWT: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent/50 text-sm border-b border-border/50",
        isSelected && "bg-accent",
        indent && "pl-6"
      )}
      onClick={onClick}
    >
      <span className="flex items-center gap-1.5 w-12 justify-center text-xs font-mono">
        <span className={cn("w-2 h-2 rounded-full", getStatusDotColor(request.status))} />
        {request.status}
      </span>
      <span className="w-14 text-muted-foreground font-mono text-xs">{request.method}</span>
      <span className="flex-1 truncate font-mono text-xs" title={request.url}>
        {new URL(request.url).pathname}
      </span>
      <div className="flex items-center gap-2 text-muted-foreground">
        {hasJWT && <span title="Contains JWT"><Key className="w-3 h-3 text-yellow-500" /></span>}
        <span className="w-16 text-right text-xs flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(request.duration)}
        </span>
        <span className="w-16 text-right text-xs">{formatSize(request.size)}</span>
      </div>
    </div>
  );
}

function getUniqueMethods(requests: CapturedRequest[]): string[] {
  const methods = new Set(requests.map((r) => r.method));
  return Array.from(methods).sort();
}

// Get the "worst" status color for a group (prioritize errors)
function getGroupStatusDotColor(requests: CapturedRequest[]): string {
  let hasError = false;
  let hasWarning = false;
  let hasRedirect = false;
  
  for (const r of requests) {
    if (r.status >= 500) hasError = true;
    else if (r.status >= 400) hasWarning = true;
    else if (r.status >= 300) hasRedirect = true;
  }
  
  if (hasError) return "bg-red-500";
  if (hasWarning) return "bg-yellow-500";
  if (hasRedirect) return "bg-blue-400";
  return "bg-green-500";
}

function GroupedView({
  groups,
  selectedRequest,
  onSelectRequest,
  jwtHeaders,
}: Omit<RequestListProps, "requests" | "viewMode">) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (pattern: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(pattern)) next.delete(pattern);
      else next.add(pattern);
      return next;
    });
  };

  return (
    <div className="flex flex-col">
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.pattern);
        const hasMultiple = group.count > 1;
        const methods = getUniqueMethods(group.requests);
        const statusColor = getGroupStatusDotColor(group.requests);

        return (
          <div key={group.pattern}>
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent/50 text-sm border-b border-border",
                hasMultiple && "font-medium"
              )}
              onClick={() => hasMultiple ? toggleGroup(group.pattern) : onSelectRequest(group.requests[0])}
            >
              {hasMultiple ? (
                isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              ) : (
                <div className="w-4" />
              )}
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColor)} />
              <span className="flex items-center gap-1.5 text-xs font-mono">
                {group.count}x
              </span>
              <span className="text-xs text-muted-foreground font-mono w-16 shrink-0">
                {methods.join(", ")}
              </span>
              <span className="flex-1 truncate font-mono text-xs" title={group.pattern}>
                {new URL(group.pattern).pathname}
              </span>
              <span className="text-muted-foreground text-xs">
                avg {formatDuration(group.avgDuration)}
              </span>
            </div>
            {isExpanded && group.requests.map((req) => (
              <RequestRow
                key={req.id}
                request={req}
                isSelected={selectedRequest?.id === req.id}
                onClick={() => onSelectRequest(req)}
                hasJWT={!!extractJWTFromHeaders(req.requestHeaders, jwtHeaders)}
                indent
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function FlatView({
  requests,
  selectedRequest,
  onSelectRequest,
  jwtHeaders,
}: {
  requests: CapturedRequest[];
  selectedRequest: CapturedRequest | null;
  onSelectRequest: (request: CapturedRequest) => void;
  jwtHeaders: string[];
}) {
  return (
    <div className="flex flex-col">
      {requests.map((request) => (
        <RequestRow
          key={request.id}
          request={request}
          isSelected={selectedRequest?.id === request.id}
          onClick={() => onSelectRequest(request)}
          hasJWT={!!extractJWTFromHeaders(request.requestHeaders, jwtHeaders)}
        />
      ))}
    </div>
  );
}

export function RequestList({
  groups,
  requests,
  selectedRequest,
  onSelectRequest,
  jwtHeaders,
  viewMode,
}: RequestListProps) {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("time-desc");

  // Filter and sort requests
  const filteredRequests = useMemo(() => {
    let result = [...requests];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((r) => 
        r.url.toLowerCase().includes(searchLower) ||
        r.method.toLowerCase().includes(searchLower)
      );
    }

    // Apply method filter
    if (methodFilter !== "ALL") {
      result = result.filter((r) => r.method === methodFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "time-desc":
          return b.startTime - a.startTime;
        case "time-asc":
          return a.startTime - b.startTime;
        case "method":
          return a.method.localeCompare(b.method);
        case "status":
          return a.status - b.status;
        default:
          return 0;
      }
    });

    return result;
  }, [requests, search, methodFilter, sortBy]);

  // Filter groups based on search and method filter
  const filteredGroups = useMemo(() => {
    if (!search && methodFilter === "ALL") return groups;

    return groups
      .map((group) => {
        let filteredReqs = group.requests;

        if (search) {
          const searchLower = search.toLowerCase();
          filteredReqs = filteredReqs.filter((r) =>
            r.url.toLowerCase().includes(searchLower) ||
            r.method.toLowerCase().includes(searchLower)
          );
        }

        if (methodFilter !== "ALL") {
          filteredReqs = filteredReqs.filter((r) => r.method === methodFilter);
        }

        if (filteredReqs.length === 0) return null;

        return {
          ...group,
          requests: filteredReqs,
          count: filteredReqs.length,
          avgDuration: filteredReqs.reduce((sum, r) => sum + r.duration, 0) / filteredReqs.length,
        };
      })
      .filter(Boolean) as RequestGroup[];
  }, [groups, search, methodFilter]);

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <FileJson className="w-12 h-12" />
        <p>No requests captured yet</p>
        <p className="text-xs">Requests will appear here as they are made</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filter Bar */}
      <div className="px-2 py-2 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search endpoints..."
              className="w-full pl-7 pr-7 py-1 text-xs bg-background border border-border rounded"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
            className="px-2 py-1 text-xs bg-background border border-border rounded"
          >
            <option value="ALL">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-2 py-1 text-xs bg-background border border-border rounded"
          >
            <option value="time-desc">Newest First</option>
            <option value="time-asc">Oldest First</option>
            <option value="method">By Method</option>
            <option value="status">By Status</option>
          </select>
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredRequests.length} / {requests.length}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {viewMode === "grouped" ? (
          <GroupedView
            groups={filteredGroups}
            selectedRequest={selectedRequest}
            onSelectRequest={onSelectRequest}
            jwtHeaders={jwtHeaders}
          />
        ) : (
          <FlatView
            requests={filteredRequests}
            selectedRequest={selectedRequest}
            onSelectRequest={onSelectRequest}
            jwtHeaders={jwtHeaders}
          />
        )}
      </ScrollArea>
    </div>
  );
}
