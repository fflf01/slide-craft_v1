import { create } from "zustand";
import { nanoid } from "nanoid";

export type ElementType = "text" | "rect" | "ellipse" | "image";

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  color: string;
  underline: boolean;
}

export interface RectElement extends BaseElement {
  type: "rect";
  fill: string;
  radius: number;
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
  fill: string;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  radius: number;
}

export type SlideElement = TextElement | RectElement | EllipseElement | ImageElement;

export interface Slide {
  id: string;
  background: string;
  elements: SlideElement[];
}

export interface PresentationSnapshot {
  slides: Slide[];
  currentSlideId: string;
  title: string;
}

export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

interface EditorState {
  slides: Slide[];
  currentSlideId: string;
  selectedId: string | null;
  title: string;

  setTitle: (t: string) => void;
  hydratePresentation: (snapshot: PresentationSnapshot) => void;
  setCurrentSlide: (id: string) => void;
  addSlide: () => void;
  duplicateSlide: (id: string) => void;
  removeSlide: (id: string) => void;
  moveSlide: (id: string, dir: -1 | 1) => void;

  select: (id: string | null) => void;
  addElement: (el: Omit<SlideElement, "id">) => void;
  updateElement: (id: string, patch: Partial<SlideElement>) => void;
  removeElement: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  setSlideBackground: (color: string) => void;
}

const makeSlide = (): Slide => ({
  id: nanoid(8),
  background: "#ffffff",
  elements: [],
});

const createInitialPresentation = (): PresentationSnapshot => {
  const firstSlide = makeSlide();
  firstSlide.elements.push({
    id: nanoid(8),
    type: "text",
    x: 120,
    y: 220,
    width: 1040,
    height: 140,
    rotation: 0,
    opacity: 1,
    text: "Clique para editar",
    fontSize: 96,
    fontFamily: "Inter",
    fontWeight: 800,
    fontStyle: "normal",
    textAlign: "center",
    color: "#0f172a",
    underline: false,
  });
  firstSlide.elements.push({
    id: nanoid(8),
    type: "text",
    x: 120,
    y: 380,
    width: 1040,
    height: 60,
    rotation: 0,
    opacity: 1,
    text: "Um clone do Canva feito com amor",
    fontSize: 32,
    fontFamily: "Inter",
    fontWeight: 400,
    fontStyle: "normal",
    textAlign: "center",
    color: "#475569",
    underline: false,
  });

  return {
    slides: [firstSlide],
    currentSlideId: firstSlide.id,
    title: "Apresentação sem título",
  };
};

const initialPresentation = createInitialPresentation();

const normalizeSnapshot = (snapshot: PresentationSnapshot): PresentationSnapshot => {
  const slides = snapshot.slides.length > 0 ? snapshot.slides : initialPresentation.slides;
  const hasCurrentSlide = slides.some((slide) => slide.id === snapshot.currentSlideId);

  return {
    slides,
    currentSlideId: hasCurrentSlide ? snapshot.currentSlideId : slides[0].id,
    title: snapshot.title || "Apresentação sem título",
  };
};

export const toPresentationSnapshot = (state: {
  slides: Slide[];
  currentSlideId: string;
  title: string;
}): PresentationSnapshot => ({
  slides: state.slides,
  currentSlideId: state.currentSlideId,
  title: state.title,
});

export const useEditor = create<EditorState>((set, get) => ({
  slides: initialPresentation.slides,
  currentSlideId: initialPresentation.currentSlideId,
  selectedId: null,
  title: initialPresentation.title,

  setTitle: (t) => set({ title: t }),
  hydratePresentation: (snapshot) => {
    const next = normalizeSnapshot(snapshot);
    set({ ...next, selectedId: null });
  },
  setCurrentSlide: (id) => set({ currentSlideId: id, selectedId: null }),

  addSlide: () => {
    const s = makeSlide();
    set((st) => ({ slides: [...st.slides, s], currentSlideId: s.id, selectedId: null }));
  },
  duplicateSlide: (id) => {
    const { slides } = get();
    const idx = slides.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const copy: Slide = {
      ...slides[idx],
      id: nanoid(8),
      elements: slides[idx].elements.map((e) => ({ ...e, id: nanoid(8) })),
    };
    const next = [...slides];
    next.splice(idx + 1, 0, copy);
    set({ slides: next, currentSlideId: copy.id, selectedId: null });
  },
  removeSlide: (id) => {
    const { slides, currentSlideId } = get();
    if (slides.length === 1) return;
    const idx = slides.findIndex((s) => s.id === id);
    const next = slides.filter((s) => s.id !== id);
    const newCurrent =
      currentSlideId === id ? next[Math.max(0, idx - 1)].id : currentSlideId;
    set({ slides: next, currentSlideId: newCurrent, selectedId: null });
  },
  moveSlide: (id, dir) => {
    const { slides } = get();
    const idx = slides.findIndex((s) => s.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[idx], next[target]] = [next[target], next[idx]];
    set({ slides: next });
  },

  select: (id) => set({ selectedId: id }),
  addElement: (el) => {
    const id = nanoid(8);
    set((st) => ({
      slides: st.slides.map((s) =>
        s.id === st.currentSlideId
          ? { ...s, elements: [...s.elements, { ...el, id } as SlideElement] }
          : s,
      ),
      selectedId: id,
    }));
  },
  updateElement: (id, patch) =>
    set((st) => ({
      slides: st.slides.map((s) =>
        s.id === st.currentSlideId
          ? {
              ...s,
              elements: s.elements.map((e) =>
                e.id === id ? ({ ...e, ...patch } as SlideElement) : e,
              ),
            }
          : s,
      ),
    })),
  removeElement: (id) =>
    set((st) => ({
      slides: st.slides.map((s) =>
        s.id === st.currentSlideId
          ? { ...s, elements: s.elements.filter((e) => e.id !== id) }
          : s,
      ),
      selectedId: st.selectedId === id ? null : st.selectedId,
    })),
  bringForward: (id) =>
    set((st) => ({
      slides: st.slides.map((s) => {
        if (s.id !== st.currentSlideId) return s;
        const i = s.elements.findIndex((e) => e.id === id);
        if (i < 0 || i === s.elements.length - 1) return s;
        const next = [...s.elements];
        [next[i], next[i + 1]] = [next[i + 1], next[i]];
        return { ...s, elements: next };
      }),
    })),
  sendBackward: (id) =>
    set((st) => ({
      slides: st.slides.map((s) => {
        if (s.id !== st.currentSlideId) return s;
        const i = s.elements.findIndex((e) => e.id === id);
        if (i <= 0) return s;
        const next = [...s.elements];
        [next[i], next[i - 1]] = [next[i - 1], next[i]];
        return { ...s, elements: next };
      }),
    })),
  setSlideBackground: (color) =>
    set((st) => ({
      slides: st.slides.map((s) =>
        s.id === st.currentSlideId ? { ...s, background: color } : s,
      ),
    })),
}));

export const currentSlide = (st: EditorState) =>
  st.slides.find((s) => s.id === st.currentSlideId) ?? st.slides[0];
