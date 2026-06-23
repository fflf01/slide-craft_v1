import { useEffect, useRef } from "react";
import {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  type SlideElement,
  type Slide,
  useEditor,
} from "@/lib/editor-store";

interface Props {
  slide: Slide;
  scale: number;
  interactive?: boolean;
  canvasId?: string;
}

export function SlideCanvas({ slide, scale, interactive = true, canvasId }: Props) {
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);

  return (
    <div
      id={canvasId}
      onMouseDown={(e) => {
        if (interactive && e.target === e.currentTarget) select(null);
      }}
      onPointerDown={(e) => {
        if (interactive && e.target === e.currentTarget && e.pointerType === "touch") select(null);
      }}
      style={{
        width: SLIDE_WIDTH * scale,
        height: SLIDE_HEIGHT * scale,
        background: slide.background,
        position: "relative",
        overflow: "hidden",
        borderRadius: interactive ? 6 : 4,
      }}
      className={interactive ? "canvas-shadow" : "thumb-shadow"}
    >
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
        }}
      >
        {slide.elements.map((el) => (
          <ElementView
            key={el.id}
            el={el}
            selected={interactive && selectedId === el.id}
            interactive={interactive}
          />
        ))}
      </div>
    </div>
  );
}

function ElementView({
  el,
  selected,
  interactive,
}: {
  el: SlideElement;
  selected: boolean;
  interactive: boolean;
}) {
  const select = useEditor((s) => s.select);
  const setEditingTextId = useEditor((s) => s.setEditingTextId);
  const editingTextId = useEditor((s) => s.editingTextId);
  const update = useEditor((s) => s.updateElement);
  const remove = useEditor((s) => s.removeElement);
  const editing = editingTextId === el.id;
  const dragRef = useRef<{ x: number; y: number; ex: number; ey: number } | null>(null);
  const resizeRef = useRef<{
    handle: string;
    x: number;
    y: number;
    el: SlideElement;
  } | null>(null);
  const lastTapRef = useRef(0);
  const movedRef = useRef(false);

  useEffect(() => {
    if (!selected) setEditingTextId(null);
  }, [selected, setEditingTextId]);

  useEffect(() => {
    if (!interactive) return;
    const onMove = (e: MouseEvent | PointerEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.x;
        const dy = e.clientY - dragRef.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
        update(el.id, {
          x: dragRef.current.ex + dx,
          y: dragRef.current.ey + dy,
        } as Partial<SlideElement>);
      } else if (resizeRef.current) {
        const r = resizeRef.current;
        const dx = e.clientX - r.x;
        const dy = e.clientY - r.y;
        let { x, y, width, height } = r.el;
        if (r.handle.includes("e")) width = Math.max(20, r.el.width + dx);
        if (r.handle.includes("s")) height = Math.max(20, r.el.height + dy);
        if (r.handle.includes("w")) {
          width = Math.max(20, r.el.width - dx);
          x = r.el.x + (r.el.width - width);
        }
        if (r.handle.includes("n")) {
          height = Math.max(20, r.el.height - dy);
          y = r.el.y + (r.el.height - height);
        }
        update(el.id, { x, y, width, height } as Partial<SlideElement>);
      }
    };
    const onUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [interactive, el, update]);

  const startDrag = (clientX: number, clientY: number) => {
    if (!interactive || editing) return;
    select(el.id);
    dragRef.current = {
      x: clientX,
      y: clientY,
      ex: el.x,
      ey: el.y,
    };
    movedRef.current = false;
  };

  const onPointerDownDrag = (e: React.PointerEvent) => {
    if (!interactive || editing) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startDrag(e.clientX, e.clientY);
  };

  const onMouseDownDrag = (e: React.MouseEvent) => {
    if (!interactive || editing) return;
    e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  };

  const startResize = (handle: string) => (clientX: number, clientY: number) => {
    resizeRef.current = { handle, x: clientX, y: clientY, el };
    document.body.style.cursor =
      handle === "n" || handle === "s"
        ? "ns-resize"
        : handle === "e" || handle === "w"
          ? "ew-resize"
          : handle === "nw" || handle === "se"
            ? "nwse-resize"
            : "nesw-resize";
  };

  const onResizePointer = (handle: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startResize(handle)(e.clientX, e.clientY);
  };

  const onResizeMouse = (handle: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startResize(handle)(e.clientX, e.clientY);
  };

  const onTextActivate = () => {
    if (el.type !== "text" || movedRef.current) return;
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      setEditingTextId(el.id);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  useEffect(() => {
    if (!selected || !interactive) return;
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove(el.id);
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft")
        update(el.id, { x: el.x - step } as Partial<SlideElement>);
      if (e.key === "ArrowRight")
        update(el.id, { x: el.x + step } as Partial<SlideElement>);
      if (e.key === "ArrowUp")
        update(el.id, { y: el.y - step } as Partial<SlideElement>);
      if (e.key === "ArrowDown")
        update(el.id, { y: el.y + step } as Partial<SlideElement>);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, interactive, editing, el, remove, update]);

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el.opacity,
    cursor: interactive ? (editing ? "text" : "move") : "default",
    userSelect: editing ? "text" : "none",
    touchAction: interactive && !editing ? "none" : "auto",
  };

  let content: React.ReactNode = null;
  if (el.type === "text") {
    content = editing ? (
      <textarea
        autoFocus
        value={el.text}
        onChange={(e) => update(el.id, { text: e.target.value })}
        onBlur={() => setEditingTextId(null)}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          resize: "none",
          padding: 0,
          margin: 0,
          fontSize: el.fontSize,
          fontFamily: el.fontFamily,
          fontWeight: el.fontWeight,
          fontStyle: el.fontStyle,
          textAlign: el.textAlign,
          color: el.color,
          textDecoration: el.underline ? "underline" : "none",
          lineHeight: 1.15,
        }}
      />
    ) : (
      <div
        style={{
          width: "100%",
          height: "100%",
          fontSize: el.fontSize,
          fontFamily: el.fontFamily,
          fontWeight: el.fontWeight,
          fontStyle: el.fontStyle,
          textAlign: el.textAlign,
          color: el.color,
          textDecoration: el.underline ? "underline" : "none",
          lineHeight: 1.15,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflow: "hidden",
        }}
      >
        {el.text}
      </div>
    );
  } else if (el.type === "rect") {
    content = (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: el.fill,
          borderRadius: el.radius,
        }}
      />
    );
  } else if (el.type === "ellipse") {
    content = (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: el.fill,
          borderRadius: "50%",
        }}
      />
    );
  } else if (el.type === "image") {
    content = (
      <img
        src={el.src}
        alt=""
        draggable={false}
        crossOrigin="anonymous"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: el.radius,
          pointerEvents: "none",
        }}
      />
    );
  }

  const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  return (
    <div
      style={baseStyle}
      onMouseDown={onMouseDownDrag}
      onPointerDown={onPointerDownDrag}
      onDoubleClick={(e) => {
        if (el.type === "text") {
          e.stopPropagation();
          setEditingTextId(el.id);
        }
      }}
      onPointerUp={onTextActivate}
    >
      {content}
      {selected && interactive && (
        <>
          <div
            style={{
              position: "absolute",
              inset: -2,
              border: "2px solid var(--brand)",
              borderRadius: 4,
              pointerEvents: "none",
            }}
          />
          {handles.map((h) => {
            const size = 18;
            const pos: React.CSSProperties = { position: "absolute", width: size, height: size };
            if (h.includes("n")) pos.top = -size / 2;
            if (h.includes("s")) pos.bottom = -size / 2;
            if (h.includes("w")) pos.left = -size / 2;
            if (h.includes("e")) pos.right = -size / 2;
            if (h === "n" || h === "s") {
              pos.left = "50%";
              pos.marginLeft = -size / 2;
            }
            if (h === "e" || h === "w") {
              pos.top = "50%";
              pos.marginTop = -size / 2;
            }
            const cursor =
              h === "n" || h === "s"
                ? "ns-resize"
                : h === "e" || h === "w"
                  ? "ew-resize"
                  : h === "nw" || h === "se"
                    ? "nwse-resize"
                    : "nesw-resize";
            return (
              <div
                key={h}
                onMouseDown={onResizeMouse(h)}
                onPointerDown={onResizePointer(h)}
                style={{
                  ...pos,
                  cursor,
                  background: "#fff",
                  border: "2px solid var(--brand)",
                  borderRadius: 3,
                  zIndex: 10,
                  touchAction: "none",
                }}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
