export interface JWTPayload {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  raw: string;
  isValid: boolean;
  error?: string;
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  try {
    return decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return atob(padded);
  }
}

export function decodeJWT(token: string): JWTPayload | null {
  if (!token) return null;

  const cleanToken = token.replace(/^Bearer\s+/i, "").trim();
  const parts = cleanToken.split(".");

  if (parts.length !== 3) {
    return {
      header: {},
      payload: {},
      signature: "",
      raw: cleanToken,
      isValid: false,
      error: "Invalid JWT format: expected 3 parts",
    };
  }

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const signature = parts[2];

    return {
      header,
      payload,
      signature,
      raw: cleanToken,
      isValid: true,
    };
  } catch (e) {
    return {
      header: {},
      payload: {},
      signature: "",
      raw: cleanToken,
      isValid: false,
      error: e instanceof Error ? e.message : "Failed to decode JWT",
    };
  }
}

export function extractJWTFromHeaders(
  headers: Record<string, string>,
  jwtHeaderNames: string[]
): { header: string; token: string } | null {
  for (const headerName of jwtHeaderNames) {
    const value = headers[headerName.toLowerCase()];
    if (value) {
      const token = value.replace(/^Bearer\s+/i, "").trim();
      if (token.split(".").length === 3) {
        return { header: headerName, token: value };
      }
    }
  }
  return null;
}

export function formatJWTTimestamp(timestamp: number): string {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

export function isJWTExpired(payload: Record<string, unknown>): boolean {
  const exp = payload.exp as number | undefined;
  if (!exp) return false;
  return Date.now() > exp * 1000;
}
