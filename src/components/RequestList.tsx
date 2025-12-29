import { useState } from "react";
import { ChevronDown, ChevronRight, Clock, FileJson, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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

function getStatusColor(status: number) {
  if (status >= 200 && status < 300) return "success";
  if (status >= 300 && status < 400) return "secondary";
  if (status >= 400 && status < 500) return "warning";
  if (status >= 500) return "destructive";
  return "outline";
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
      <Badge variant={getStatusColor(request.status)} className="w-12 justify-center text-xs">
        {request.status}
      </Badge>
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
              <Badge variant={hasMultiple && group.count >= 3 ? "warning" : "outline"} className="text-xs">
                {group.count}x
              </Badge>
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
    <ScrollArea className="h-full">
      {viewMode === "grouped" ? (
        <GroupedView
          groups={groups}
          selectedRequest={selectedRequest}
          onSelectRequest={onSelectRequest}
          jwtHeaders={jwtHeaders}
        />
      ) : (
        <FlatView
          requests={requests}
          selectedRequest={selectedRequest}
          onSelectRequest={onSelectRequest}
          jwtHeaders={jwtHeaders}
        />
      )}
    </ScrollArea>
  );
}
