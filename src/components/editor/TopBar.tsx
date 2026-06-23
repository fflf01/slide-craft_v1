import { Download, Play, Sparkles } from "lucide-react";
import { useState } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { useEditor, SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/editor-store";
import { SlideCanvas } from "./SlideCanvas";
import { createRoot } from "react-dom/client";

export function TopBar() {
  const title = useEditor((s) => s.title);
  const setTitle = useEditor((s) => s.setTitle);
  const slides = useEditor((s) => s.slides);
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);
  const [menu, setMenu] = useState(false);

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
    // Allow images to settle
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
    setMenu(false);
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
    setMenu(false);
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
    const w = window.open("", "_blank", "width=1280,height=720");
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
    };
    renderAll();
  };

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg brand-gradient text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="brand-gradient-text text-lg font-bold tracking-tight">Canvify</span>
      </div>

      <div className="mx-4 h-6 w-px bg-border" />

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="min-w-0 flex-1 max-w-md rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none transition-colors hover:border-border focus:border-ring focus:bg-background"
      />

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={present}
          className="flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground/80 hover:bg-foreground/5"
        >
          <Play className="h-4 w-4" />
          Apresentar
        </button>

        <div className="relative">
          <button
            onClick={() => setMenu((v) => !v)}
            disabled={!!busy}
            className="flex h-9 items-center gap-1.5 rounded-md brand-gradient px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {busy === "png" ? "Gerando PNG..." : busy === "pdf" ? "Gerando PDF..." : "Compartilhar"}
          </button>
          {menu && (
            <div className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-lg border bg-popover shadow-lg">
              <button
                onClick={exportPdf}
                className="block w-full px-4 py-2.5 text-left text-sm hover:bg-accent/5"
              >
                Baixar PDF
              </button>
              <button
                onClick={exportPng}
                className="block w-full px-4 py-2.5 text-left text-sm hover:bg-accent/5"
              >
                Baixar PNGs
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
