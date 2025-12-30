import { useState } from "react";
import { Copy, Check, Play, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { CapturedRequest } from "@/types/request";
import { JWTDecoder } from "./JWTDecoder";
import { ReplayRequest } from "./ReplayRequest";
import { extractJWTFromHeaders } from "@/lib/jwt";

function headersToArray(headers: Record<string, string>): string[] {
  return Object.entries(headers).map(([k, v]) => `${k}: ${v}`);
}

function truncateBody(body: unknown, maxItems = 5, maxLines = 10): unknown {
  if (Array.isArray(body)) {
    if (body.length > maxItems) {
      return [...body.slice(0, maxItems), `... and ${body.length - maxItems} more items`];
    }
    return body;
  }
  if (typeof body === "string") {
    const lines = body.split("\n");
    if (lines.length > maxLines) {
      return lines.slice(0, maxLines).join("\n") + `\n... (${lines.length - maxLines} more lines)`;
    }
    return body;
  }
  return body;
}

function buildRequestJson(request: CapturedRequest) {
  let requestBodyParsed: unknown = request.requestBody;
  let responseBodyParsed: unknown = request.responseBody;

  try {
    if (request.requestBody) requestBodyParsed = JSON.parse(request.requestBody);
  } catch { /* keep as string */ }

  try {
    if (request.responseBody) responseBodyParsed = JSON.parse(request.responseBody);
  } catch { /* keep as string */ }

  return {
    url: request.url,
    method: request.method,
    status: `${request.status} ${request.statusText}`,
    duration: `${request.duration.toFixed(0)}ms`,
    size: `${request.size}B`,
    type: request.type,
    requestHeaders: headersToArray(request.requestHeaders),
    responseHeaders: headersToArray(request.responseHeaders),
    requestBody: truncateBody(requestBodyParsed),
    responseBody: truncateBody(responseBodyParsed),
  };
}

interface RequestDetailProps {
  request: CapturedRequest;
  jwtHeaders: string[];
}

function HeadersTable({ headers }: { headers: Record<string, string> }) {
  return (
    <div className="text-xs font-mono">
      {Object.entries(headers).map(([key, value]) => (
        <div key={key} className="flex border-b border-border/50 py-1">
          <span className="w-48 shrink-0 font-semibold text-muted-foreground">{key}</span>
          <span className="break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ content, language }: { content: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  let formatted = content;
  if (language === "json") {
    try {
      formatted = JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      // Keep original if not valid JSON
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={handleCopy}
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </Button>
      <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-96">
        {formatted}
      </pre>
    </div>
  );
}

export function RequestDetail({ request, jwtHeaders }: RequestDetailProps) {
  const [tab, setTab] = useState("headers");
  const [showReplay, setShowReplay] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const jwtInfo = extractJWTFromHeaders(request.requestHeaders, jwtHeaders);

  const handleCopyAsJson = async () => {
    const json = JSON.stringify(buildRequestJson(request), null, 2);
    const success = await copyToClipboard(json);
    if (success) {
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
    }
  };

  if (showReplay) {
    return <ReplayRequest request={request} onClose={() => setShowReplay(false)} />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{request.method}</Badge>
          <span className="font-mono text-sm truncate flex-1" title={request.url}>
            {request.url}
          </span>
          <Button size="sm" variant="outline" onClick={handleCopyAsJson}>
            {jsonCopied ? <Check className="w-3 h-3 mr-1" /> : <FileJson className="w-3 h-3 mr-1" />}
            {jsonCopied ? "Copied!" : "Copy JSON"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowReplay(true)}>
            <Play className="w-3 h-3 mr-1" /> Replay
          </Button>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Status: <strong className={cn(
            request.status >= 200 && request.status < 300 && "text-green-500",
            request.status >= 400 && "text-red-500"
          )}>{request.status} {request.statusText}</strong></span>
          <span>Duration: <strong>{request.duration.toFixed(0)}ms</strong></span>
          <span>Size: <strong>{request.size}B</strong></span>
          <span>Type: <strong>{request.type}</strong></span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-2">
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="request">Request</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
          {jwtInfo && <TabsTrigger value="jwt">JWT</TabsTrigger>}
        </TabsList>

        <ScrollArea className="flex-1 p-3">
          <TabsContent value="headers" className="mt-0">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Request Headers</h4>
                <HeadersTable headers={request.requestHeaders} />
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Response Headers</h4>
                <HeadersTable headers={request.responseHeaders} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="request" className="mt-0">
            {request.requestBody ? (
              <CodeBlock content={request.requestBody} language="json" />
            ) : (
              <p className="text-muted-foreground text-sm">No request body</p>
            )}
          </TabsContent>

          <TabsContent value="response" className="mt-0">
            {request.responseBody ? (
              <CodeBlock content={request.responseBody} language="json" />
            ) : (
              <p className="text-muted-foreground text-sm">No response body</p>
            )}
          </TabsContent>

          {jwtInfo && (
            <TabsContent value="jwt" className="mt-0">
              <JWTDecoder token={jwtInfo.token} headerName={jwtInfo.header} />
            </TabsContent>
          )}
        </ScrollArea>
      </Tabs>
    </div>
  );
}
