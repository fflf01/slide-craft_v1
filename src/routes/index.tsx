import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  currentSlide,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  toPresentationSnapshot,
  useEditor,
  type PresentationSnapshot,
} from "@/lib/editor-store";
import { SlideCanvas } from "@/components/editor/SlideCanvas";
import { SlidesPanel } from "@/components/editor/SlidesPanel";
import { LeftToolbar } from "@/components/editor/LeftToolbar";
import { PropertiesBar } from "@/components/editor/PropertiesBar";
import { TopBar } from "@/components/editor/TopBar";

const CLIENT_ID_KEY = "canvify:client-id";
const PRESENTATION_CACHE_KEY = "canvify:presentation:v1";
const SAVE_DEBOUNCE_MS = 600;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Canvify — Editor de slides estilo Canva" },
      { name: "description", content: "Editor de slides drag-and-drop com texto, formas, imagens, templates e exportação PDF/PNG." },
      { property: "og:title", content: "Canvify — Editor de slides" },
      { property: "og:description", content: "Crie apresentações lindas direto no navegador." },
    ],
  }),
  component: Editor,
});

function getClientId() {
  try {
    const saved = window.localStorage.getItem(CLIENT_ID_KEY);
    if (saved) return saved;

    const next = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(CLIENT_ID_KEY, next);
    return next;
  } catch {
    return "anonymous";
  }
}

function isPresentationSnapshot(value: unknown): value is PresentationSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<PresentationSnapshot>;
  return (
    typeof snapshot.title === "string" &&
    typeof snapshot.currentSlideId === "string" &&
    Array.isArray(snapshot.slides)
  );
}

function readBrowserCache() {
  try {
    const raw = window.localStorage.getItem(PRESENTATION_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return isPresentationSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeBrowserCache(snapshot: PresentationSnapshot) {
  try {
    window.localStorage.setItem(PRESENTATION_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota/private-mode failures. The SQLite API remains the source of truth.
  }
}

async function fetchSavedPresentation(clientId: string) {
  const response = await fetch(`/api/presentation?clientId=${encodeURIComponent(clientId)}`);
  if (!response.ok) return null;

  const body = await response.json();
  return isPresentationSnapshot(body.presentation) ? body.presentation : null;
}

async function persistPresentation(clientId: string, presentation: PresentationSnapshot) {
  await fetch("/api/presentation", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId, presentation }),
  });
}

function Editor() {
  const slide = useEditor(currentSlide);
  const hydratePresentation = useEditor((state) => state.hydratePresentation);
  const containerRef = useRef<HTMLDivElement>(null);
  const clientIdRef = useRef<string | null>(null);
  const readyToSaveRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const [scale, setScale] = useState(0.6);

  useEffect(() => {
    let cancelled = false;
    const clientId = getClientId();
    clientIdRef.current = clientId;

    const cached = readBrowserCache();
    if (cached) hydratePresentation(cached);

    fetchSavedPresentation(clientId)
      .then((saved) => {
        if (!cancelled && saved) hydratePresentation(saved);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) readyToSaveRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [hydratePresentation]);

  useEffect(() => {
    const unsubscribe = useEditor.subscribe((state) => {
      if (!readyToSaveRef.current || !clientIdRef.current) return;

      const snapshot = toPresentationSnapshot(state);
      writeBrowserCache(snapshot);

      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        if (!clientIdRef.current) return;
        persistPresentation(clientIdRef.current, snapshot).catch(() => undefined);
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    const compute = () => {
      const el = containerRef.current;
      if (!el) return;
      const padding = 64;
      const w = el.clientWidth - padding;
      const h = el.clientHeight - padding;
      const s = Math.min(w / SLIDE_WIDTH, h / SLIDE_HEIGHT, 1);
      setScale(Math.max(0.1, s));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Prevent browser scroll on space when presenting via keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === " " && (e.target as HTMLElement)?.tagName === "BODY") e.preventDefault();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftToolbar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <PropertiesBar />
          <div
            ref={containerRef}
            className="dotted-bg flex flex-1 items-center justify-center overflow-auto bg-canvas-bg"
          >
            <SlideCanvas slide={slide} scale={scale} canvasId="main-canvas" />
          </div>
          <div className="flex h-8 items-center justify-end gap-2 border-t bg-background px-4 text-xs text-muted-foreground">
            <span>{Math.round(scale * 100)}%</span>
            <span>·</span>
            <span>{SLIDE_WIDTH} × {SLIDE_HEIGHT}</span>
          </div>
        </div>
        <SlidesPanel />
      </div>
    </div>
  );
}
