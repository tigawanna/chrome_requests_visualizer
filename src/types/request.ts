export type ResourceType = "api" | "document" | "script" | "image";

export const RESOURCE_TYPE_BADGE: Record<ResourceType, string> = {
  api: "Fetch/XHR",
  document: "doc",
  script: "script",
  image: "image",
};

export const RESOURCE_TYPE_DISPLAY: Record<ResourceType, string> = {
  api: "Fetch/XHR",
  document: "document",
  script: "script",
  image: "image",
};

export interface CapturedRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody: string | null;
  responseBody: string | null;
  responseEncoding: string | null;
  mimeType: string;
  startTime: number;
  endTime: number;
  duration: number;
  size: number;
  requestSize: number;
  type: ResourceType;
  urlPattern: string;
  initiator: string;
  pageUrl: string;
}

export interface RequestGroup {
  pattern: string;
  requests: CapturedRequest[];
  count: number;
  avgDuration: number;
}

export interface PageSession {
  id: string;
  pageUrl: string;
  domain: string;
  path: string;
  timestamp: number;
  requests: CapturedRequest[];
}

export interface DomainGroup {
  domain: string;
  pages: PageSession[];
  totalRequests: number;
}
