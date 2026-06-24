import { Download, Play, Sparkles } from "lucide-react";
import { useState } from "react";
import jsPDF from "jspdf";
import { useEditor, SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/editor-store";
import { AuthMenu } from "@/components/auth/AuthMenu";
import { useSlidePresent } from "@/hooks/use-slide-present";

export function TopBar({ compact = false }: { compact?: boolean }) {
  const title = useEditor((s) => s.title);
  const setTitle = useEditor((s) => s.setTitle);
  const slides = useEditor((s) => s.slides);
  const { present, renderSlideOffscreen } = useSlidePresent();
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);
  const [menu, setMenu] = useState(false);

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

  if (compact) {
    return (
      <header className="flex h-12 items-center gap-2 border-b bg-background px-3 md:hidden">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md brand-gradient text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium outline-none focus:border-ring focus:bg-background"
          aria-label="Título da apresentação"
        />
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => present()}
            className="flex h-9 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-foreground/80 hover:bg-foreground/5"
            title="Apresentar"
          >
            <Play className="h-4 w-4" />
            <span className="hidden xs:inline sm:inline">Apresentar</span>
          </button>
          <AuthMenu compact />
        </div>
      </header>
    );
  }

  return (
    <header className="hidden h-14 items-center gap-3 border-b bg-background px-4 md:flex">
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
          type="button"
          onClick={() => present()}
          className="flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground/80 hover:bg-foreground/5"
        >
          <Play className="h-4 w-4" />
          Apresentar
        </button>

        <AuthMenu toolbar />

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
