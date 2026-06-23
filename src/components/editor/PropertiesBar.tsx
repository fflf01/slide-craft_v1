import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  Italic,
  Trash2,
  Underline,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { currentSlide, useEditor, type SlideElement } from "@/lib/editor-store";

const COLORS = [
  "#000000", "#ffffff", "#0f172a", "#475569", "#00c4cc", "#7d2ae8",
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#facc15",
];

export function PropertiesBar() {
  const slide = useEditor(currentSlide);
  const selectedId = useEditor((s) => s.selectedId);
  const update = useEditor((s) => s.updateElement);
  const remove = useEditor((s) => s.removeElement);
  const bringForward = useEditor((s) => s.bringForward);
  const sendBackward = useEditor((s) => s.sendBackward);
  const add = useEditor((s) => s.addElement);

  const el = slide.elements.find((e) => e.id === selectedId);

  if (!el) {
    return (
      <div className="flex h-12 items-center justify-between border-b bg-background px-4 text-xs text-muted-foreground">
        <span>Selecione um elemento para editar suas propriedades — duplo clique no texto para editar.</span>
        <span className="text-[11px]">⌫ apagar · ←→↑↓ mover · Shift+seta 10px</span>
      </div>
    );
  }

  const duplicate = () => {
    const { id: _id, ...rest } = el;
    void _id;
    add({ ...(rest as Omit<SlideElement, "id">), x: el.x + 20, y: el.y + 20 });
  };

  return (
    <div className="flex h-12 items-center gap-2 border-b bg-background px-3 text-sm">
      {el.type === "text" && (
        <>
          <select
            value={el.fontFamily}
            onChange={(e) => update(el.id, { fontFamily: e.target.value })}
            className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
          >
            {["Inter", "Georgia", "Times New Roman", "Courier New", "Arial", "Comic Sans MS"].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <NumberStepper
            value={el.fontSize}
            min={8}
            max={400}
            onChange={(v) => update(el.id, { fontSize: v })}
          />

          <IconBtn
            active={el.fontWeight >= 700}
            onClick={() => update(el.id, { fontWeight: el.fontWeight >= 700 ? 400 : 700 })}
          >
            <Bold className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            active={el.fontStyle === "italic"}
            onClick={() =>
              update(el.id, { fontStyle: el.fontStyle === "italic" ? "normal" : "italic" })
            }
          >
            <Italic className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            active={el.underline}
            onClick={() => update(el.id, { underline: !el.underline })}
          >
            <Underline className="h-4 w-4" />
          </IconBtn>

          <Divider />

          <IconBtn
            active={el.textAlign === "left"}
            onClick={() => update(el.id, { textAlign: "left" })}
          >
            <AlignLeft className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            active={el.textAlign === "center"}
            onClick={() => update(el.id, { textAlign: "center" })}
          >
            <AlignCenter className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            active={el.textAlign === "right"}
            onClick={() => update(el.id, { textAlign: "right" })}
          >
            <AlignRight className="h-4 w-4" />
          </IconBtn>

          <Divider />

          <ColorPicker
            label="Cor"
            value={el.color}
            onChange={(c) => update(el.id, { color: c })}
          />
        </>
      )}

      {(el.type === "rect" || el.type === "ellipse") && (
        <>
          <ColorPicker
            label="Preenchimento"
            value={el.fill}
            onChange={(c) => update(el.id, { fill: c })}
          />
          {el.type === "rect" && (
            <>
              <Divider />
              <span className="text-xs text-muted-foreground">Cantos</span>
              <input
                type="range"
                min={0}
                max={200}
                value={el.radius}
                onChange={(e) => update(el.id, { radius: Number(e.target.value) })}
                className="h-1 w-28 accent-[color:var(--brand)]"
              />
            </>
          )}
        </>
      )}

      {el.type === "image" && (
        <>
          <span className="text-xs text-muted-foreground">Cantos</span>
          <input
            type="range"
            min={0}
            max={200}
            value={el.radius}
            onChange={(e) => update(el.id, { radius: Number(e.target.value) })}
            className="h-1 w-28 accent-[color:var(--brand)]"
          />
        </>
      )}

      <Divider />
      <span className="text-xs text-muted-foreground">Opacidade</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={el.opacity}
        onChange={(e) => update(el.id, { opacity: Number(e.target.value) })}
        className="h-1 w-24 accent-[color:var(--brand)]"
      />

      <div className="ml-auto flex items-center gap-1">
        <IconBtn onClick={() => bringForward(el.id)} title="Trazer para frente">
          <ChevronUp className="h-4 w-4" />
        </IconBtn>
        <IconBtn onClick={() => sendBackward(el.id)} title="Enviar para trás">
          <ChevronDown className="h-4 w-4" />
        </IconBtn>
        <IconBtn onClick={duplicate} title="Duplicar">
          <Copy className="h-4 w-4" />
        </IconBtn>
        <IconBtn onClick={() => remove(el.id)} title="Excluir">
          <Trash2 className="h-4 w-4 text-destructive" />
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        active ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-foreground/5"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}

function NumberStepper({
  value, min, max, onChange,
}: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex h-8 items-center rounded-md border bg-background">
      <button
        className="px-2 text-muted-foreground hover:text-foreground"
        onClick={() => onChange(Math.max(min, value - 2))}
      >−</button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
        className="w-12 bg-transparent text-center text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        className="px-2 text-muted-foreground hover:text-foreground"
        onClick={() => onChange(Math.min(max, value + 2))}
      >+</button>
    </div>
  );
}

function ColorPicker({
  label, value, onChange,
}: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <div className="group relative">
      <button
        title={label}
        className="flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-xs hover:bg-foreground/5"
      >
        <span
          className="h-4 w-4 rounded border"
          style={{ background: value }}
        />
        <span className="text-muted-foreground">{label}</span>
      </button>
      <div className="absolute left-0 top-10 z-50 hidden w-48 rounded-lg border bg-popover p-3 shadow-lg group-hover:block">
        <div className="grid grid-cols-6 gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange(c)}
              className={`h-6 w-6 rounded border-2 ${
                value === c ? "border-foreground" : "border-border"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 h-8 w-full cursor-pointer rounded border bg-transparent"
        />
      </div>
    </div>
  );
}
