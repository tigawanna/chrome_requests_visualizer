import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { CapturedRequest } from "@/types/request";
import { JWTDecoder } from "./JWTDecoder";
import { extractJWTFromHeaders } from "@/lib/jwt";

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

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
  const jwtInfo = extractJWTFromHeaders(request.requestHeaders, jwtHeaders);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{request.method}</Badge>
          <span className="font-mono text-sm truncate flex-1" title={request.url}>
            {request.url}
          </span>
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
