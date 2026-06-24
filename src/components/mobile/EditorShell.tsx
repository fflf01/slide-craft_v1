import { useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useEditor } from "@/lib/editor-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { LeftToolbar } from "@/components/editor/LeftToolbar";
import { CanvasTools } from "@/components/editor/CanvasTools";
import { PropertiesBar } from "@/components/editor/PropertiesBar";
import { TopBar } from "@/components/editor/TopBar";
import { MobileBottomBar } from "@/components/mobile/MobileBottomBar";
import { MobilePanelDrawer } from "@/components/mobile/MobilePanelDrawer";
import { MobileSlidesStrip } from "@/components/mobile/MobileSlidesStrip";
import { MobileSharePanel } from "@/components/mobile/MobileSharePanel";
import { SlidesPanel } from "@/components/editor/SlidesPanel";
import { ImageEditorDialog } from "@/components/editor/ImageEditorDialog";
import {
  safeAreaTopClass,
  type MobilePanel,
} from "@/lib/mobile-usability";

type Props = {
  canvas: ReactNode;
  containerRef: RefObject<HTMLDivElement | null>;
  scaleLabel: ReactNode;
};

export function EditorShell({ canvas, containerRef, scaleLabel }: Props) {
  const isMobile = useIsMobile();
  const selectedId = useEditor((s) => s.selectedId);
  const [activePanel, setActivePanel] = useState<MobilePanel>(null);

  const closePanel = () => setActivePanel(null);

  if (!isMobile) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <TopBar />
        <ImageEditorDialog />
        <div className="flex flex-1 overflow-hidden">
          <LeftToolbar />
          <CanvasTools />
          <div className="flex flex-1 flex-col overflow-hidden">
            <PropertiesBar />
            <div
              ref={containerRef}
              className="dotted-bg flex flex-1 items-center justify-center overflow-auto bg-canvas-bg"
            >
              {canvas}
            </div>
            <div className="flex h-8 items-center justify-end gap-2 border-t bg-background px-4 text-xs text-muted-foreground">
              {scaleLabel}
            </div>
          </div>
          <SlidesPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <ImageEditorDialog />
      <div className={safeAreaTopClass}>
        <TopBar compact />
        <CanvasTools layout="horizontal" className="md:hidden" />
      </div>

      <div
        ref={containerRef}
        className="dotted-bg flex min-h-0 flex-1 items-center justify-center overflow-auto bg-canvas-bg touch-pan-x touch-pan-y"
      >
        {canvas}
      </div>

      <MobileSlidesStrip variant="horizontal" />

      <div className="flex h-7 shrink-0 items-center justify-center gap-2 border-t bg-background text-[11px] text-muted-foreground md:hidden">
        {scaleLabel}
      </div>

      <MobileBottomBar
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        hasSelection={!!selectedId}
      />

      <MobilePanelDrawer
        open={activePanel === "tools"}
        onOpenChange={(open) => !open && closePanel()}
        title="Ferramentas"
        maxHeight="85vh"
      >
        <LeftToolbar contentOnly />
      </MobilePanelDrawer>

      <MobilePanelDrawer
        open={activePanel === "slides"}
        onOpenChange={(open) => !open && closePanel()}
        title="Páginas"
        maxHeight="80vh"
      >
        <MobileSlidesStrip variant="vertical" />
      </MobilePanelDrawer>

      <MobilePanelDrawer
        open={activePanel === "properties"}
        onOpenChange={(open) => !open && closePanel()}
        title="Propriedades"
        maxHeight="70vh"
      >
        <PropertiesBar variant="sheet" />
      </MobilePanelDrawer>

      <MobilePanelDrawer
        open={activePanel === "share"}
        onOpenChange={(open) => !open && closePanel()}
        title="Exportar"
        maxHeight="55vh"
      >
        <MobileSharePanel />
      </MobilePanelDrawer>
    </div>
  );
}
