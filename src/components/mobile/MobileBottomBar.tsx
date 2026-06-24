import {
  Download,
  Layers,
  LayoutGrid,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOBILE_BOTTOM_BAR_HEIGHT_PX,
  safeAreaBottomClass,
  touchTargetClass,
  type MobilePanel,
} from "@/lib/mobile-usability";

const ITEMS = [
  { id: "tools" as const, label: "Ferramentas", icon: LayoutGrid },
  { id: "slides" as const, label: "Páginas", icon: Layers },
  { id: "properties" as const, label: "Propriedades", icon: Settings2 },
  { id: "share" as const, label: "Exportar", icon: Download },
];

type Props = {
  activePanel: MobilePanel;
  onPanelChange: (panel: MobilePanel) => void;
  hasSelection: boolean;
};

export function MobileBottomBar({ activePanel, onPanelChange, hasSelection }: Props) {
  return (
    <nav
      className={cn(
        "shrink-0 border-t bg-background/95 backdrop-blur-md md:hidden",
        safeAreaBottomClass,
      )}
      style={{ minHeight: MOBILE_BOTTOM_BAR_HEIGHT_PX }}
      aria-label="Navegação do editor"
    >
      <div className="flex items-stretch justify-around px-1 pt-1">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const disabled = id === "properties" && !hasSelection;
          const active = activePanel === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              onClick={() => onPanelChange(active ? null : id)}
              className={cn(
                touchTargetClass,
                "flex-1 flex-col gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors",
                disabled && "pointer-events-none opacity-40",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:bg-foreground/5",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
