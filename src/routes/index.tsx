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
import { useAuth } from "@/hooks/use-auth";
import { SlideCanvas } from "@/components/editor/SlideCanvas";
import { EditorShell } from "@/components/mobile/EditorShell";

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

function cacheKeyForSession(sessionId: string) {
  return `canvify:presentation:session:${sessionId}`;
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

function readBrowserCache(sessionId: string) {
  if (!sessionId) return null;
  try {
    const raw = window.localStorage.getItem(cacheKeyForSession(sessionId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return isPresentationSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeBrowserCache(sessionId: string, snapshot: PresentationSnapshot) {
  if (!sessionId) return;
  try {
    window.localStorage.setItem(cacheKeyForSession(sessionId), JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota/private-mode failures.
  }
}

async function fetchSavedPresentation() {
  const response = await fetch("/api/presentation", { credentials: "include" });
  if (!response.ok) return null;

  const body = await response.json();
  return isPresentationSnapshot(body.presentation) ? body.presentation : null;
}

async function persistPresentation(presentation: PresentationSnapshot) {
  await fetch("/api/presentation", {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ presentation }),
  });
}

function Editor() {
  const slide = useEditor(currentSlide);
  const hydratePresentation = useEditor((state) => state.hydratePresentation);
  const { user, sessionId, isLoading: authLoading } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const readyToSaveRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const [scale, setScale] = useState(0.6);

  useEffect(() => {
    if (authLoading || !sessionId) return;

    let cancelled = false;
    readyToSaveRef.current = false;
    sessionIdRef.current = sessionId;

    const cached = readBrowserCache(sessionId);
    if (cached) hydratePresentation(cached);

    fetchSavedPresentation()
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
  }, [authLoading, sessionId, hydratePresentation]);

  useEffect(() => {
    const unsubscribe = useEditor.subscribe((state) => {
      if (!readyToSaveRef.current || authLoading || !sessionIdRef.current) return;

      const snapshot = toPresentationSnapshot(state);
      writeBrowserCache(sessionIdRef.current, snapshot);

      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        persistPresentation(snapshot).catch(() => undefined);
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [authLoading, sessionId]);

  useLayoutEffect(() => {
    const compute = () => {
      const el = containerRef.current;
      if (!el) return;
      const isMobile = window.innerWidth < 768;
      const padding = isMobile ? 24 : 64;
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

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === " " && (e.target as HTMLElement)?.tagName === "BODY") e.preventDefault();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const ownerLabel = user ? user.email : "Convidado";

  return (
    <EditorShell
      containerRef={containerRef}
      canvas={<SlideCanvas slide={slide} scale={scale} canvasId="main-canvas" />}
      scaleLabel={
        <>
          <span>{Math.round(scale * 100)}%</span>
          <span>·</span>
          <span>{SLIDE_WIDTH} × {SLIDE_HEIGHT}</span>
          <span>·</span>
          <span className="max-w-[120px] truncate">{ownerLabel}</span>
        </>
      }
    />
  );
}
