import { useState } from "react";
import {
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  Palette,
  Layout,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useEditor, type SlideElement } from "@/lib/editor-store";
import { buildImageElementPayload } from "@/lib/image-versions";

type NewElement = Omit<SlideElement, "id">;
type NewText = Extract<NewElement, { type: "text" }>;
type NewRect = Extract<NewElement, { type: "rect" }>;

const TOOLS = [
  { id: "design", label: "Design", icon: Layout },
  { id: "text", label: "Texto", icon: Type },
  { id: "shapes", label: "Formas", icon: Square },
  { id: "images", label: "Imagens", icon: ImageIcon },
  { id: "bg", label: "Fundo", icon: Palette },
] as const;

const BG_COLORS = [
  "#ffffff", "#0f172a", "#00c4cc", "#7d2ae8", "#fef3c7",
  "#fee2e2", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff",
  "#1e293b", "#fbbf24", "#10b981", "#f43f5e", "#8b5cf6",
];

const TEXT_PRESETS = [
  { label: "Adicionar título", fontSize: 88, fontWeight: 800 },
  { label: "Adicionar subtítulo", fontSize: 48, fontWeight: 600 },
  { label: "Adicionar texto", fontSize: 28, fontWeight: 400 },
];

const STOCK_IMAGES = [
  "https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=800&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
];

const TEMPLATES = [
  {
    name: "Capa azul",
    bg: "#0ea5b7",
    el: [
      {
        type: "text", x: 100, y: 240, width: 1080, height: 140, rotation: 0, opacity: 1,
        text: "Sua grande ideia", fontSize: 104, fontFamily: "Inter", fontWeight: 800,
        fontStyle: "normal", textAlign: "left", color: "#ffffff", underline: false,
      },
      {
        type: "text", x: 100, y: 400, width: 800, height: 60, rotation: 0, opacity: 1,
        text: "Uma apresentação que impressiona", fontSize: 32, fontFamily: "Inter",
        fontWeight: 400, fontStyle: "normal", textAlign: "left", color: "#e0fbff",
        underline: false,
      },
    ],
  },
  {
    name: "Minimal claro",
    bg: "#fafafa",
    el: [
      {
        type: "rect", x: 100, y: 100, width: 80, height: 8, rotation: 0, opacity: 1,
        fill: "#7d2ae8", radius: 4,
      },
      {
        type: "text", x: 100, y: 140, width: 1000, height: 120, rotation: 0, opacity: 1,
        text: "Título do projeto", fontSize: 88, fontFamily: "Inter", fontWeight: 700,
        fontStyle: "normal", textAlign: "left", color: "#0f172a", underline: false,
      },
      {
        type: "text", x: 100, y: 290, width: 900, height: 100, rotation: 0, opacity: 1,
        text: "Descreva sua proposta em uma frase clara e direta para o público.",
        fontSize: 28, fontFamily: "Inter", fontWeight: 400, fontStyle: "normal",
        textAlign: "left", color: "#475569", underline: false,
      },
    ],
  },
  {
    name: "Estatística",
    bg: "#0f172a",
    el: [
      {
        type: "text", x: 100, y: 200, width: 1080, height: 200, rotation: 0, opacity: 1,
        text: "98%", fontSize: 220, fontFamily: "Inter", fontWeight: 900,
        fontStyle: "normal", textAlign: "center", color: "#00c4cc", underline: false,
      },
      {
        type: "text", x: 100, y: 450, width: 1080, height: 60, rotation: 0, opacity: 1,
        text: "de satisfação dos usuários", fontSize: 32, fontFamily: "Inter",
        fontWeight: 400, fontStyle: "normal", textAlign: "center", color: "#cbd5e1",
        underline: false,
      },
    ],
  },
] as const;

type LeftToolbarProps = {
  /** Apenas o painel de conteúdo (para drawer mobile). */
  contentOnly?: boolean;
};

export function LeftToolbar({ contentOnly = false }: LeftToolbarProps) {
  const [tab, setTab] = useState<(typeof TOOLS)[number]["id"]>("design");
  const [imgUrl, setImgUrl] = useState("");
  const add = useEditor((s) => s.addElement);
  const setBg = useEditor((s) => s.setSlideBackground);
  const slides = useEditor((s) => s.slides);
  const currentSlideId = useEditor((s) => s.currentSlideId);
  const current = slides.find((s) => s.id === currentSlideId);

  const addText = (size: number, weight: number) =>
    add({
      type: "text",
      x: 240,
      y: 320,
      width: 800,
      height: Math.round(size * 1.4),
      rotation: 0,
      opacity: 1,
      text: "Seu texto aqui",
      fontSize: size,
      fontFamily: "Inter",
      fontWeight: weight,
      fontStyle: "normal",
      textAlign: "center",
      color: "#0f172a",
      underline: false,
    } as NewText);

  const addRect = (fill: string, radius = 12) =>
    add({
      type: "rect",
      x: 440,
      y: 260,
      width: 400,
      height: 240,
      rotation: 0,
      opacity: 1,
      fill,
      radius,
    } as NewRect);

  const addEllipse = (fill: string) =>
    add({
      type: "ellipse",
      x: 480,
      y: 220,
      width: 320,
      height: 320,
      rotation: 0,
      opacity: 1,
      fill,
    } as Extract<NewElement, { type: "ellipse" }>);

  const addImage = (src: string) =>
    add({
      ...buildImageElementPayload(src, 12),
      x: 340,
      y: 160,
      width: 600,
      height: 400,
      rotation: 0,
      opacity: 1,
    } as Extract<NewElement, { type: "image" }>);

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    setBg(tpl.bg);
    // remove all current elements first
    const st = useEditor.getState();
    const slide = st.slides.find((s) => s.id === st.currentSlideId);
    if (slide) {
      slide.elements.forEach((e) => st.removeElement(e.id));
    }
    tpl.el.forEach((e) => st.addElement({ ...e } as NewElement));
  };

  const panelContent = (
      <div className={contentOnly ? "w-full" : "w-72 overflow-y-auto border-r bg-background p-4"}>
        {contentOnly && (
          <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors touch-manipulation ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-foreground/5 text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 1.8} />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
        {tab === "design" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Templates</h3>
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => applyTemplate(tpl)}
                className="group block w-full overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md"
              >
                <div
                  className="relative h-32 w-full"
                  style={{ background: tpl.bg }}
                >
                  <div
                    style={{
                      transform: "scale(0.2)",
                      transformOrigin: "top left",
                      width: 1280,
                      height: 720,
                      position: "absolute",
                    }}
                  >
                    {tpl.el.map((e, i) => {
                      if (e.type === "text") {
                        return (
                          <div
                            key={i}
                            style={{
                              position: "absolute",
                              left: e.x, top: e.y, width: e.width, height: e.height,
                              fontSize: e.fontSize, fontWeight: e.fontWeight,
                              color: e.color, textAlign: e.textAlign,
                              fontFamily: e.fontFamily, lineHeight: 1.15,
                            }}
                          >
                            {e.text}
                          </div>
                        );
                      }
                      if (e.type === "rect") {
                        return (
                          <div
                            key={i}
                            style={{
                              position: "absolute",
                              left: e.x, top: e.y, width: e.width, height: e.height,
                              background: e.fill, borderRadius: e.radius,
                            }}
                          />
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
                <div className="px-3 py-2 text-sm font-medium">{tpl.name}</div>
              </button>
            ))}
          </div>
        )}

        {tab === "text" && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Adicionar texto</h3>
            {TEXT_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => addText(p.fontSize, p.fontWeight)}
                className="block w-full rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/5 hover:border-accent/40"
                style={{ fontWeight: p.fontWeight }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {tab === "shapes" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Formas</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => addRect("#00c4cc", 12)}
                className="aspect-square rounded-lg border bg-card p-3 hover:bg-accent/5"
              >
                <div className="h-full w-full rounded-md" style={{ background: "#00c4cc" }} />
              </button>
              <button
                onClick={() => addRect("#7d2ae8", 0)}
                className="aspect-square rounded-lg border bg-card p-3 hover:bg-accent/5"
              >
                <div className="h-full w-full" style={{ background: "#7d2ae8" }} />
              </button>
              <button
                onClick={() => addRect("#0f172a", 999)}
                className="aspect-square rounded-lg border bg-card p-3 hover:bg-accent/5"
              >
                <div className="h-full w-full rounded-full" style={{ background: "#0f172a", height: 12, marginTop: "calc(50% - 6px)" }} />
              </button>
              <button
                onClick={() => addEllipse("#00c4cc")}
                className="aspect-square rounded-lg border bg-card p-3 hover:bg-accent/5"
              >
                <div className="h-full w-full rounded-full" style={{ background: "#00c4cc" }} />
              </button>
              <button
                onClick={() => addEllipse("#7d2ae8")}
                className="aspect-square rounded-lg border bg-card p-3 hover:bg-accent/5"
              >
                <div className="h-full w-full rounded-full" style={{ background: "#7d2ae8" }} />
              </button>
              <button
                onClick={() => addEllipse("#f59e0b")}
                className="aspect-square rounded-lg border bg-card p-3 hover:bg-accent/5"
              >
                <div className="h-full w-full rounded-full" style={{ background: "#f59e0b" }} />
              </button>
            </div>
          </div>
        )}

        {tab === "images" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Imagens</h3>
            <div className="flex gap-2">
              <input
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
                placeholder="Cole uma URL"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={() => {
                  if (imgUrl) {
                    addImage(imgUrl);
                    setImgUrl("");
                  }
                }}
                className="rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Adicionar
              </button>
            </div>
            <label className="block">
              <span className="text-xs text-muted-foreground">Ou envie um arquivo</span>
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-medium hover:file:bg-secondary/80"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => addImage(String(reader.result));
                  reader.readAsDataURL(f);
                }}
              />
            </label>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {STOCK_IMAGES.map((src) => (
                <button
                  key={src}
                  onClick={() => addImage(src)}
                  className="aspect-square overflow-hidden rounded-lg border hover:ring-2 hover:ring-primary/40"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "bg" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Cor de fundo</h3>
            <div className="grid grid-cols-5 gap-2">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBg(c)}
                  className={`aspect-square rounded-lg border-2 transition-transform hover:scale-105 ${
                    current?.background === c ? "border-primary" : "border-border"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <span>Personalizada</span>
              <input
                type="color"
                value={current?.background ?? "#ffffff"}
                onChange={(e) => setBg(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border bg-transparent"
              />
            </label>
          </div>
        )}
      </div>
  );

  if (contentOnly) return panelContent;

  return (
    <div className="hidden h-full md:flex">
      <div className="flex w-20 flex-col items-center gap-1 border-r bg-panel py-3">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex w-16 flex-col items-center gap-1 rounded-lg py-2 text-[11px] transition-colors ${
                active
                  ? "bg-foreground/5 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/5"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              {t.label}
            </button>
          );
        })}
      </div>
      {panelContent}
    </div>
  );
}

// keep nanoid import referenced for tree-shaker safety
void nanoid;
