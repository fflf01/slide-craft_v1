import { useCallback, useEffect, useRef, useState } from "react";
import {
  Eraser,
  FlipHorizontal2,
  Layers,
  MousePointer2,
  RotateCcw,
  Save,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  applyMaskDelete,
  combineMasks,
  drawSelectionOverlay,
  floodFillSelectionMask,
  imageDataToDataUrl,
  invertMask,
  loadImageRaster,
  maskHasSelection,
  pointerToImagePixel,
} from "@/lib/magic-wand";
import {
  createImageVersion,
  ensureImageVersions,
  getActiveImageVersion,
  nextVersionLabel,
  type ImageVersion,
} from "@/lib/image-versions";
import { currentSlide, useEditor, type ImageElement } from "@/lib/editor-store";
import { cn } from "@/lib/utils";

export function ImageEditorDialog() {
  const imageEditor = useEditor((s) => s.imageEditor);
  const slide = useEditor(currentSlide);
  const wandTolerance = useEditor((s) => s.wandTolerance);
  const setWandTolerance = useEditor((s) => s.setWandTolerance);
  const closeImageEditor = useEditor((s) => s.closeImageEditor);
  const commitImageVersions = useEditor((s) => s.commitImageVersions);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string>("");
  const [selectionMask, setSelectionMask] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(false);
  const [editorTool, setEditorTool] = useState<"select" | "wand">("wand");

  const element = slide.elements.find(
    (e): e is ImageElement => e.id === imageEditor?.elementId && e.type === "image",
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const imageData = imageDataRef.current;
    if (!canvas || !imageData) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
    if (selectionMask) {
      drawSelectionOverlay(ctx, selectionMask, imageData.width, imageData.height);
    }
  }, [selectionMask]);

  const loadVersionSrc = useCallback(async (src: string, keepSelection = false) => {
    setLoading(true);
    try {
      const { imageData } = await loadImageRaster(src);
      imageDataRef.current = imageData;
      if (!keepSelection) setSelectionMask(null);
      redraw();
    } catch {
      toast.error("Não foi possível carregar esta versão da imagem.");
    } finally {
      setLoading(false);
    }
  }, [redraw]);

  useEffect(() => {
    if (!element || !imageEditor) return;

    const normalized = ensureImageVersions(element);
    const active = getActiveImageVersion(normalized);
    const seed = imageEditor.wandSeed;

    setVersions(normalized.versions ?? []);
    setActiveVersionId(active.id);
    setSelectionMask(null);
    setEditorTool("wand");

    void loadVersionSrc(active.src).then(() => {
      if (!seed || !imageDataRef.current) return;
      const imageData = imageDataRef.current;
      const px = Math.floor((seed.x / element.width) * imageData.width);
      const py = Math.floor((seed.y / element.height) * imageData.height);
      const mask = floodFillSelectionMask(imageData, px, py, useEditor.getState().wandTolerance);
      setSelectionMask(mask);
    });
  }, [element, imageEditor, loadVersionSrc]);

  const deleteSelection = useCallback(() => {
    const imageData = imageDataRef.current;
    if (!imageData || !maskHasSelection(selectionMask)) return;

    applyMaskDelete(imageData, selectionMask!);
    setSelectionMask(null);
    redraw();
    toast.message("Seleção removida", { description: "Salve uma versão para manter esta edição." });
  }, [selectionMask, redraw]);

  useEffect(() => {
    if (!imageEditor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imageEditor, deleteSelection]);

  useEffect(() => {
    redraw();
  }, [redraw, selectionMask]);

  const runWandAt = (clientX: number, clientY: number, shiftKey: boolean) => {
    const canvas = canvasRef.current;
    const imageData = imageDataRef.current;
    if (!canvas || !imageData) return;

    const rect = canvas.getBoundingClientRect();
    const { x, y } = pointerToImagePixel(clientX, clientY, rect, imageData.width, imageData.height);
    const next = floodFillSelectionMask(imageData, x, y, wandTolerance);
    setSelectionMask((prev) => combineMasks(prev, next, shiftKey ? "add" : "replace"));
  };

  const saveVersion = () => {
    const imageData = imageDataRef.current;
    if (!imageData) return;

    const src = imageDataToDataUrl(imageData);
    const version = createImageVersion(src, nextVersionLabel(versions));
    const nextVersions = [...versions, version];
    setVersions(nextVersions);
    setActiveVersionId(version.id);
    toast.success(`Versão "${version.label}" salva.`);
  };

  const switchVersion = (version: ImageVersion) => {
    setActiveVersionId(version.id);
    loadVersionSrc(version.src);
  };

  const finish = () => {
    if (!element || !imageDataRef.current) {
      closeImageEditor();
      return;
    }

    const src = imageDataToDataUrl(imageDataRef.current);
    let nextVersions = versions;
    if (activeVersionId) {
      nextVersions = versions.map((v) => (v.id === activeVersionId ? { ...v, src } : v));
    }

    commitImageVersions(element.id, {
      src,
      versions: nextVersions,
      activeVersionId,
    });
  };

  if (!imageEditor || !element) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && closeImageEditor()}>
      <DialogContent className="flex h-[min(92vh,820px)] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Editor de imagem</DialogTitle>
          <DialogDescription>
            Varinha mágica seleciona áreas por cor. Exclua a seleção e salve versões como no Photoshop.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-52 shrink-0 flex-col border-r bg-muted/20">
            <div className="flex items-center gap-2 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              Versões
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {versions.map((version) => (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => switchVersion(version)}
                  className={cn(
                    "mb-1 flex w-full flex-col rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    version.id === activeVersionId
                      ? "border-[color:var(--brand)] bg-[color:var(--brand)]/10"
                      : "bg-card hover:bg-foreground/5",
                  )}
                >
                  <span className="font-medium">{version.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(version.createdAt).toLocaleString("pt-BR")}
                  </span>
                </button>
              ))}
            </div>
            <div className="border-t p-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (!imageDataRef.current) return;
                  const src = imageDataToDataUrl(imageDataRef.current);
                  const version = createImageVersion(src, nextVersionLabel(versions));
                  setVersions((v) => [...v, version]);
                  setActiveVersionId(version.id);
                }}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Duplicar versão
              </Button>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
              <ToolChip
                active={editorTool === "wand"}
                icon={Wand2}
                label="Varinha"
                onClick={() => setEditorTool("wand")}
              />
              <ToolChip
                active={editorTool === "select"}
                icon={MousePointer2}
                label="Mover"
                onClick={() => setEditorTool("select")}
              />
              <label className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
                Tolerância
                <input
                  type="range"
                  min={5}
                  max={120}
                  value={wandTolerance}
                  onChange={(e) => setWandTolerance(Number(e.target.value))}
                  className="h-1 w-24 accent-[color:var(--brand)]"
                />
                {wandTolerance}
              </label>
              <div className="ml-auto flex flex-wrap gap-1">
                <Button type="button" size="sm" variant="outline" onClick={deleteSelection} disabled={!maskHasSelection(selectionMask)}>
                  <Eraser className="mr-1 h-3.5 w-3.5" />
                  Excluir seleção
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!imageDataRef.current || !selectionMask) return;
                    setSelectionMask(invertMask(selectionMask, imageDataRef.current));
                  }}
                  disabled={!maskHasSelection(selectionMask)}
                >
                  <FlipHorizontal2 className="mr-1 h-3.5 w-3.5" />
                  Inverter
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setSelectionMask(null)}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Limpar
                </Button>
              </div>
            </div>

            <div className="dotted-bg flex flex-1 items-center justify-center overflow-auto bg-canvas-bg p-4">
              <canvas
                ref={canvasRef}
                className={cn(
                  "max-h-full max-w-full rounded-md shadow-lg",
                  editorTool === "wand" && "cursor-crosshair",
                  loading && "opacity-60",
                )}
                onPointerDown={(e) => {
                  if (editorTool !== "wand" || e.button !== 0) return;
                  e.preventDefault();
                  runWandAt(e.clientX, e.clientY, e.shiftKey);
                }}
              />
            </div>
            <p className="border-t px-4 py-2 text-xs text-muted-foreground">
              Shift + clique soma à seleção. Delete exclui pixels selecionados. Salve versões antes de concluir.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t px-5 py-3">
          <Button type="button" variant="outline" onClick={closeImageEditor}>
            Cancelar
          </Button>
          <Button type="button" variant="outline" onClick={saveVersion}>
            Salvar versão
          </Button>
          <Button type="button" onClick={finish}>
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToolChip({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Wand2;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-[color:var(--brand)]/15 text-[color:var(--brand)] ring-1 ring-[color:var(--brand)]/40"
          : "text-muted-foreground hover:bg-foreground/5",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
