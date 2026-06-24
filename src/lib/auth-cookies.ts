export const SESSION_COOKIE = "canvify_session";
export const GUEST_SESSION_COOKIE = "canvify_guest";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};

  return Object.fromEntries(
    header.split(";").flatMap((part) => {
      const trimmed = part.trim();
      if (!trimmed) return [];
      const eq = trimmed.indexOf("=");
      if (eq === -1) return [[trimmed, ""]];
      const key = trimmed.slice(0, eq);
      const value = trimmed.slice(eq + 1);
      try {
        return [[key, decodeURIComponent(value)]];
      } catch {
        return [[key, value]];
      }
    }),
  );
}

export function getSessionTokenFromRequest(request: Request) {
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = cookies[SESSION_COOKIE]?.trim();
  return token || null;
}

export function getGuestSessionIdFromRequest(request: Request) {
  const cookies = parseCookies(request.headers.get("cookie"));
  const guestId = cookies[GUEST_SESSION_COOKIE]?.trim();
  return guestId || null;
}

export function isSecureRequest(request: Request) {
  const url = new URL(request.url);
  if (url.protocol === "https:") return true;
  const forwarded = request.headers.get("x-forwarded-proto");
  return forwarded?.split(",")[0]?.trim() === "https";
}

function buildCookie(name: string, value: string, request: Request, maxAge: number) {
  const secure = isSecureRequest(request);
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function buildSessionCookie(token: string, request: Request) {
  return buildCookie(SESSION_COOKIE, token, request, SESSION_MAX_AGE_SEC);
}

export function buildClearSessionCookie(request: Request) {
  return buildCookie(SESSION_COOKIE, "", request, 0);
}

export function buildGuestSessionCookie(sessionId: string, request: Request) {
  return buildCookie(GUEST_SESSION_COOKIE, sessionId, request, SESSION_MAX_AGE_SEC);
}

export function buildClearGuestSessionCookie(request: Request) {
  return buildCookie(GUEST_SESSION_COOKIE, "", request, 0);
}

export function appendSetCookie(headers: Headers, cookie: string) {
  const existing = headers.get("set-cookie");
  if (existing) {
    headers.append("set-cookie", cookie);
  } else {
    headers.set("set-cookie", cookie);
  }
}
