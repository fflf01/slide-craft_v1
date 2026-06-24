import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { handleAuthApi, presentationKeyForSession, resolveActiveSession } from "./lib/auth-api";
import { renderErrorPage } from "./lib/error-page";
import { getPresentation, savePresentation } from "./lib/presentation-db";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type Presentation = {
  title: string;
  currentSlideId: string;
  slides: unknown[];
};

type PresentationPayload = {
  presentation?: unknown;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function isPresentation(value: unknown): value is Presentation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Presentation>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.currentSlideId === "string" &&
    Array.isArray(candidate.slides)
  );
}

async function handlePresentationApi(request: Request) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/presentation") return null;

  const session = await resolveActiveSession(request);
  const ownerKey = presentationKeyForSession(session.sessionId);
  const extraHeaders = new Headers();
  for (const cookie of session.setCookies) {
    extraHeaders.append("set-cookie", cookie);
  }

  if (request.method === "GET") {
    const presentation = await getPresentation(ownerKey);
    return json({ presentation, sessionId: session.sessionId }, { headers: extraHeaders });
  }

  if (request.method === "PUT" || request.method === "POST") {
    const payload = (await request.json()) as PresentationPayload;

    if (!isPresentation(payload.presentation)) {
      return json({ error: "presentation payload is invalid" }, { status: 400, headers: extraHeaders });
    }

    await savePresentation(ownerKey, payload.presentation);
    return json({ ok: true, sessionId: session.sessionId }, { headers: extraHeaders });
  }

  return json({ error: "Method not allowed" }, { status: 405, headers: { allow: "GET, PUT, POST", ...extraHeaders } });
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const authResponse = await handleAuthApi(request);
      if (authResponse) return authResponse;

      const apiResponse = await handlePresentationApi(request);
      if (apiResponse) return apiResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
