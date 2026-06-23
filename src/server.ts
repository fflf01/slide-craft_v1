import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { getPresentation, savePresentation } from "./lib/presentation-db";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type PresentationPayload = {
  clientId?: unknown;
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
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });
}

function isPresentation(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { title?: unknown; currentSlideId?: unknown; slides?: unknown };
  return (
    typeof candidate.title === "string" &&
    typeof candidate.currentSlideId === "string" &&
    Array.isArray(candidate.slides)
  );
}

async function handlePresentationApi(request: Request) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/presentation") return null;

  if (request.method === "GET") {
    const clientId = url.searchParams.get("clientId")?.trim();
    if (!clientId) return json({ error: "clientId is required" }, { status: 400 });

    const presentation = await getPresentation(clientId);
    return json({ presentation });
  }

  if (request.method === "PUT" || request.method === "POST") {
    const payload = (await request.json()) as PresentationPayload;
    const clientId = typeof payload.clientId === "string" ? payload.clientId.trim() : "";

    if (!clientId) return json({ error: "clientId is required" }, { status: 400 });
    if (!isPresentation(payload.presentation)) {
      return json({ error: "presentation payload is invalid" }, { status: 400 });
    }

    await savePresentation(clientId, payload.presentation);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, { status: 405, headers: { allow: "GET, PUT, POST" } });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
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
