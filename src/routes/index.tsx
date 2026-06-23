import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { currentSlide, SLIDE_HEIGHT, SLIDE_WIDTH, useEditor } from "@/lib/editor-store";
import { SlideCanvas } from "@/components/editor/SlideCanvas";
import { SlidesPanel } from "@/components/editor/SlidesPanel";
import { LeftToolbar } from "@/components/editor/LeftToolbar";
import { PropertiesBar } from "@/components/editor/PropertiesBar";
import { TopBar } from "@/components/editor/TopBar";

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

function Editor() {
  const slide = useEditor(currentSlide);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);

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
