import { useEffect, useCallback, useRef } from "react";
import type { CapturedRequest } from "@/types/request";

type AddRequestFn = (request: Omit<CapturedRequest, "id" | "urlPattern">) => CapturedRequest;

function parseHeaders(headers: chrome.devtools.network.Request["request"]["headers"]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const header of headers) {
    result[header.name.toLowerCase()] = header.value;
  }
  return result;
}

export function useNetworkCapture(addRequest: AddRequestFn, clearRequests: () => void) {
  const isCapturing = useRef(false);

  const handleRequest = useCallback(
    (har: chrome.devtools.network.Request) => {
      const resourceType = har._resourceType?.toLowerCase() ?? "";
      
      if (resourceType !== "xhr" && resourceType !== "fetch") {
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
        startTime: new Date(har.startedDateTime).getTime(),
        endTime: new Date(har.startedDateTime).getTime() + har.time,
        duration: har.time,
        size: har.response.content.size,
        type: resourceType,
        initiator: typeof har._initiator === "object" ? har._initiator?.type ?? "unknown" : "unknown",
      };

      har.getContent((content) => {
        request.responseBody = content;
        addRequest(request);
      });
    },
    [addRequest]
  );

  const handleNavigate = useCallback(() => {
    clearRequests();
  }, [clearRequests]);

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
