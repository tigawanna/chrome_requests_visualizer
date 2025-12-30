import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Globe, FileText, Trash2, Copy, Check, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/clipboard";
import { extractJWTFromHeaders } from "@/lib/jwt";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CapturedRequest, DomainGroup, PageSession } from "@/types/request";

interface SessionsViewProps {
  domainGroups: DomainGroup[];
  onSelectRequest: (request: CapturedRequest) => void;
  selectedRequest: CapturedRequest | null;
  onClearDomain: (domain: string) => void;
  onClearPage: (pageUrl: string) => void;
  jwtHeaders: string[];
  tokenPrefixes: string[];
}

function findDomainJwt(domain: DomainGroup, jwtHeaders: string[], tokenPrefixes: string[]) {
  // Find the most recent JWT from any request in this domain
  for (const page of domain.pages) {
    for (let i = page.requests.length - 1; i >= 0; i--) {
      const jwt = extractJWTFromHeaders(page.requests[i].requestHeaders, jwtHeaders, tokenPrefixes);
      if (jwt) return jwt;
    }
  }
  return null;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getStatusDotColor(status: number) {
  if (status >= 200 && status < 300) return "bg-green-500";
  if (status >= 300 && status < 400) return "bg-blue-400";
  if (status >= 400 && status < 500) return "bg-yellow-500";
  if (status >= 500) return "bg-red-500";
  return "bg-gray-400";
}

function buildPageSummaryJson(page: PageSession) {
  return {
    pageUrl: page.pageUrl,
    domain: page.domain,
    path: page.path,
    requestCount: page.requests.length,
    requests: page.requests.slice(0, 10).map((r) => ({
      method: r.method,
      url: new URL(r.url).pathname,
      status: r.status,
      duration: `${r.duration.toFixed(0)}ms`,
    })),
    ...(page.requests.length > 10 && {
      truncated: `... and ${page.requests.length - 10} more requests`,
    }),
  };
}

function buildDomainSummaryJson(domain: DomainGroup) {
  return {
    domain: domain.domain,
    totalRequests: domain.totalRequests,
    pages: domain.pages.map((p) => ({
      path: p.path,
      requestCount: p.requests.length,
      requests: p.requests.slice(0, 5).map((r) => ({
        method: r.method,
        endpoint: new URL(r.url).pathname,
        status: r.status,
      })),
      ...(p.requests.length > 5 && {
        truncated: `... and ${p.requests.length - 5} more`,
      }),
    })),
  };
}

function RequestRow({
  request,
  isSelected,
  onClick,
}: {
  request: CapturedRequest;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-accent/50 text-xs border-b border-border/30",
        isSelected && "bg-accent"
      )}
      onClick={onClick}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotColor(request.status))} />
      <span className="w-10 text-muted-foreground font-mono">{request.method}</span>
      <span className="flex-1 truncate font-mono" title={request.url}>
        {new URL(request.url).pathname}
      </span>
      <span className="text-muted-foreground">{formatDuration(request.duration)}</span>
    </div>
  );
}

function PageSessionView({
  page,
  onSelectRequest,
  selectedRequest,
  onClear,
}: {
  page: PageSession;
  onSelectRequest: (request: CapturedRequest) => void;
  selectedRequest: CapturedRequest | null;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const json = JSON.stringify(buildPageSummaryJson(page), null, 2);
    const success = await copyToClipboard(json);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="border-b border-border/50">
      <div
        className="flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-accent/30 text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <FileText className="w-3 h-3 text-muted-foreground" />
        <span className="flex-1 truncate font-mono" title={page.path}>
          {page.path || "/"}
        </span>
        <span className="text-muted-foreground">{page.requests.length} req</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={handleCopy}
          title="Copy page requests as JSON"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          title="Clear page requests"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      {expanded && (
        <div className="pl-6">
          {page.requests.map((req) => (
            <RequestRow
              key={req.id}
              request={req}
              isSelected={selectedRequest?.id === req.id}
              onClick={() => onSelectRequest(req)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DomainView({
  domain,
  onSelectRequest,
  selectedRequest,
  onClearDomain,
  onClearPage,
  jwtHeaders,
  tokenPrefixes,
}: {
  domain: DomainGroup;
  onSelectRequest: (request: CapturedRequest) => void;
  selectedRequest: CapturedRequest | null;
  onClearDomain: (domain: string) => void;
  onClearPage: (pageUrl: string) => void;
  jwtHeaders: string[];
  tokenPrefixes: string[];
}) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [jwtCopied, setJwtCopied] = useState(false);

  const domainJwt = useMemo(() => findDomainJwt(domain, jwtHeaders, tokenPrefixes), [domain, jwtHeaders, tokenPrefixes]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const json = JSON.stringify(buildDomainSummaryJson(domain), null, 2);
    const success = await copyToClipboard(json);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyJwt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (domainJwt) {
      const success = await copyToClipboard(domainJwt.rawToken);
      if (success) {
        setJwtCopied(true);
        setTimeout(() => setJwtCopied(false), 2000);
      }
    }
  };

  return (
    <div className="border-b border-border">
      <div
        className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-accent/50 text-sm font-medium"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Globe className="w-4 h-4 text-blue-500" />
        <span className="flex-1">{domain.domain}</span>
        <span className="text-xs text-muted-foreground">
          {domain.pages.length} pages · {domain.totalRequests} req
        </span>
        {domainJwt && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleCopyJwt}
            title={`Copy JWT from ${domainJwt.header}`}
          >
            {jwtCopied ? <Check className="w-3 h-3 mr-1" /> : <Key className="w-3 h-3 mr-1" />}
            {jwtCopied ? "Copied!" : "JWT"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopy}
          title="Copy domain requests as JSON"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onClearDomain(domain.domain);
          }}
          title="Clear all domain requests"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      {expanded && (
        <div className="pl-2">
          {domain.pages.map((page) => (
            <PageSessionView
              key={page.id}
              page={page}
              onSelectRequest={onSelectRequest}
              selectedRequest={selectedRequest}
              onClear={() => onClearPage(page.pageUrl)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SessionsView({
  domainGroups,
  onSelectRequest,
  selectedRequest,
  onClearDomain,
  onClearPage,
  jwtHeaders,
  tokenPrefixes,
}: SessionsViewProps) {
  if (domainGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <Globe className="w-12 h-12" />
        <p>No sessions captured yet</p>
        <p className="text-xs">Navigate to pages to start capturing requests</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col pb-8">
        {domainGroups.map((domain) => (
          <DomainView
            key={domain.domain}
            domain={domain}
            onSelectRequest={onSelectRequest}
            selectedRequest={selectedRequest}
            onClearDomain={onClearDomain}
            onClearPage={onClearPage}
            jwtHeaders={jwtHeaders}
            tokenPrefixes={tokenPrefixes}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
