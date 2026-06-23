import { Copy, Plus, Trash2 } from "lucide-react";
import { SLIDE_WIDTH, SLIDE_HEIGHT, useEditor } from "@/lib/editor-store";
import { SlideCanvas } from "@/components/editor/SlideCanvas";
import { touchTargetClass } from "@/lib/mobile-usability";
import { cn } from "@/lib/utils";

const THUMB_W = 120;
const SCALE = THUMB_W / SLIDE_WIDTH;

type Props = {
  variant?: "horizontal" | "vertical";
};

export function MobileSlidesStrip({ variant = "horizontal" }: Props) {
  const slides = useEditor((s) => s.slides);
  const currentId = useEditor((s) => s.currentSlideId);
  const setCurrent = useEditor((s) => s.setCurrentSlide);
  const addSlide = useEditor((s) => s.addSlide);
  const duplicateSlide = useEditor((s) => s.duplicateSlide);
  const removeSlide = useEditor((s) => s.removeSlide);

  if (variant === "vertical") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Páginas</span>
          <span className="text-xs text-muted-foreground">{slides.length}</span>
        </div>
        <ul className="space-y-3">
          {slides.map((s, i) => {
            const active = s.id === currentId;
            return (
              <li key={s.id} className="flex items-center gap-3">
                <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                <button
                  type="button"
                  onClick={() => setCurrent(s.id)}
                  className={cn(
                    "relative shrink-0 overflow-hidden rounded-md transition-all",
                    active ? "ring-2 ring-primary" : "ring-1 ring-border",
                  )}
                  style={{ width: THUMB_W, height: SLIDE_HEIGHT * SCALE }}
                >
                  <SlideCanvas slide={s} scale={SCALE} interactive={false} />
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => duplicateSlide(s.id)}
                    className={cn(touchTargetClass, "h-9 w-9 rounded-md text-muted-foreground hover:bg-foreground/5")}
                    aria-label="Duplicar página"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlide(s.id)}
                      className={cn(touchTargetClass, "h-9 w-9 rounded-md text-destructive hover:bg-destructive/10")}
                      aria-label="Excluir página"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={addSlide}
          className={cn(
            touchTargetClass,
            "flex w-full gap-2 rounded-lg bg-foreground/5 px-4 py-3 text-sm font-medium hover:bg-foreground/10",
          )}
        >
          <Plus className="h-4 w-4" />
          Adicionar página
        </button>
      </div>
    );
  }

  return (
    <div className="border-t bg-panel md:hidden">
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 overscroll-x-contain">
        {slides.map((s, i) => {
          const active = s.id === currentId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrent(s.id)}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-md transition-all touch-manipulation",
                active ? "ring-2 ring-primary" : "ring-1 ring-border opacity-80",
              )}
              style={{ width: THUMB_W, height: SLIDE_HEIGHT * SCALE }}
              aria-label={`Página ${i + 1}`}
              aria-current={active ? "true" : undefined}
            >
              <SlideCanvas slide={s} scale={SCALE} interactive={false} />
              <span className="absolute left-1 top-1 rounded bg-black/50 px-1 text-[10px] font-medium text-white">
                {i + 1}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={addSlide}
          className={cn(
            touchTargetClass,
            "shrink-0 flex-col gap-1 rounded-md border border-dashed px-3 text-xs text-muted-foreground",
          )}
          style={{ width: THUMB_W * 0.55, height: SLIDE_HEIGHT * SCALE }}
          aria-label="Adicionar página"
        >
          <Plus className="h-5 w-5" />
          Nova
        </button>
      </div>
    </div>
  );
}
