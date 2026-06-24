import {
  appendSetCookie,
  buildClearGuestSessionCookie,
  buildClearSessionCookie,
  buildGuestSessionCookie,
  buildSessionCookie,
  getGuestSessionIdFromRequest,
  getSessionTokenFromRequest,
} from "./auth-cookies";
import { AuthError, loginUser, registerUser } from "./auth-db";
import {
  createGuestSessionId,
  getActiveSessionByToken,
  revokeSessionToken,
  sessionOwnerKey,
  type ActiveSession,
  type AuthUser,
} from "./auth-session";

export type { AuthUser, ActiveSession };

export type ResolvedSession = ActiveSession & {
  /** Cookies que precisam ser enviados na resposta (ex.: nova sessão convidada). */
  setCookies: string[];
};

export async function resolveActiveSession(request: Request): Promise<ResolvedSession> {
  const setCookies: string[] = [];
  const authToken = getSessionTokenFromRequest(request);

  if (authToken) {
    const authSession = await getActiveSessionByToken(authToken);
    if (authSession) {
      return { ...authSession, setCookies };
    }
  }

  let guestSessionId = getGuestSessionIdFromRequest(request);
  if (!guestSessionId) {
    guestSessionId = createGuestSessionId();
    setCookies.push(buildGuestSessionCookie(guestSessionId, request));
  }

  return {
    sessionId: guestSessionId,
    user: null,
    setCookies,
  };
}

export async function resolveSessionUser(request: Request) {
  const session = await resolveActiveSession(request);
  return session.user;
}

function applySessionCookies(headers: Headers, cookies: string[]) {
  for (const cookie of cookies) {
    appendSetCookie(headers, cookie);
  }
}

type AuthPayload = {
  email?: unknown;
  password?: unknown;
};

export async function handleAuthApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/auth")) return null;

  const json = (data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      ...init,
      headers: {
        "content-type": "application/json; charset=utf-8",
        ...init?.headers,
      },
    });

  try {
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      const session = await resolveActiveSession(request);
      const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
      applySessionCookies(headers, session.setCookies);

      return new Response(
        JSON.stringify({ user: session.user, sessionId: session.sessionId }),
        { headers },
      );
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      const token = getSessionTokenFromRequest(request);
      if (token) await revokeSessionToken(token);

      const newGuestId = createGuestSessionId();
      const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
      appendSetCookie(headers, buildClearSessionCookie(request));
      appendSetCookie(headers, buildGuestSessionCookie(newGuestId, request));

      return new Response(
        JSON.stringify({ ok: true, sessionId: newGuestId }),
        { headers },
      );
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = (await request.json()) as AuthPayload;
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    const authSuccessHeaders = (token: string, sessionId: string) => {
      const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
      appendSetCookie(headers, buildSessionCookie(token, request));
      appendSetCookie(headers, buildClearGuestSessionCookie(request));
      return headers;
    };

    if (url.pathname === "/api/auth/register") {
      const { user, token, sessionId } = await registerUser(email, password);
      return new Response(
        JSON.stringify({ user, sessionId }),
        { status: 201, headers: authSuccessHeaders(token, sessionId) },
      );
    }

    if (url.pathname === "/api/auth/login") {
      const { user, token, sessionId } = await loginUser(email, password);
      return new Response(
        JSON.stringify({ user, sessionId }),
        { headers: authSuccessHeaders(token, sessionId) },
      );
    }

    return json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    if (error instanceof AuthError) {
      return json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return json({ error: "Erro interno de autenticação." }, { status: 500 });
  }
}

export function presentationKeyForSession(sessionId: string) {
  return sessionOwnerKey(sessionId);
}
