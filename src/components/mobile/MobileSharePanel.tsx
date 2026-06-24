import { Download, Play } from "lucide-react";
import { useState } from "react";
import jsPDF from "jspdf";
import { useEditor, SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/editor-store";
import { AuthMenu } from "@/components/auth/AuthMenu";
import { useSlidePresent } from "@/hooks/use-slide-present";
import { touchTargetClass } from "@/lib/mobile-usability";
import { cn } from "@/lib/utils";

export function MobileSharePanel() {
  const title = useEditor((s) => s.title);
  const slides = useEditor((s) => s.slides);
  const { present, renderSlideOffscreen } = useSlidePresent();
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);

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

  const presentSlides = () => {
    present().catch(() => undefined);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Apresente, entre na sua sessão ou exporte seus slides.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={presentSlides}
          className={cn(
            touchTargetClass,
            "flex gap-2 rounded-xl border bg-card px-3 py-3.5 text-left text-sm font-medium hover:bg-foreground/5",
          )}
        >
          <Play className="h-5 w-5 shrink-0 text-primary" />
          Apresentar
        </button>
        <AuthMenu panel />
      </div>
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
