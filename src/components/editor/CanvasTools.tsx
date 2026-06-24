import { MousePointer2, Wand2 } from "lucide-react";

import { useEditor, type CanvasTool } from "@/lib/editor-store";
import { cn } from "@/lib/utils";

const TOOLS: { id: CanvasTool; label: string; icon: typeof MousePointer2; hint: string }[] = [
  {
    id: "select",
    label: "Selecionar",
    icon: MousePointer2,
    hint: "Mover e redimensionar elementos",
  },
  {
    id: "magic-wand",
    label: "Varinha mágica",
    icon: Wand2,
    hint: "Clique em uma imagem para remover a cor selecionada",
  },
];

type Props = {
  layout?: "vertical" | "horizontal";
  className?: string;
};

export function CanvasTools({ layout = "vertical", className }: Props) {
  const activeTool = useEditor((s) => s.activeTool);
  const setActiveTool = useEditor((s) => s.setActiveTool);

  return (
    <div
      className={cn(
        layout === "vertical"
          ? "flex w-14 shrink-0 flex-col items-center gap-1 border-r bg-background py-3"
          : "flex items-center gap-1 border-b bg-background px-2 py-1.5",
        className,
      )}
      role="toolbar"
      aria-label="Ferramentas do canvas"
    >
      {TOOLS.map(({ id, label, icon: Icon, hint }) => {
        const active = activeTool === id;
        return (
          <button
            key={id}
            type="button"
            title={`${label} — ${hint}`}
            aria-label={label}
            aria-pressed={active}
            onClick={() => setActiveTool(id)}
            className={cn(
              "flex items-center justify-center rounded-lg transition-colors touch-manipulation",
              layout === "vertical" ? "h-10 w-10" : "h-9 gap-2 px-3 text-xs font-medium",
              active
                ? "bg-[color:var(--brand)]/15 text-[color:var(--brand)] ring-1 ring-[color:var(--brand)]/40"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {layout === "horizontal" && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
