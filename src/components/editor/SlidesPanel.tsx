import { Copy, Plus, Trash2 } from "lucide-react";
import { SLIDE_WIDTH, SLIDE_HEIGHT, useEditor } from "@/lib/editor-store";
import { SlideCanvas } from "./SlideCanvas";

const THUMB_W = 180;
const SCALE = THUMB_W / SLIDE_WIDTH;

export function SlidesPanel() {
  const slides = useEditor((s) => s.slides);
  const currentId = useEditor((s) => s.currentSlideId);
  const setCurrent = useEditor((s) => s.setCurrentSlide);
  const addSlide = useEditor((s) => s.addSlide);
  const duplicateSlide = useEditor((s) => s.duplicateSlide);
  const removeSlide = useEditor((s) => s.removeSlide);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-panel">
      <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <span>Páginas</span>
        <span className="text-foreground/70">{slides.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <ul className="space-y-3">
          {slides.map((s, i) => {
            const active = s.id === currentId;
            return (
              <li key={s.id} className="group">
                <div className="flex items-start gap-2">
                  <span className="w-4 pt-2 text-xs text-muted-foreground">{i + 1}</span>
                  <button
                    onClick={() => setCurrent(s.id)}
                    className={`relative block flex-1 overflow-hidden rounded-md transition-all ${
                      active
                        ? "ring-2 ring-primary"
                        : "ring-1 ring-border hover:ring-foreground/30"
                    }`}
                    style={{ width: THUMB_W, height: SLIDE_HEIGHT * SCALE }}
                  >
                    <SlideCanvas slide={s} scale={SCALE} interactive={false} />
                  </button>
                </div>
                <div className="ml-6 mt-1 flex h-6 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => duplicateSlide(s.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    title="Duplicar"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {slides.length > 1 && (
                    <button
                      onClick={() => removeSlide(s.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="border-t p-3">
        <button
          onClick={addSlide}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground/5 px-3 py-2 text-sm font-medium hover:bg-foreground/10"
        >
          <Plus className="h-4 w-4" />
          Adicionar página
        </button>
      </div>
    </aside>
  );
}
