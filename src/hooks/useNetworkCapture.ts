import { useEffect, useCallback, useRef } from "react";
import type { CapturedRequest, ResourceType } from "@/types/request";

type AddRequestFn = (request: Omit<CapturedRequest, "id" | "urlPattern">) => CapturedRequest;
type OnNavigateFn = (newUrl: string) => void;

function parseHeaders(headers: chrome.devtools.network.Request["request"]["headers"]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const header of headers) {
    result[header.name.toLowerCase()] = header.value;
  }
  return result;
}

function getCurrentPageUrl(): Promise<string> {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.devtools?.inspectedWindow) {
      chrome.devtools.inspectedWindow.eval(
        "window.location.href",
        (result, error) => {
          if (error || typeof result !== "string") {
            resolve("unknown");
          } else {
            resolve(result);
          }
        }
      );
    } else {
      resolve("unknown");
    }
  });
}

export function useNetworkCapture(addRequest: AddRequestFn, onNavigate: OnNavigateFn) {
  const isCapturing = useRef(false);
  const currentPageUrl = useRef<string>("unknown");

  // Get initial page URL
  useEffect(() => {
    getCurrentPageUrl().then((url) => {
      currentPageUrl.current = url;
      onNavigate(url);
    });
  }, [onNavigate]);

  const handleRequest = useCallback(
    (har: chrome.devtools.network.Request) => {
      const resourceType = har._resourceType?.toLowerCase() ?? "";
      
      const allowedTypes: ResourceType[] = ["xhr", "fetch", "document", "script", "image"];
      if (!allowedTypes.includes(resourceType as ResourceType)) {
        return;
      }

      const request: Omit<CapturedRequest, "id" | "urlPattern"> = {
        url: har.request.url,
        method: har.request.method,
        status: har.response.status,
        statusText: har.response.statusText,
        requestHeaders: parseHeaders(har.request.headers),
        responseHeaders: parseHeaders(har.response.headers),
        requestBody: har.request.postData?.text ?? null,
        responseBody: null,
        responseEncoding: null,
        mimeType: har.response.content.mimeType ?? "",
        startTime: new Date(har.startedDateTime).getTime(),
        endTime: new Date(har.startedDateTime).getTime() + har.time,
        duration: har.time,
        size: har.response.content.size,
        requestSize: har.request.bodySize > 0
          ? har.request.bodySize
          : har.request.postData?.text?.length ?? 0,
        type: resourceType as ResourceType,
        initiator: typeof har._initiator === "object" ? har._initiator?.type ?? "unknown" : "unknown",
        pageUrl: currentPageUrl.current,
      };

      har.getContent((content, encoding) => {
        request.responseBody = content;
        request.responseEncoding = encoding || null;
        addRequest(request);
      });
    },
    [addRequest]
  );

  const handleNavigate = useCallback((newUrl: string) => {
    currentPageUrl.current = newUrl;
    onNavigate(newUrl);
  }, [onNavigate]);

  useEffect(() => {
    if (isCapturing.current) return;
    isCapturing.current = true;

    if (typeof chrome !== "undefined" && chrome.devtools?.network) {
      chrome.devtools.network.onRequestFinished.addListener(handleRequest);
      chrome.devtools.network.onNavigated.addListener(handleNavigate);

      return () => {
        chrome.devtools.network.onRequestFinished.removeListener(handleRequest);
        chrome.devtools.network.onNavigated.removeListener(handleNavigate);
        isCapturing.current = false;
      };
    }
  }, [handleRequest, handleNavigate]);
}
