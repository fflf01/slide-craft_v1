import { Download, Play } from "lucide-react";
import { useState } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { useEditor, SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/editor-store";
import { SlideCanvas } from "@/components/editor/SlideCanvas";
import { createRoot } from "react-dom/client";
import { touchTargetClass } from "@/lib/mobile-usability";
import { cn } from "@/lib/utils";

export function MobileSharePanel() {
  const title = useEditor((s) => s.title);
  const slides = useEditor((s) => s.slides);
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);

  const renderSlideOffscreen = async (slideIdx: number): Promise<string> => {
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
  };

  const exportPng = async () => {
    setBusy("png");
    try {
      for (let i = 0; i < slides.length; i++) {
        const dataUrl = await renderSlideOffscreen(i);
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${title || "slide"}-${i + 1}.png`;
        a.click();
      }
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy("pdf");
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [SLIDE_WIDTH, SLIDE_HEIGHT],
      });
      for (let i = 0; i < slides.length; i++) {
        const dataUrl = await renderSlideOffscreen(i);
        if (i > 0) pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], "landscape");
        pdf.addImage(dataUrl, "PNG", 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT);
      }
      pdf.save(`${title || "apresentacao"}.pdf`);
    } finally {
      setBusy(null);
    }
  };

  const present = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.title = title;
    w.document.body.style.margin = "0";
    w.document.body.style.background = "#000";
    const renderAll = async () => {
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
    };
    renderAll();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Exporte ou apresente seus slides. No modo apresentação, deslize para trocar de página.
      </p>
      <button
        type="button"
        onClick={present}
        className={cn(
          touchTargetClass,
          "flex w-full gap-3 rounded-xl border bg-card px-4 py-3.5 text-left text-sm font-medium hover:bg-foreground/5",
        )}
      >
        <Play className="h-5 w-5 shrink-0 text-primary" />
        Apresentar
      </button>
      <button
        type="button"
        onClick={exportPdf}
        disabled={!!busy}
        className={cn(
          touchTargetClass,
          "flex w-full gap-3 rounded-xl brand-gradient px-4 py-3.5 text-left text-sm font-semibold text-white disabled:opacity-60",
        )}
      >
        <Download className="h-5 w-5 shrink-0" />
        {busy === "pdf" ? "Gerando PDF..." : "Baixar PDF"}
      </button>
      <button
        type="button"
        onClick={exportPng}
        disabled={!!busy}
        className={cn(
          touchTargetClass,
          "flex w-full gap-3 rounded-xl border bg-card px-4 py-3.5 text-left text-sm font-medium hover:bg-foreground/5 disabled:opacity-60",
        )}
      >
        <Download className="h-5 w-5 shrink-0" />
        {busy === "png" ? "Gerando PNGs..." : "Baixar PNGs"}
      </button>
    </div>
  );
}
