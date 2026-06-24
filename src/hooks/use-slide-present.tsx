import { useCallback } from "react";
import { toPng } from "html-to-image";
import { createRoot } from "react-dom/client";
import { useEditor, SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/editor-store";
import { SlideCanvas } from "@/components/editor/SlideCanvas";

export function useSlidePresent() {
  const title = useEditor((s) => s.title);
  const slides = useEditor((s) => s.slides);

  const renderSlideOffscreen = useCallback(
    async (slideIdx: number): Promise<string> => {
      const host = document.createElement("div");
      host.style.position = "fixed";
      host.style.left = "-99999px";
      host.style.top = "0";
      host.style.width = SLIDE_WIDTH + "px";
      host.style.height = SLIDE_HEIGHT + "px";
      document.body.appendChild(host);
      const root = createRoot(host);
      await new Promise<void>((res) => {
        root.render(<SlideCanvas slide={slides[slideIdx]} scale={1} interactive={false} />);
        requestAnimationFrame(() => requestAnimationFrame(() => res()));
      });
      await new Promise((r) => setTimeout(r, 250));
      const dataUrl = await toPng(host.firstElementChild as HTMLElement, {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        pixelRatio: 1.5,
        cacheBust: true,
        skipFonts: false,
      });
      root.unmount();
      host.remove();
      return dataUrl;
    },
    [slides],
  );

  const present = useCallback(async () => {
    const w = window.open("", "_blank", "width=1280,height=720");
    if (!w) return;

    w.document.title = title;
    w.document.body.style.margin = "0";
    w.document.body.style.background = "#000";

    const dataUrls: string[] = [];
    for (let i = 0; i < slides.length; i++) {
      dataUrls.push(await renderSlideOffscreen(i));
    }

    let idx = 0;
    const img = w.document.createElement("img");
    img.style.width = "100vw";
    img.style.height = "100vh";
    img.style.objectFit = "contain";
    img.src = dataUrls[0];
    w.document.body.appendChild(img);

    w.document.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowRight" || ev.key === " ") {
        idx = Math.min(dataUrls.length - 1, idx + 1);
        img.src = dataUrls[idx];
      }
      if (ev.key === "ArrowLeft") {
        idx = Math.max(0, idx - 1);
        img.src = dataUrls[idx];
      }
      if (ev.key === "Escape") w.close();
    });

    let touchStartX = 0;
    w.document.addEventListener("touchstart", (ev) => {
      touchStartX = ev.changedTouches[0]?.clientX ?? 0;
    });
    w.document.addEventListener("touchend", (ev) => {
      const dx = (ev.changedTouches[0]?.clientX ?? 0) - touchStartX;
      if (Math.abs(dx) < 40) return;
      if (dx < 0) idx = Math.min(dataUrls.length - 1, idx + 1);
      else idx = Math.max(0, idx - 1);
      img.src = dataUrls[idx];
    });
  }, [renderSlideOffscreen, slides.length, title]);

  return { present, renderSlideOffscreen };
}
